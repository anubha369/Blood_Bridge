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
const { localStore, isPostgresConnected, getPool, getSupabase } = require('../db/db');

/**
 * Robust User Lookup Helper:
 * 1. Checks in-memory localStore cache
 * 2. Checks PostgreSQL public.users
 * 3. Checks Supabase client
 */
async function findUserById(userId) {
  if (!userId) return null;

  // 1. In-memory localStore
  let user = (localStore.users || []).find((u) => u.id === userId);
  if (user) return user;

  // 2. PostgreSQL public.users lookup
  if (isPostgresConnected() && getPool()) {
    try {
      const pool = getPool();
      const res = await pool.query(
        'SELECT id, email, name, role, is_verified, phone FROM public.users WHERE id = $1 LIMIT 1',
        [userId]
      );
      if (res.rows.length > 0) {
        user = res.rows[0];
        if (!localStore.users) localStore.users = [];
        if (!localStore.users.some((u) => u.id === user.id)) {
          localStore.users.push(user);
        }
        return user;
      }
    } catch (err) {
      console.warn('Auth user PostgreSQL lookup notice:', err.message);
    }
  }

  // 3. Supabase fallback
  try {
    const sb = getSupabase ? getSupabase() : null;
    if (sb) {
      const { data, error } = await sb
        .from('users')
        .select('id, email, name, role, is_verified, phone')
        .eq('id', userId)
        .maybeSingle();
      if (data && !error) {
        user = data;
        if (!localStore.users) localStore.users = [];
        if (!localStore.users.some((u) => u.id === user.id)) {
          localStore.users.push(user);
        }
        return user;
      }
    }
  } catch (_) {}

  return null;
}

/**
 * Verify JWT token from Authorization header and attach authenticated identity
 */
async function authenticateUser(req, res, next) {
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
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        error: 'Session expired or invalid token. Please log in again.'
      });
    }

    const user = await findUserById(decoded.id);
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
      role: user.role, // Always extracted from backend database, never trusted from client
      phone: user.phone || null
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
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      if (decoded && decoded.id) {
        const user = await findUserById(decoded.id);
        if (user) {
          req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            phone: user.phone || null
          };
        }
      }
    } catch (_) {
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
  requireRole,
  findUserById
};
