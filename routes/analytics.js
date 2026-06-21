const express = require('express');
const Scan = require('../models/Scan');
const User = require('../models/User');
const logger = require('../config/logger');

const router = express.Router();

// Get global analytics (public endpoint)
router.get('/global', async (req, res) => {
  try {
    const scans = await Scan.find();
    const users = await User.find();

    const analytics = {
      totalScans: scans.length,
      totalUsers: users.length,
      riskDistribution: {
        safe: scans.filter(s => s.riskLevel === 'safe').length,
        caution: scans.filter(s => s.riskLevel === 'caution').length,
        danger: scans.filter(s => s.riskLevel === 'danger').length,
      },
      averageRiskScore: scans.length > 0
        ? Math.round(scans.reduce((sum, s) => sum + s.riskScore, 0) / scans.length)
        : 0,
      topFraudPatterns: await getTopPatterns(scans),
      recentTrends: await getTrends(scans),
    };

    res.json({
      success: true,
      analytics,
    });
  } catch (error) {
    logger.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
    });
  }
});

// Helper function to get top fraud patterns
async function getTopPatterns(scans) {
  const patterns = {};
  
  scans.forEach(scan => {
    scan.detectedFlags.forEach(flag => {
      if (!patterns[flag.label]) {
        patterns[flag.label] = 0;
      }
      patterns[flag.label]++;
    });
  });

  return Object.entries(patterns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([label, count]) => ({ label, count }));
}

// Helper function to get trends
async function getTrends(scans) {
  const trends = {};
  const days = 30;
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    trends[dateStr] = 0;
  }

  scans.forEach(scan => {
    const dateStr = new Date(scan.createdAt).toISOString().split('T')[0];
    if (trends[dateStr] !== undefined) {
      trends[dateStr]++;
    }
  });

  return trends;
}

module.exports = router;
