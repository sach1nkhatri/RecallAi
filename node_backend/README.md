# Recall AI - Node.js Backend

Node.js backend for user authentication and MongoDB database management.

## Features

- User registration and authentication
- JWT-based authentication
- MongoDB user database
- Usage tracking and limits
- Plan management (Free, Pro, Enterprise)
- User-based report submission (bug reports, feature requests, feedback)
- User settings and preferences management
- Password hashing with bcrypt
- Rate limiting
- Security middleware (Helmet)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
- MongoDB connection string
- JWT secret
- Port number
- Frontend URL

4. Make sure MongoDB is running:
- Local MongoDB: `mongod`
- Or use MongoDB Atlas connection string

5. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)
- `PUT /api/auth/profile` - Update profile (Protected)
- `PUT /api/auth/change-password` - Change password (Protected)

### User Management
- `GET /api/users/usage` - Get usage statistics (Protected)
- `POST /api/users/usage/increment` - Increment usage counter (Protected)
- `PUT /api/users/plan` - Update user plan (Protected)
- `DELETE /api/users/account` - Delete account (Protected)

### Reports
- `POST /api/reports` - Submit a new report (Protected)
- `GET /api/reports` - Get user's reports (Protected)
- `GET /api/reports/:id` - Get a single report (Protected)
- `PUT /api/reports/:id` - Update a report (Protected)
- `DELETE /api/reports/:id` - Delete a report (Protected)

### Settings
- `GET /api/settings` - Get user settings (Protected)
- `PUT /api/settings` - Update user settings (Protected)
- `POST /api/settings/reset` - Reset settings to defaults (Protected)

## Authentication

Include JWT token in Authorization header:
```
Authorization: Bearer <token>
```

## Usage Limits (Free Plan)

- Bots: 1
- Chats per day: 10
- Code to Doc uses: 2
- Tokens: 5,000

# Node.js Backend Environment Variables

# Server Configuration
PORT=5002
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/recall-ai
# Or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/recall-ai?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=AracArv456AS5dsgfdf5dsfgsdfs5dtd
JWT_EXPIRE=7d

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100