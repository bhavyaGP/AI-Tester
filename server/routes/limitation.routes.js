const express = require('express');
const router = express.Router();
const limitationService = require('../services/limitationValidation.service');

// Middleware to validate API key for cross-server requests
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.INTERNAL_API_KEY || 'your-internal-api-key-here';
  
  if (apiKey !== validApiKey) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_API_KEY',
      message: 'Invalid API key for internal service'
    });
  }
  
  next();
};

// Validate feature access for a user
router.post('/validate-feature', validateApiKey, async (req, res) => {
  try {
    const { userId, featureName } = req.body;
    
    if (!userId || !featureName) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMETERS',
        message: 'userId and featureName are required'
      });
    }

    const result = await limitationService.validateFeatureAccess(userId, featureName);
    
    return res.status(result.code || 200).json(result);

  } catch (error) {
    console.error('Validation API error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Internal server error'
    });
  }
});

// Consume feature usage
router.post('/consume-feature', validateApiKey, async (req, res) => {
  try {
    const { userId, featureName } = req.body;
    
    if (!userId || !featureName) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMETERS',
        message: 'userId and featureName are required'
      });
    }

    const result = await limitationService.consumeFeatureUsage(userId, featureName);
    
    return res.status(result.code || 200).json(result);

  } catch (error) {
    console.error('Consume API error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Internal server error'
    });
  }
});

// Get user usage overview
router.get('/user-usage/:userId', validateApiKey, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_USER_ID',
        message: 'userId is required'
      });
    }

    const result = await limitationService.getUserUsageOverview(userId);
    
    return res.status(result.code || 200).json(result);

  } catch (error) {
    console.error('User usage API error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Internal server error'
    });
  }
});

// Bulk feature validation
router.post('/validate-multiple', validateApiKey, async (req, res) => {
  try {
    const { userId, featureNames } = req.body;
    
    if (!userId || !Array.isArray(featureNames)) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMETERS',
        message: 'userId and featureNames array are required'
      });
    }

    const result = await limitationService.validateMultipleFeatures(userId, featureNames);
    
    return res.status(200).json(result);

  } catch (error) {
    console.error('Bulk validation API error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Internal server error'
    });
  }
});

// Admin endpoint to reset user usage
router.post('/reset-usage', validateApiKey, async (req, res) => {
  try {
    const { userId, planType } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_USER_ID',
        message: 'userId is required'
      });
    }

    const result = await limitationService.resetUserUsage(userId, planType);
    
    return res.status(result.code || 200).json(result);

  } catch (error) {
    console.error('Reset usage API error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Internal server error'
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Limitation validation service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
