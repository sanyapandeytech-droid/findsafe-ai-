# FinSafe AI Backend - Complete Guide

## 📋 Overview

This is a production-ready backend API for the FinSafe AI fraud detection platform. It combines Node.js/Express with MongoDB for scalable, secure fraud detection services.

## 🚀 Quick Start

### Prerequisites
- Node.js 14+
- MongoDB (local or Atlas)
- npm or yarn

### Installation

```bash
# 1. Clone and navigate to backend
git clone <repo-url>
cd backend

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# 4. Start the server
npm run dev    # Development with auto-reload
npm start      # Production mode
```

The server will run on `http://localhost:5000`

## 📚 API Endpoints Summary

### 🔐 Authentication (`/api/auth`)
- `POST /register` - Create new account
- `POST /login` - Login and get JWT token
- `POST /verify-token` - Verify token validity

### 🔍 Scanning (`/api/scan`)
- `POST /analyze` - Scan message for fraud (core feature)
- `GET /history` - Get user's scan history
- `GET /:scanId` - Get specific scan details
- `PUT /:scanId/feedback` - Submit scan feedback

### 👤 User (`/api/user`)
- `GET /profile` - Get user profile
- `PUT /profile` - Update profile info
- `GET /stats` - Get user statistics
- `POST /change-password` - Change password

### 📊 Analytics (`/api/analytics`)
- `GET /global` - Global fraud statistics (public)

### 🛠️ Admin (`/api/admin`)
- `GET /users` - List all users
- `PUT /users/:userId/role` - Update user role
- `GET /dashboard` - Admin dashboard

## 🔧 Key Features

### 1. Fraud Detection
```javascript
// Example: Analyze a message
POST /api/scan/analyze
{
  "message": "Click here to verify your account immediately!",
  "sourceChannel": "sms"
}

// Response:
{
  "riskScore": 65,
  "riskLevel": "danger",
  "detectedFlags": [
    "Pushes you to click a link",
    "Creates false urgency"
  ],
  "mlConfidence": 0.85
}
```

### 2. User Authentication
- JWT tokens with 7-day expiry
- Password hashing with bcrypt
- Email-based login
- Token verification endpoints

### 3. Rate Limiting
- General API: 100 req/15min per IP
- Scanning: 10 scans/min per user
- Prevents abuse and DDoS

### 4. Data Security
- Helmet.js for security headers
- CORS protection
- Input validation with Joi
- SQL injection prevention (MongoDB)
- XSS protection

## 📁 Project Structure

```
backend/
├── server.js                 # Main server file
├── package.json
├── .env.example             # Environment template
│
├── config/
│   └── logger.js            # Winston logging
│
├── models/
│   ├── User.js              # User schema + auth methods
│   └── Scan.js              # Scan records schema
│
├── routes/
│   ├── auth.js              # Auth endpoints
│   ├── scan.js              # Scan endpoints
│   ├── user.js              # User endpoints
│   ├── analytics.js         # Analytics endpoints
│   └── admin.js             # Admin endpoints
│
├── services/
│   └── fraudDetector.js     # ML fraud detection logic
│
└── logs/                    # Log files (auto-created)
```

## 🔐 Security Checklist

- [x] JWT authentication
- [x] Password hashing (bcrypt)
- [x] Rate limiting
- [x] Input validation
- [x] CORS protection
- [x] Helmet security headers
- [x] Error handling
- [x] Logging system
- [x] Role-based access control

## 📈 Fraud Detection Algorithm

The backend uses pattern matching with weighted scoring:

1. **Pattern Detection**: 13 regex patterns detecting common fraud indicators
2. **Weight Assignment**: Each pattern has 10-30 point weight
3. **Score Calculation**: Sum of matched pattern weights (0-100)
4. **Risk Classification**:
   - 0-19: Safe ✅
   - 20-59: Caution ⚠️
   - 60-100: Danger 🚨

### Detected Patterns

- OTP/PIN/CVV requests
- Account blocking threats
- Shortened links
- Lottery/prize claims
- Urgent language
- Government impersonation
- And 7 more...

## 🗄️ Database Models

### User Collection
```javascript
{
  email: "user@example.com",
  username: "john_doe",
  password: "hashed_password",
  fullName: "John Doe",
  role: "user", // user, moderator, admin
  scansCount: 42,
  subscriptionPlan: "free", // free, basic, pro, enterprise
  createdAt: "2024-01-15T10:30:00Z"
}
```

### Scan Collection
```javascript
{
  userId: ObjectId,
  message: "Click here to verify KYC...",
  riskScore: 75,
  riskLevel: "danger",
  detectedFlags: [
    { label: "Pushes you to click a link", weight: 15 }
  ],
  mlPrediction: {
    confidence: 0.87,
    probability: { safe: 0.1, caution: 0.2, danger: 0.7 }
  },
  metadata: {
    sourceChannel: "sms",
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0..."
  },
  createdAt: "2024-01-15T11:45:00Z"
}
```

## 🚦 API Response Format

All endpoints follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { }
}
```

### Error Response
```json
{
  "success": false,
  "status": 400,
  "message": "Error description"
}
```

## 🔄 Integration with Frontend

### Setup CORS in Frontend
```javascript
const API_BASE = 'http://localhost:5000/api';

// Example: Scan a message
fetch(`${API_BASE}/scan/analyze`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    message: userInput,
    sourceChannel: 'sms'
  })
})
.then(r => r.json())
.then(data => console.log(data.result))
```

## 🧪 Testing

```bash
# Run all tests
npm test

# With coverage report
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## 📝 Logging

Winston logs are saved to:
- `logs/error.log` - Error level only
- `logs/combined.log` - All levels

Console output in development mode.

## 🚀 Deployment

### Option 1: Heroku
```bash
heroku create finsafe-ai-backend
heroku config:set MONGODB_URI=mongodb+srv://...
git push heroku main
```

### Option 2: Docker
```bash
docker build -t finsafe-ai .
docker run -p 5000:5000 -e MONGODB_URI=... finsafe-ai
```

### Option 3: AWS EC2
```bash
# Install Node.js, MongoDB
# Clone repo
npm install
npm start
```

## 📊 Monitoring

Monitor these metrics:
- API response time (target: <200ms)
- Error rate (target: <0.1%)
- Database query time (target: <50ms)
- Active users / concurrent scans
- Server uptime

## 🔮 Future Enhancements

1. **ML Model Integration**: Replace regex with trained ML models
2. **Real-time Analytics**: WebSocket for live fraud tracking
3. **Email/SMS Notifications**: Alert users of scans
4. **API Rate Limit**: Per-subscription tier limits
5. **Mobile App API**: Native iOS/Android support
6. **Webhook Support**: Integrations with third-party services

## 📞 Support

For issues:
1. Check logs in `logs/` directory
2. Verify `.env` configuration
3. Ensure MongoDB is running
4. Check GitHub issues

## 📄 License

MIT License - Free for personal and commercial use

---

**Built for Global Buildathon '26 — FinTech × Cybersecurity**
