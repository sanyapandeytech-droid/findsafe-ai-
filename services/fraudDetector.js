const logger = require('../config/logger');

class FraudDetector {
  constructor() {
    this.patterns = [
      { pattern: /otp/i, weight: 25, label: 'Asks you to share an OTP' },
      { pattern: /\b(pin|cvv|password|mpin)\b/i, weight: 30, label: 'Asks for your PIN, CVV, or password' },
      { pattern: /(block|suspend|deactivat)\w*.{0,25}(account|card|upi|sim)/i, weight: 20, label: 'Threatens to block your account' },
      { pattern: /kyc/i, weight: 15, label: 'Urgent KYC update request' },
      { pattern: /(click|tap)\w*.{0,15}(link|here)/i, weight: 15, label: 'Pushes you to click a link' },
      { pattern: /(bit\.ly|tinyurl|t\.co|short\.link|rb\.gy|cutt\.ly)/i, weight: 20, label: 'Uses a shortened, untraceable link' },
      { pattern: /(won|winner|lottery|lucky draw|prize)/i, weight: 20, label: 'Claims you\'ve won a prize' },
      { pattern: /(refund|cashback)\w*.{0,20}(claim|process|pending)/i, weight: 15, label: 'Unexpected refund or cashback claim' },
      { pattern: /(urgent|immediately|within \d+ ?(hours|hrs|minutes)|act now|last chance)/i, weight: 15, label: 'Creates false urgency' },
      { pattern: /(pay|transfer|send money)\w*.{0,20}(verify|confirm|secure|fee|processing)/i, weight: 20, label: 'Asks you to pay to \'verify\' or process something' },
      { pattern: /(rbi|income tax|government)\w*.{0,20}(notice|fine|penalty|legal)/i, weight: 20, label: 'Impersonates a government or RBI notice' },
      { pattern: /(call|contact)\w*.{0,15}(this number|helpline|immediately)/i, weight: 10, label: 'Pushes you to call an unknown number' },
      { pattern: /guaranteed\w*.{0,15}(return|profit|income)/i, weight: 20, label: 'Promises guaranteed investment returns' },
    ];
  }

  async analyze(text) {
    try {
      const score = this.calculateRiskScore(text);
      const tier = this.classify(score);
      const matched = this.detectPatterns(text);

      const summary = this.getSummary(tier);
      const tip = this.getTip(tier);

      return {
        score,
        tier,
        matched,
        summary,
        tip,
        mlPrediction: this.getMlPrediction(score, matched.length),
      };
    } catch (error) {
      logger.error('Fraud detection error:', error);
      throw error;
    }
  }

  calculateRiskScore(text) {
    let score = 0;
    this.patterns.forEach(pattern => {
      if (pattern.pattern.test(text)) {
        score += pattern.weight;
      }
    });
    return Math.min(100, score);
  }

  detectPatterns(text) {
    const matched = [];
    this.patterns.forEach(p => {
      if (p.pattern.test(text)) {
        matched.push({
          pattern: p.pattern.toString(),
          weight: p.weight,
          label: p.label,
        });
      }
    });
    return matched;
  }

  classify(score) {
    if (score >= 60) return 'danger';
    if (score >= 20) return 'caution';
    return 'safe';
  }

  getSummary(tier) {
    const summaries = {
      safe: 'No common fraud patterns were found in this message.',
      caution: 'This message shows some signs commonly seen in scams.',
      danger: 'This message shows strong signs of fraud.',
    };
    return summaries[tier];
  }

  getTip(tier) {
    const tips = {
      safe: 'Still, never share your OTP, PIN, or CVV with anyone — even if a message looks genuine.',
      caution: 'Don\'t click any links or share codes from this message. Verify directly with your bank\'s official app or number.',
      danger: 'Do not click links, share OTP/PIN, or make any payment. Report and block the sender.',
    };
    return tips[tier];
  }

  getMlPrediction(score, flagCount) {
    const confidence = Math.min(0.95, 0.5 + (flagCount * 0.1) + (score / 200));
    const normalizedScore = score / 100;

    return {
      confidence,
      probability: {
        safe: Math.max(0, 1 - normalizedScore),
        caution: Math.abs(0.5 - normalizedScore),
        danger: Math.max(0, normalizedScore - 0.5),
      },
    };
  }
}

module.exports = FraudDetector;
