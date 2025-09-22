const UsageLogs = require('../models/usage.model');
const redis = require('../redis.connection');

class LimitationValidationService {
  constructor() {
    this.CACHE_TTL = 300; // 5 minutes
  }

  // Get user usage data with caching
  async getUserUsageData(userId) {
    try {
      const cacheKey = `usage:${userId}`;
      const cachedData = await redis.get(cacheKey);
      
      if (cachedData) {
        return JSON.parse(cachedData);
      }

      const usageDoc = await UsageLogs.findOne({ userId });
      
      if (usageDoc) {
        // Updated to modern redis client API (setEx replaces deprecated setex)
        await redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(usageDoc));
      }
      
      return usageDoc;
    } catch (error) {
      console.error('Error getting usage data:', error);
      return await UsageLogs.findOne({ userId });
    }
  }

  // Validate if user can access a specific feature
  async validateFeatureAccess(userId, featureName) {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'MISSING_USER_ID',
          message: 'User ID is required',
          code: 401
        };
      }

      const usageDoc = await this.getUserUsageData(userId);

      if (!usageDoc) {
        return {
          success: false,
          error: 'NO_SUBSCRIPTION',
          message: 'No subscription found for user',
          requiresSubscription: true,
          code: 403
        };
      }

      // Check if plan is expired
      if (usageDoc.isPlanExpired()) {
        return {
          success: false,
          error: 'SUBSCRIPTION_EXPIRED',
          message: 'User subscription has expired',
          planExpiredAt: usageDoc.planExpiresAt,
          requiresRenewal: true,
          code: 403
        };
      }

      const currentFeatureValue = usageDoc[featureName];

      // Handle boolean features
      if (typeof currentFeatureValue === "boolean") {
        if (currentFeatureValue) {
          return {
            success: true,
            message: 'Access granted',
            planType: usageDoc.planType,
            featureType: 'boolean'
          };
        } else {
          return {
            success: false,
            error: 'FEATURE_NOT_AVAILABLE',
            message: `${featureName} is not available in current plan`,
            currentPlan: usageDoc.planType,
            requiresUpgrade: true,
            code: 403
          };
        }
      }

      // Handle numeric features
      if (typeof currentFeatureValue === "number") {
        if (currentFeatureValue === Number.MAX_SAFE_INTEGER) {
          return {
            success: true,
            message: 'Unlimited access granted',
            planType: usageDoc.planType,
            featureType: 'unlimited',
            remainingCount: 'unlimited'
          };
        }
        
        if (currentFeatureValue > 0) {
          return {
            success: true,
            message: 'Access granted',
            planType: usageDoc.planType,
            featureType: 'limited',
            remainingCount: currentFeatureValue,
            willDeduct: true
          };
        } else {
          return {
            success: false,
            error: 'USAGE_LIMIT_EXCEEDED',
            message: `${featureName} limit exceeded for current plan`,
            currentPlan: usageDoc.planType,
            remainingCount: 0,
            requiresUpgrade: true,
            code: 403
          };
        }
      }

      return {
        success: false,
        error: 'INVALID_FEATURE_CONFIG',
        message: 'Invalid feature configuration',
        code: 500
      };

    } catch (error) {
      console.error('Validation service error:', error);
      return {
        success: false,
        error: 'SERVER_ERROR',
        message: 'Internal server error during validation',
        code: 500
      };
    }
  }

  // Consume/deduct usage for a feature
  async consumeFeatureUsage(userId, featureName) {
    try {
      const validation = await this.validateFeatureAccess(userId, featureName);
      
      if (!validation.success || !validation.willDeduct) {
        return validation;
      }

      // Update usage in database
      await UsageLogs.updateOne(
        { userId },
        { $inc: { [featureName]: -1 }, $set: { updatedAt: new Date() } }
      );

      // Invalidate cache
      const cacheKey = `usage:${userId}`;
      await redis.del(cacheKey);

      return {
        success: true,
        message: 'Feature usage consumed successfully',
        remainingCount: validation.remainingCount - 1,
        featureName
      };

    } catch (error) {
      console.error('Error consuming feature usage:', error);
      return {
        success: false,
        error: 'SERVER_ERROR',
        message: 'Error consuming feature usage',
        code: 500
      };
    }
  }

  // Get user's complete usage overview
  async getUserUsageOverview(userId) {
    try {
      const usageDoc = await this.getUserUsageData(userId);
      
      if (!usageDoc) {
        return {
          success: false,
          error: 'NO_SUBSCRIPTION',
          message: 'No subscription found for user',
          code: 404
        };
      }

      const features = {
        ytSummary: usageDoc.ytSummary,
        quiz: usageDoc.quiz,
        chatbot: usageDoc.chatbot,
        mindmap: usageDoc.mindmap,
        p2pDoubt: usageDoc.p2pDoubt,
        joinQuiz: usageDoc.joinQuiz,
        modelselect: usageDoc.modelselect,
        difficultychoose: usageDoc.difficultychoose
      };

      return {
        success: true,
        data: {
          userId,
          planType: usageDoc.planType,
          planExpiresAt: usageDoc.planExpiresAt,
          isPlanExpired: usageDoc.isPlanExpired(),
          planRenewedAt: usageDoc.planRenewedAt,
          features,
          originalLimits: usageDoc.originalLimits
        }
      };

    } catch (error) {
      console.error('Error getting usage overview:', error);
      return {
        success: false,
        error: 'SERVER_ERROR',
        message: 'Error retrieving usage overview',
        code: 500
      };
    }
  }

  // Reset usage for a user (admin function)
  async resetUserUsage(userId, planType = null) {
    try {
      const usageDoc = await UsageLogs.findOne({ userId });
      
      if (!usageDoc) {
        return {
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'User not found',
          code: 404
        };
      }

      const newPlanType = planType || usageDoc.planType;
      const planLimits = UsageLogs.getPlanLimits(newPlanType);
      
      usageDoc.resetUsageLimits(planLimits);
      usageDoc.planType = newPlanType;
      await usageDoc.save();

      // Invalidate cache
      const cacheKey = `usage:${userId}`;
      await redis.del(cacheKey);

      return {
        success: true,
        message: 'User usage reset successfully',
        planType: newPlanType,
        newLimits: planLimits
      };

    } catch (error) {
      console.error('Error resetting user usage:', error);
      return {
        success: false,
        error: 'SERVER_ERROR',
        message: 'Error resetting user usage',
        code: 500
      };
    }
  }

  // Bulk validation for multiple features (useful for admin dashboards)
  async validateMultipleFeatures(userId, featureNames) {
    try {
      const results = {};
      
      for (const featureName of featureNames) {
        results[featureName] = await this.validateFeatureAccess(userId, featureName);
      }

      return {
        success: true,
        data: results
      };

    } catch (error) {
      console.error('Error in bulk validation:', error);
      return {
        success: false,
        error: 'SERVER_ERROR',
        message: 'Error in bulk feature validation',
        code: 500
      };
    }
  }
}

module.exports = new LimitationValidationService();
