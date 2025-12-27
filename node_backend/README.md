# Recall AI - Node.js Backend

Node.js backend for user authentication and MongoDB database management.

## Features

- User registration and authentication
- JWT-based authentication
- MongoDB user database
- Usage tracking and limits
- Plan management (Free, Pro, Enterprise)
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

