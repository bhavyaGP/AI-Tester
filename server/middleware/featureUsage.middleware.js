const mongoose = require("mongoose");
const UsageLogs = require('../models/usage.model');
const redis = require('../redis.connection');

const routeToFeatureMap = {
  "/gen/yt-summary": "ytSummary",
  "/gen/quiz": "quiz",
  "/gen/chatbot": "chatbot",
  "/gen/mindmap": "mindmap",
  "/gen/p2p-doubt": "p2pDoubt",
  "/gen/join-quiz": "joinQuiz", 
  "/gen/model-select": "modelselect",
  "/gen/difficulty": "difficultychoose"
};

// Cache TTL in seconds (5 minutes)
const CACHE_TTL = 300;

// Helper function to get user ID from various sources
const getUserId = (req) => {
  return req.userId || req.headers['x-user-id'] || req.user?.id || req.body?.userId;
};

// Helper function to get usage data with Redis caching
const getUserUsageData = async (userId) => {
  try {
    // Try to get from Redis cache first
    const cacheKey = `usage:${userId}`;
    const cachedData = await redis.get(cacheKey);
    
    if (cachedData) {
      console.log(`Cache hit for user: ${userId}`);
      const parsedData = JSON.parse(cachedData);
      
      // Convert plain object back to Mongoose document to restore methods
      const usageDoc = await UsageLogs.hydrate(parsedData);
      return usageDoc;
    }

    console.log(`Cache miss for user: ${userId}, fetching from DB`);
    // If not in cache, get from MongoDB
    const usageDoc = await UsageLogs.findOne({ userId });
    
    if (usageDoc) {
      // Cache the result for future use
      await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(usageDoc));
    }
    
    return usageDoc;
  } catch (error) {
    console.error('Redis error, falling back to DB:', error.message);
    // Fallback to MongoDB if Redis fails
    return await UsageLogs.findOne({ userId });
  }
};

// Helper function to update usage and invalidate cache
const updateUserUsage = async (userId, feature) => {
  try {
    // Update in MongoDB
    const result = await UsageLogs.updateOne(
      { userId },
      { $inc: { [feature]: -1 }, $set: { updatedAt: new Date() } }
    );

    // Invalidate cache
    const cacheKey = `usage:${userId}`;
    await redis.del(cacheKey);  
    
    return result;
  } catch (error) {
    console.error('Error updating usage:', error.message);
    // Still try to update MongoDB even if Redis fails
    return await UsageLogs.updateOne(
      { userId },
      { $inc: { [feature]: -1 }, $set: { updatedAt: new Date() } }
    );
  }
};

// Main middleware function
const checkFeatureAccess = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: "Authentication required", 
        message: "User ID not found in request" 
      });
    }

    // Find matching route
    const matchedRoute = Object.keys(routeToFeatureMap).find(route =>
      req.originalUrl.startsWith(route)
    );
    
    if (!matchedRoute) {
      console.log(`No feature restriction for route: ${req.originalUrl}`);
      return next(); // No feature restriction for this route
    }

    const feature = routeToFeatureMap[matchedRoute];
    console.log(`Checking access for feature: ${feature}, user: ${userId}`);

    // Get user usage data (with caching)
    const usageDoc = await getUserUsageData(userId);

    if (!usageDoc) {
      return res.status(403).json({ 
        success: false,
        error: "No subscription found", 
        message: "Please subscribe to a plan to access this feature",
        requiresSubscription: true
      });
    }

    // Check if plan is expired
    if (usageDoc.isPlanExpired()) {
      return res.status(403).json({ 
        success: false,
        error: "Subscription expired", 
        message: "Your plan has expired. Please renew or upgrade.",
        planExpiredAt: usageDoc.planExpiresAt,
        requiresRenewal: true
      });
    }

    const currentFeatureValue = usageDoc[feature];

    // Handle boolean features (access permissions)
    if (typeof currentFeatureValue === "boolean") {
      if (currentFeatureValue) {
        console.log(`Access granted for boolean feature: ${feature}`);
        return next();
      } else {
        return res.status(403).json({ 
          success: false,
          error: "Feature not available", 
          message: `${feature} is not available in your current ${usageDoc.planType} plan`,
          currentPlan: usageDoc.planType,
          requiresUpgrade: true
        });
      }
    }

    // Handle numeric features (usage limits)
    if (typeof currentFeatureValue === "number") {
      // Check for unlimited access (MAX_SAFE_INTEGER for Achiever plan)
      if (currentFeatureValue === Number.MAX_SAFE_INTEGER) {
        console.log(`Unlimited access for feature: ${feature}`);
        return next();
      }
      
      if (currentFeatureValue > 0) {
        // Update usage count
        await updateUserUsage(userId, feature);
        console.log(`Access granted, remaining ${feature}: ${currentFeatureValue - 1}`);
        
        // Add usage info to response headers for client tracking
        res.setHeader('X-Feature-Remaining', currentFeatureValue - 1);
        res.setHeader('X-Feature-Name', feature);
        
        return next();
      } else {
        return res.status(403).json({ 
          success: false,
          error: "Usage limit exceeded", 
          message: `Your ${feature} limit for this month has been reached`,
          currentPlan: usageDoc.planType,
          remainingCount: 0,
          requiresUpgrade: true
        });
      }
    }

    // Invalid feature configuration
    return res.status(500).json({ 
      success: false,
      error: "Configuration error", 
      message: "Invalid feature setup in system"
    });

  } catch (err) {
    console.error("Limitation middleware error:", err);
    return res.status(500).json({ 
      success: false,
      error: "Server error", 
      message: "Internal server error while checking feature access"
    });
  }
};

// Middleware factory for specific features
const createFeatureMiddleware = (featureName) => {
  return async (req, res, next) => {
    try {
      const userId = getUserId(req);
      
      if (!userId) {
        return res.status(401).json({ 
          success: false,
          error: "Authentication required",
          message: "User ID not found in request" 
        });
      }

      const usageDoc = await getUserUsageData(userId);

      if (!usageDoc) {
        return res.status(403).json({ 
          success: false,
          error: "No subscription found",
          message: "Please subscribe to a plan to access this feature",
          requiresSubscription: true
        });
      }

      if (usageDoc.isPlanExpired()) {
        return res.status(403).json({ 
          success: false,
          error: "Subscription expired",
          message: "Your plan has expired. Please renew or upgrade.",
          requiresRenewal: true
        });
      }

      const currentFeatureValue = usageDoc[featureName];

      if (typeof currentFeatureValue === "boolean") {
        return currentFeatureValue 
          ? next() 
          : res.status(403).json({ 
              success: false,
              error: "Feature not available",
              message: `${featureName} is not available in your current plan`,
              requiresUpgrade: true
            });
      }

      if (typeof currentFeatureValue === "number") {
        if (currentFeatureValue === Number.MAX_SAFE_INTEGER || currentFeatureValue > 0) {
          if (currentFeatureValue !== Number.MAX_SAFE_INTEGER) {
            await updateUserUsage(userId, featureName);
          }
          return next();
        } else {
          return res.status(403).json({ 
            success: false,
            error: "Usage limit exceeded",
            message: `Your ${featureName} limit has been reached`,
            requiresUpgrade: true
          });
        }
      }

      return res.status(500).json({ 
        success: false,
        error: "Configuration error"
      });

    } catch (err) {
      console.error(`Feature middleware error for ${featureName}:`, err);
      return res.status(500).json({ 
        success: false,
        error: "Server error"
      });
    }
  };
};

// Health check middleware for debugging
const debugUsageInfo = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return next();

    const usageDoc = await getUserUsageData(userId);
    if (usageDoc) {
      console.log(`User ${userId} - Plan: ${usageDoc.planType}, Expires: ${usageDoc.planExpiresAt}`);
      req.userUsageInfo = {
        planType: usageDoc.planType,
        planExpiresAt: usageDoc.planExpiresAt,
        isExpired: usageDoc.isPlanExpired()
      };
    }
    next();
  } catch (err) {
    console.error('Debug middleware error:', err);
    next(); // Continue even if debug fails
  }
};

module.exports = { 
  checkFeatureAccess,
  createFeatureMiddleware,
  debugUsageInfo,
  getUserUsageData,
  updateUserUsage
};