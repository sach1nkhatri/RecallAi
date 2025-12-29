/**
 * Admin Authentication Middleware
 */

const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Protect admin routes - verify JWT token
const protectAdmin = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get admin from token
      req.admin = await Admin.findById(decoded.userId).select('-password');

      if (!req.admin || !req.admin.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Admin not authorized',
        });
      }

      next();
    } catch (error) {
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

module.exports = { protectAdmin };

