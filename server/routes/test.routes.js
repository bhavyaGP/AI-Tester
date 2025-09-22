const express = require('express');
const router = express.Router();
const limitationService = require('../services/limitationValidation.service');
const { checkFeatureAccess, createFeatureMiddleware, debugUsageInfo } = require('../middleware/featureUsage.middleware');
const { verifyUser } = require('../middleware/auth.middleware');

// Test endpoint to check user's usage status
router.get('/usage-status', verifyUser, async (req, res) => {
    try {
        const userId = req.userId;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User authentication required'
            });
        }

        const overview = await limitationService.getUserUsageOverview(userId);
        
        return res.status(200).json(overview);
        
    } catch (error) {
        console.error('Error getting usage status:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Test endpoint for ytSummary feature (protected)
router.post('/test-yt-summary', verifyUser, createFeatureMiddleware('ytSummary'), (req, res) => {
    return res.status(200).json({
        success: true,
        message: 'YT Summary feature accessed successfully!',
        userId: req.userId,
        featureUsed: 'ytSummary'
    });
});

// Test endpoint for quiz feature (protected)
router.post('/test-quiz', verifyUser, createFeatureMiddleware('quiz'), (req, res) => {
    return res.status(200).json({
        success: true,
        message: 'Quiz feature accessed successfully!',
        userId: req.userId,
        featureUsed: 'quiz'
    });
});

// Test endpoint for chatbot feature (protected)
router.post('/test-chatbot', verifyUser, createFeatureMiddleware('chatbot'), (req, res) => {
    return res.status(200).json({
        success: true,
        message: 'Chatbot feature accessed successfully!',
        userId: req.userId,
        featureUsed: 'chatbot'
    });
});

// Test endpoint for mindmap feature (protected)
router.post('/test-mindmap', verifyUser, createFeatureMiddleware('mindmap'), (req, res) => {
    return res.status(200).json({
        success: true,
        message: 'Mindmap feature accessed successfully!',
        userId: req.userId,
        featureUsed: 'mindmap'
    });
});

// Manual validation endpoint (doesn't consume usage)
router.post('/check-feature', verifyUser, async (req, res) => {
    try {
        const { featureName } = req.body;
        const userId = req.userId;

        if (!featureName) {
            return res.status(400).json({
                success: false,
                message: 'featureName is required'
            });
        }

        const result = await limitationService.validateFeatureAccess(userId, featureName);
        return res.status(result.code || 200).json(result);

    } catch (error) {
        console.error('Error checking feature:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Manual consumption endpoint
router.post('/consume-feature', verifyUser, async (req, res) => {
    try {
        const { featureName } = req.body;
        const userId = req.userId;

        if (!featureName) {
            return res.status(400).json({
                success: false,
                message: 'featureName is required'
            });
        }

        const result = await limitationService.consumeFeatureUsage(userId, featureName);
        return res.status(result.code || 200).json(result);

    } catch (error) {
        console.error('Error consuming feature:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Debug endpoint with usage info
router.get('/debug', verifyUser, debugUsageInfo, (req, res) => {
    return res.status(200).json({
        success: true,
        userId: req.userId,
        userUsageInfo: req.userUsageInfo || null,
        message: 'Debug info retrieved'
    });
});

module.exports = router;
