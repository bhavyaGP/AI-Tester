const axios = require('axios');

class CrossServerLimitationClient {
  constructor(baseUrl = 'http://localhost:3000', apiKey = process.env.INTERNAL_API_KEY) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey || 'your-internal-api-key-here';
    this.headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey
    };
  }

  // Validate feature access from another server
  async validateFeatureAccess(userId, featureName, timeout = 5000) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/limitation/validate-feature`,
        { userId, featureName },
        { 
          headers: this.headers,
          timeout
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Cross-server validation error:', error.message);
      
      // Return error response format for consistent handling
      if (error.response) {
        return error.response.data;
      }
      
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: 'Failed to connect to limitation service',
        code: 500
      };
    }
  }

  // Consume feature usage from another server
  async consumeFeatureUsage(userId, featureName, timeout = 5000) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/limitation/consume-feature`,
        { userId, featureName },
        { 
          headers: this.headers,
          timeout
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Cross-server consumption error:', error.message);
      
      if (error.response) {
        return error.response.data;
      }
      
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: 'Failed to connect to limitation service',
        code: 500
      };
    }
  }

  // Get user usage overview from another server
  async getUserUsageOverview(userId, timeout = 5000) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/limitation/user-usage/${userId}`,
        { 
          headers: this.headers,
          timeout
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Cross-server usage overview error:', error.message);
      
      if (error.response) {
        return error.response.data;
      }
      
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: 'Failed to connect to limitation service',
        code: 500
      };
    }
  }

  // Check service health
  async checkHealth(timeout = 3000) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/limitation/health`,
        { timeout }
      );
      
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: 'SERVICE_UNAVAILABLE',
        message: 'Limitation service is not available'
      };
    }
  }

  // Bulk validate multiple features
  async validateMultipleFeatures(userId, featureNames, timeout = 10000) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/limitation/validate-multiple`,
        { userId, featureNames },
        { 
          headers: this.headers,
          timeout
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Cross-server bulk validation error:', error.message);
      
      if (error.response) {
        return error.response.data;
      }
      
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: 'Failed to connect to limitation service',
        code: 500
      };
    }
  }
}

// Factory function to create clients for different servers
const createLimitationClient = (serverConfig = {}) => {
  const {
    nodeServerUrl = 'http://localhost:3000',
    proxyServerUrl = 'http://localhost:3001',
    flaskServerUrl = 'http://localhost:5000',
    apiKey = process.env.INTERNAL_API_KEY
  } = serverConfig;

  return {
    nodeServer: new CrossServerLimitationClient(nodeServerUrl, apiKey),
    proxyServer: new CrossServerLimitationClient(proxyServerUrl, apiKey),
    flaskServer: new CrossServerLimitationClient(flaskServerUrl, apiKey)
  };
};

module.exports = {
  CrossServerLimitationClient,
  createLimitationClient
};
