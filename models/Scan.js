const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Allow anonymous scans
  },
  message: {
    type: String,
    required: true,
    maxlength: 5000,
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true,
  },
  riskLevel: {
    type: String,
    enum: ['safe', 'caution', 'danger'],
    required: true,
  },
  detectedFlags: [
    {
      pattern: String,
      weight: Number,
      label: String,
    },
  ],
  mlPrediction: {
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },
    probability: {
      safe: Number,
      caution: Number,
      danger: Number,
    },
  },
  metadata: {
    sourceChannel: {
      type: String,
      enum: ['sms', 'whatsapp', 'email', 'telegram', 'other'],
      default: 'other',
    },
    language: {
      type: String,
      default: 'en',
    },
    ipAddress: String,
    userAgent: String,
  },
  isFalsePositive: {
    type: Boolean,
    default: false,
  },
  feedback: {
    type: String,
    enum: ['helpful', 'not-helpful', null],
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
scanSchema.index({ userId: 1, createdAt: -1 });
scanSchema.index({ riskLevel: 1 });

module.exports = mongoose.model('Scan', scanSchema);
