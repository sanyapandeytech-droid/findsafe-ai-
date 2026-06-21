const express = require('express');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const Scan = require('../models/Scan');
const User = require('../models/User');
const FraudDetector = require('../services/fraudDetector');
const logger = require('../config/logger');

const router = express.Router();

// Middleware to extract user from token
const extractUser = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
    }
  } catch (error) {
    // Token is optional for scans
  }
  next();
};

router.use(extractUser);

// Validation schema
const scanSchema = Joi.object({
  message: Joi.string().min(5).max(5000).required(),
  sourceChannel: Joi.string().valid('sms', 'whatsapp', 'email', 'telegram', 'other').optional(),
  language: Joi.string().default('en').optional(),
});

// Main scan endpoint
router.post('/analyze', async (req, res) => {
  try {
    const { error, value } = scanSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Analyze message using fraud detector
    const detector = new FraudDetector();
    const analysisResult = await detector.analyze(value.message);

    // Create scan record
    const scanRecord = new Scan({
      userId: req.userId || undefined,
      message: value.message,
      riskScore: analysisResult.score,
      riskLevel: analysisResult.tier,
      detectedFlags: analysisResult.matched,
      mlPrediction: analysisResult.mlPrediction,
      metadata: {
        sourceChannel: value.sourceChannel,
        language: value.language,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    await scanRecord.save();

    // Update user scan count
    if (req.userId) {
      await User.findByIdAndUpdate(
        req.userId,
        { $inc: { scansCount: 1 } }
      );
    }

    logger.info(`Scan completed: Risk Level - ${analysisResult.tier}, Score - ${analysisResult.score}`);

    res.json({
      success: true,
      scanId: scanRecord._id,
      message: 'Message analyzed successfully',
      result: {
        riskScore: analysisResult.score,
        riskLevel: analysisResult.tier,
        summary: analysisResult.summary,
        detectedFlags: analysisResult.matched,
        tip: analysisResult.tip,
        mlConfidence: analysisResult.mlPrediction?.confidence,
      },
    });
  } catch (error) {
    logger.error('Scan error:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing message',
    });
  }
});

// Get scan history
router.get('/history', async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const scans = await Scan.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Scan.countDocuments({ userId: req.userId });

    res.json({
      success: true,
      data: scans,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('History fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching scan history',
    });
  }
});

// Get scan details
router.get('/:scanId', async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.scanId);

    if (!scan) {
      return res.status(404).json({
        success: false,
        message: 'Scan not found',
      });
    }

    // Check authorization
    if (scan.userId && req.userId !== scan.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    res.json({
      success: true,
      data: scan,
    });
  } catch (error) {
    logger.error('Scan details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching scan details',
    });
  }
});

// Submit feedback on scan
router.put('/:scanId/feedback', async (req, res) => {
  try {
    const { feedback, isFalsePositive } = req.body;

    const scan = await Scan.findByIdAndUpdate(
      req.params.scanId,
      {
        feedback,
        isFalsePositive: isFalsePositive || false,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!scan) {
      return res.status(404).json({
        success: false,
        message: 'Scan not found',
      });
    }

    logger.info(`Feedback submitted for scan ${req.params.scanId}`);

    res.json({
      success: true,
      message: 'Feedback recorded',
      data: scan,
    });
  } catch (error) {
    logger.error('Feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting feedback',
    });
  }
});

module.exports = router;
