const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Scan = require('../models/Scan');
const logger = require('../config/logger');

const router = express.Router();

// Middleware to verify admin access
const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

router.use(verifyAdmin);

// User management
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({ success: true, users });
  } catch (error) {
    logger.error('Users fetch error:', error);
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});

router.put('/users/:userId/role', async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { role },
      { new: true }
    );
    logger.info(`User role updated: ${user.email} -> ${role}`);
    res.json({ success: true, user });
  } catch (error) {
    logger.error('User role update error:', error);
    res.status(500).json({ success: false, message: 'Error updating user role' });
  }
});

// Dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalScans = await Scan.countDocuments();

    const recentScans = await Scan.find()
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      dashboard: {
        totalUsers,
        totalScans,
        recentScans,
      },
    });
  } catch (error) {
    logger.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Error fetching dashboard' });
  }
});

module.exports = router;
