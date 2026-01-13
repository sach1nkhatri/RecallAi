/**
 * Authentication Middleware
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (jwtError) {
        // Handle specific JWT errors
        if (jwtError.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            error: 'Token expired',
          });
        }
        if (jwtError.name === 'JsonWebTokenError') {
          return res.status(401).json({
            success: false,
            error: 'Invalid token',
          });
        }
        throw jwtError;
      }

      // Get user from token
      req.user = await User.findById(decoded.userId).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }

      // Check if user is active
      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Account deactivated',
        });
      }

      // Reset daily usage if needed (but don't save on every request to reduce DB load)
      // Only save if it actually needs reset
      const needsReset = req.user.resetDailyUsage();
      if (needsReset) {
        await req.user.save();
      }

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(401).json({
        success: false,
        error: 'Not authorized, token failed',
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      error: 'Not authorized, no token',
    });
  }
};

module.exports = { protect };

