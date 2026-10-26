/**
 * BloodBridge Vision-X: Authentication & Role Authorization Middleware
 * 
 * Enforces role-based permissions strictly on the backend:
 * - 'requester': Can create requests, view own requests, perform search
 * - 'donor': Can manage donor profile, toggle availability, update consent
 * - 'admin': Can verify donors, review requests, manage blood banks & RAG docs
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const { localStore } = require('../db/db');

/**
 * Verify JWT token from Authorization header
 */
function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid Bearer token.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Fetch current user from store to verify existence
    const user = localStore.users.find((u) => u.id === decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account no longer exists or session is invalid.'
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role // Always extracted from backend database, never trusted from client
    };

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Session expired or invalid token. Please log in again.'
    });
  }
}

/**
 * Optional authentication middleware for public endpoints that can be personalized
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      const user = localStore.users.find((u) => u.id === decoded.id);
      if (user) {
        req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
      }
    } catch (err) {
      // Ignore token verification errors for optional auth
    }
  }
  next();
}

/**
 * Role-Based Access Control Middleware
 * @param {string[]} allowedRoles Array of roles like ['admin'] or ['requester', 'admin']
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires one of the following roles: [${allowedRoles.join(', ')}]. Your current role is "${req.user.role}".`
      });
    }

    next();
  };
}

module.exports = {
  authenticateUser,
  optionalAuth,
  requireRole
};
