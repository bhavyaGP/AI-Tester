const Membership = require('../models/membership.model');
const Student = require('../models/student.model');
const redis = require('../redis.connection');

/**
 * Get all membership tiers with feature details
 */


/**
 * Update a membership tier's features or pricing
 */
async function updateMembershipTier(req, res) {
    try {
        const { membershipType } = req.params;
        const updates = req.body;
        
        // Validate required fields
        if (!membershipType) {
            return res.status(400).json({
                success: false,
                message: 'Membership type is required'
            });
        }
        
        // Don't allow changing the type itself
        if (updates.type && updates.type !== membershipType) {
            return res.status(400).json({
                success: false,
                message: 'Cannot change membership type identifier'
            });
        }
        
        // Update the membership
        const membership = await Membership.findOneAndUpdate(
            { type: membershipType },
            updates,
            { new: true }
        );
        
        if (!membership) {
            return res.status(404).json({
                success: false,
                message: 'Membership tier not found'
            });
        }
        
        // Clear cache for this membership
        await redis.del(`membership:${membershipType}`);
        
        res.status(200).json({
            success: true,
            message: 'Membership tier updated successfully',
            membership
        });
    } catch (error) {
        console.error('Error updating membership tier:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update membership tier'
        });
    }
}

/**
 * Get usage statistics across all users
 */
async function getGlobalUsageStats(req, res) {
    try {
        const { startDate, endDate } = req.query;
        
        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.createdAt = {};
            if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
            if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
        }
        
        // Get total users by membership type
        const usersByMembership = await Student.aggregate([
            { $match: dateFilter },
            { $group: {
                _id: '$membership',
                count: { $sum: 1 },
                activeUsers: {
                    $sum: {
                        $cond: [
                            { $and: [
                                { $eq: ['$membershipDetails.status', 'active'] },
                                { $gt: ['$membershipDetails.endDate', new Date()] }
                            ]},
                            1, 0
                        ]
                    }
                }
            }},
            { $sort: { count: -1 } }
        ]);
        
        // Get feature usage statistics
        const features = ['ytSummary', 'quiz', 'chatbot', 'mindmap', 'p2pDoubt'];
        const usageStats = {};
        
        // This is a parallel operation for better performance
        await Promise.all(features.map(async (feature) => {
            const stats = await Student.aggregate([
                { $match: dateFilter },
                { $group: {
                    _id: '$membership',
                    totalUsage: { $sum: { $ifNull: [`$usage.${feature}`, 0] } },
                    avgUsage: { $avg: { $ifNull: [`$usage.${feature}`, 0] } },
                    usersWithUsage: { 
                        $sum: { $cond: [{ $gt: [`$usage.${feature}`, 0] }, 1, 0] } 
                    }
                }},
                { $sort: { _id: 1 } }
            ]);
            
            usageStats[feature] = stats;
        }));
        
        res.status(200).json({
            success: true,
            stats: {
                usersByMembership,
                featureUsage: usageStats
            }
        });
    } catch (error) {
        console.error('Error getting global usage stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve usage statistics'
        });
    }
}

/**
 * Get feature access report for a specific membership tier
 * This function returns a detailed report of which features are accessible
 * for a given membership type
 */
async function getFeatureAccessReport(req, res) {
    try {
        const { membershipType } = req.params;
        
        if (!membershipType) {
            return res.status(400).json({
                success: false,
                message: 'Membership type is required'
            });
        }
        
        // Find the membership tier
        const membership = await Membership.findOne({ type: membershipType });
        
        if (!membership) {
            return res.status(404).json({
                success: false,
                message: 'Membership tier not found'
            });
        }
        
        // Build feature access report
        const report = {
            membershipType: membership.type,
            displayName: membership.name,
            price: membership.price,
            features: {
                ytSummary: {
                    enabled: membership.features?.ytSummary?.enabled || false,
                    limit: membership.features?.ytSummary?.limit || 0,
                    description: 'YouTube video summarization'
                },
                quiz: {
                    enabled: membership.features?.quiz?.enabled || false,
                    limit: membership.features?.quiz?.limit || 0,
                    description: 'Quiz generation'
                },
                chatbot: {
                    enabled: membership.features?.chatbot?.enabled || false,
                    limit: membership.features?.chatbot?.limit || 0,
                    description: 'AI Chatbot access'
                },
                mindmap: {
                    enabled: membership.features?.mindmap?.enabled || false,
                    limit: membership.features?.mindmap?.limit || 0,
                    description: 'Mindmap generation'
                },
                p2pDoubt: {
                    enabled: membership.features?.p2pDoubt?.enabled || false,
                    description: 'Peer-to-peer doubt resolution'
                }
            }
        };
        
        res.status(200).json({
            success: true,
            report
        });
    } catch (error) {
        console.error('Error generating feature access report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate feature access report'
        });
    }
}

module.exports = {
    getMembershipTiers,
    updateMembershipTier,
    getGlobalUsageStats,
    getFeatureAccessReport
};