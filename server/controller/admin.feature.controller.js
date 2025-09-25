const Membership = require('../models/membership.model');
const Student = require('../models/student.model');
const redis = require('../redis.connection');

/**
 * Get all membership tiers with feature details
 */
async function getMembershipTiers(req, res) {
    try {
        const memberships = await Membership.find().sort({ displayOrder: 1 });
        
        res.status(200).json({
            success: true,
            memberships
        });
    } catch (error) {
        console.error('Error getting membership tiers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve membership tiers'
        });
    }
}

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
 * Monitor membership health for proactive admin actions
 */
async function getMembershipHealthOverview(req, res) {
    try {
        const windowDays = Math.min(Math.max(parseInt(req.query.windowDays ?? "7", 10) || 7, 1), 30);
        const now = new Date();
        const soonThreshold = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);
        const lookbackStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

        const [result] = await Student.aggregate([
            {
                $facet: {
                    totalByMembership: [
                        { $group: { _id: "$membership", count: { $sum: 1 } } },
                        { $sort: { count: -1 } }
                    ],
                    expiringSoon: [
                        {
                            $match: {
                                "membershipDetails.endDate": { $gte: now, $lte: soonThreshold }
                            }
                        },
                        { $group: { _id: "$membership", count: { $sum: 1 } } },
                        { $sort: { count: -1 } }
                    ],
                    expired: [
                        {
                            $match: {
                                "membershipDetails.endDate": { $lt: now }
                            }
                        },
                        { $group: { _id: "$membership", count: { $sum: 1 } } },
                        { $sort: { count: -1 } }
                    ],
                    statusBreakdown: [
                        { $group: { _id: "$membershipDetails.status", count: { $sum: 1 } } },
                        { $sort: { count: -1 } }
                    ],
                    newSignups: [
                        { $match: { createdAt: { $gte: lookbackStart } } },
                        { $group: { _id: "$membership", count: { $sum: 1 } } },
                        { $sort: { count: -1 } }
                    ]
                }
            }
        ]);

        const formatBreakdown = (items = [], key) =>
            items.map(({ _id, count }) => ({ [key]: _id || "unknown", count }));

        const metrics = {
            totalByMembership: formatBreakdown(result?.totalByMembership, "membership"),
            expiringSoon: formatBreakdown(result?.expiringSoon, "membership"),
            expired: formatBreakdown(result?.expired, "membership"),
            statusBreakdown: formatBreakdown(result?.statusBreakdown, "status"),
            newSignups: formatBreakdown(result?.newSignups, "membership")
        };

        const totals = {
            totalMembers: metrics.totalByMembership.reduce((sum, entry) => sum + entry.count, 0),
            expiringSoon: metrics.expiringSoon.reduce((sum, entry) => sum + entry.count, 0),
            expired: metrics.expired.reduce((sum, entry) => sum + entry.count, 0)
        };

        const activeStatus = metrics.statusBreakdown.find(entry => entry.status === "active");
        const inactiveStatuses = metrics.statusBreakdown.filter(entry => entry.status !== "active");
        const inactiveTotal = inactiveStatuses.reduce((sum, entry) => sum + entry.count, 0);

        const alerts = [];
        if (totals.expiringSoon > 0) {
            alerts.push({
                severity: totals.expiringSoon / (totals.totalMembers || 1) > 0.2 ? "critical" : "warning",
                message: `${totals.expiringSoon} membership(s) expiring within the next ${windowDays} day(s)`
            });
        }
        if (totals.expired > 0) {
            alerts.push({
                severity: "critical",
                message: `${totals.expired} membership(s) already expired`
            });
        }
        if (inactiveTotal > 0) {
            alerts.push({
                severity: "warning",
                message: `${inactiveTotal} membership(s) flagged as ${inactiveStatuses.map(entry => entry.status).join(", ")}`
            });
        }
        if (!alerts.length) {
            alerts.push({
                severity: "info",
                message: "All memberships are in good standing."
            });
        }

        res.status(200).json({
            success: true,
            windowDays,
            generatedAt: now.toISOString(),
            metrics,
            summary: {
                ...totals,
                activeMembers: activeStatus?.count || 0,
                inactiveMembers: inactiveTotal,
                newSignups: metrics.newSignups.reduce((sum, entry) => sum + entry.count, 0)
            },
            alerts
        });
    } catch (error) {
        console.error("Error generating membership health overview:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate membership health overview"
        });
    }
}

module.exports = {
    getMembershipTiers,
    updateMembershipTier,
    getGlobalUsageStats,
    getMembershipHealthOverview
};