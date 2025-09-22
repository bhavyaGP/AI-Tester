const express = require('express');
const router = express.Router();
const Maintenance = require('../models/maintenance.model');
const { verifyUser, verifyAdmin } = require('../middleware/auth.middleware');

// Get maintenance status (public route for frontend to check)
router.get('/status', async (req, res) => {
    try {
        const maintenance = await Maintenance.getMaintenanceStatus();
        console.log('Maintenance status fetched:', maintenance);
        res.json({
            success: true,
            isMaintenanceMode: maintenance.isMaintenanceMode,
            message: maintenance.message
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching maintenance status',
            error: error.message
        });
    }
});

// Toggle maintenance mode (admin only)
router.post('/toggle', verifyAdmin, async (req, res) => {
    try {
        const { isMaintenanceMode, message } = req.body;
        console.log('Toggle maintenance mode request:', req.body);
        const maintenance = await Maintenance.updateMaintenanceStatus(
            isMaintenanceMode,
            message,
            req.userId
        );

        res.json({
            success: true,
            message: `Maintenance mode ${isMaintenanceMode ? 'enabled' : 'disabled'}`,
            maintenance: {
                isMaintenanceMode: maintenance.isMaintenanceMode,
                message: maintenance.message,
                updatedAt: maintenance.updatedAt
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating maintenance status',
            error: error.message
        });
    }
});

module.exports = router;
