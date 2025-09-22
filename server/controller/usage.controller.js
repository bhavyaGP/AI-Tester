const Student = require('../models/student.model');
const UsageLogs = require('../models/usage.model');
const redis = require('../redis.connection');
const { logFeatureUsage } = require('../utils/feature-analytics');

/**
 * Track feature usage (internal API)
 * This endpoint is called by the Flask server to track feature usage
 */
async function trackFeatureUsage(req, res) {
    try {
        // Verify internal API key
        const apiKey = req.headers['x-api-key'];
        if (apiKey !== process.env.INTERNAL_API_KEY) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        const { userId, featureName, metadata } = req.body;

        if (!userId || !featureName) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Update usage in database
        const updateQuery = { $inc: {} };
        updateQuery.$inc[`usage.${featureName}`] = 1;
        updateQuery.$set = { 'usage.lastActive': new Date() };

        await Student.findByIdAndUpdate(userId, updateQuery);

        // Update Redis cache
        await redis.hincrby(`student:${userId}`, `usage.${featureName}`, 1);
        await redis.HSET(`student:${userId}`, 'usage.lastActive', new Date().toISOString());

        // Log usage for analytics
        logFeatureUsage(userId, featureName, metadata);

        res.status(200).json({
            success: true,
            message: 'Usage tracked successfully'
        });
    } catch (error) {
        console.error('Error tracking feature usage:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

/**
 * Get user's feature usage
 */
async function getUserFeatureUsage(req, res) {
    try {
        const userId = req.userId;
        
        // Get user basic info and usage from UsageLogs
        const user = await Student.findById(userId).select('membership membershipDetails');
        const usageLog = await UsageLogs.findOne({ userId: userId });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!usageLog) {
            return res.status(404).json({
                success: false,
                message: 'No usage data found. Please contact support.'
            });
        }
        
        // Format the response using UsageLogs data
        const usageData = {
            membership: usageLog.planType,
            membershipStatus: user.membershipDetails?.status || 'inactive',
            expiresAt: usageLog.planExpiresAt,
            isPlanExpired: usageLog.isPlanExpired(),
            features: {
                ytSummary: {
                    remaining: usageLog.ytSummary,
                    type: typeof usageLog.ytSummary === 'number' ? 
                          (usageLog.ytSummary === Number.MAX_SAFE_INTEGER ? 'unlimited' : 'limited') : 'boolean',
                    access: usageLog.ytSummary === Number.MAX_SAFE_INTEGER || usageLog.ytSummary > 0
                },
                quiz: {
                    remaining: usageLog.quiz,
                    type: typeof usageLog.quiz === 'number' ? 
                          (usageLog.quiz === Number.MAX_SAFE_INTEGER ? 'unlimited' : 'limited') : 'boolean',
                    access: usageLog.quiz === Number.MAX_SAFE_INTEGER || usageLog.quiz > 0
                },
                chatbot: {
                    remaining: usageLog.chatbot,
                    type: typeof usageLog.chatbot === 'number' ? 
                          (usageLog.chatbot === Number.MAX_SAFE_INTEGER ? 'unlimited' : 'limited') : 'boolean',
                    access: usageLog.chatbot === Number.MAX_SAFE_INTEGER || usageLog.chatbot > 0
                },
                mindmap: {
                    remaining: usageLog.mindmap,
                    type: typeof usageLog.mindmap === 'number' ? 
                          (usageLog.mindmap === Number.MAX_SAFE_INTEGER ? 'unlimited' : 'limited') : 'boolean',
                    access: usageLog.mindmap === Number.MAX_SAFE_INTEGER || usageLog.mindmap > 0
                },
                p2pDoubt: {
                    access: usageLog.p2pDoubt,
                    type: 'boolean'
                },
                joinQuiz: {
                    access: usageLog.joinQuiz,
                    type: 'boolean'
                },
                modelselect: {
                    access: usageLog.modelselect,
                    type: 'boolean'
                },
                difficultychoose: {
                    access: usageLog.difficultychoose,
                    type: 'boolean'
                }
            },
            planRenewedAt: usageLog.planRenewedAt,
            originalLimits: usageLog.originalLimits
        };
        
        res.status(200).json({
            success: true,
            usage: usageData
        });
    } catch (error) {
        console.error('Error getting user feature usage:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

module.exports = {
    trackFeatureUsage,
    getUserFeatureUsage
};
