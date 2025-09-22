/**
 * Feature configuration with environment-specific settings
 * This file defines all AI-powered features and their configuration
 */
const config = {
    development: {
        caching: {
            enabled: true,
            ttl: {
                user: 3600, // 1 hour in seconds
                membership: 86400 // 24 hours in seconds
            }
        },
        tracking: {
            logRequests: true,
            detailedErrors: true,
            analyticsEnabled: true
        },
        features: {
            // YouTube video summarization
            ytSummary: {
                rateLimit: 10, // requests per minute
                processingTime: 30, // seconds
                aiModels: ['gemini', 'chatgroq'],
                requiresAuth: true
            },
            // Quiz generation
            quiz: {
                rateLimit: 5, // requests per minute
                maxQuestions: 20,
                aiModels: ['llama-3.1-8b-instant'],
                requiresAuth: true
            },
            // Chatbot interactions
            chatbot: {
                rateLimit: 20, // requests per minute
                maxTokens: 2000,
                aiModels: ['gemini-1.5-flash', 'llama-3.1-8b-instant'],
                requiresAuth: true
            },
            // Mind map generation
            mindmap: {
                rateLimit: 5, // requests per minute
                processingTime: 45, // seconds
                aiModels: ['llama-3.1-8b-instant'],
                requiresAuth: true
            },
            // AI-powered doubt solving
            aiDoubtSolve: {
                rateLimit: 5, // requests per minute
                maxTokens: 4000,
                aiModels: ['meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo'],
                requiresAuth: true
            },
            // Peer-to-peer doubt solving
            p2pDoubt: {
                maxActiveChats: 3,
                requiresAuth: true
            },
            // Recommendations
            recommendations: {
                rateLimit: 10, // requests per minute
                aiModels: ['llama-3.1-8b-instant'],
                requiresAuth: true
            }
        }
    },
    production: {
        caching: {
            enabled: true,
            ttl: {
                user: 1800, // 30 minutes in seconds
                membership: 86400 // 24 hours in seconds
            }
        },
        tracking: {
            logRequests: true,
            detailedErrors: false,
            analyticsEnabled: true
        },
        features: {
            // YouTube video summarization
            ytSummary: {
                rateLimit: 6, // requests per minute
                processingTime: 30, // seconds
                aiModels: ['gemini', 'chatgroq'],
                requiresAuth: true
            },
            // Quiz generation
            quiz: {
                rateLimit: 3, // requests per minute
                maxQuestions: 15,
                aiModels: ['llama-3.1-8b-instant'],
                requiresAuth: true
            },
            // Chatbot interactions
            chatbot: {
                rateLimit: 15, // requests per minute
                maxTokens: 2000,
                aiModels: ['gemini-1.5-flash', 'llama-3.1-8b-instant'],
                requiresAuth: true
            },
            // Mind map generation
            mindmap: {
                rateLimit: 3, // requests per minute
                processingTime: 45, // seconds
                aiModels: ['llama-3.1-8b-instant'],
                requiresAuth: true
            },
            // AI-powered doubt solving
            aiDoubtSolve: {
                rateLimit: 3, // requests per minute
                maxTokens: 4000,
                aiModels: ['meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo'],
                requiresAuth: true
            },
            // Peer-to-peer doubt solving
            p2pDoubt: {
                maxActiveChats: 2,
                requiresAuth: true
            },
            // Recommendations
            recommendations: {
                rateLimit: 5, // requests per minute
                aiModels: ['llama-3.1-8b-instant'],
                requiresAuth: true
            }
        }
    }
};

// Export the configuration based on environment
const env = process.env.NODE_ENV || 'development';
module.exports = config[env];