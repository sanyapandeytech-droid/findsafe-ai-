const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Scan = require('../models/Scan');
const logger = require('../config/logger');

const router = express.Router();

// Middleware to verify authentication
const verifyAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

router.use(verifyAuth);

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      user: user.toJSON(),
    });
  } catch (error) {
    logger.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
    });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const { fullName, avatar } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      { fullName, avatar, updatedAt: new Date() },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    logger.info(`User profile updated: ${user.email}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: user.toJSON(),
    });
  } catch (error) {
    logger.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
    });
  }
});

// Get user statistics
router.get('/stats', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const scans = await Scan.find({ userId: req.userId });

    const stats = {
      totalScans: scans.length,
      dangerScans: scans.filter(s => s.riskLevel === 'danger').length,
      cautionScans: scans.filter(s => s.riskLevel === 'caution').length,
      safeScans: scans.filter(s => s.riskLevel === 'safe').length,
      averageRiskScore: scans.length > 0
        ? Math.round(scans.reduce((sum, s) => sum + s.riskScore, 0) / scans.length)
        : 0,
      subscriptionPlan: user.subscriptionPlan,
      scansRemaining: user.subscriptionPlan === 'free' ? Math.max(0, 100 - user.scansCount) : 'unlimited',
    };

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
    });
  }
});

// Change password
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current and new password are required',
      });
    }

    const user = await User.findById(req.userId).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;
    await user.save();

    logger.info(`Password changed for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
    });
  }
});

module.exports = router;
