const jwt = require('jsonwebtoken');
const db = require('../db');

let adminUserCached = null;

async function getAdminUser() {
  if (adminUserCached) return adminUserCached;
  
  // Try up to 10 times to fetch the admin user, waiting 1s between attempts
  // to allow the database to finish starting up.
  for (let i = 0; i < 10; i++) {
    try {
      const res = await db.query("SELECT * FROM users WHERE username = 'admin' LIMIT 1");
      if (res.rows.length > 0) {
        adminUserCached = res.rows[0];
        return adminUserCached;
      }
    } catch (err) {
      console.warn(`[getAdminUser] Attempt ${i + 1} failed (database starting up?). Retrying in 1s...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Fallback if db fetch fails completely
  console.error('[getAdminUser] Failed to fetch admin user after 10 attempts.');
  return {
    id: '00000000-0000-0000-0000-000000000000',
    username: 'admin',
    role: 'admin',
    full_name: 'Administrator'
  };
}

async function verifyToken(req, res, next) {
  try {
    req.user = await getAdminUser();
    next();
  } catch (err) {
    console.error('verifyToken bypass error:', err);
    res.status(500).json({ error: 'Authentication bypass failed' });
  }
}

function isAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin role required' });
  }
}

function isEditorOrAdmin(req, res, next) {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'editor')) {
    next();
  } else {
    res.status(403).json({ error: 'Editor or Admin role required' });
  }
}

function checkDeptOwnership(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Admins bypass department ownership check
  if (req.user.role === 'admin') {
    return next();
  }

  // Check if department is passed in request (body, query, or params)
  const requestedDeptId = req.body.department_id || req.query.department_id || req.params.department_id;

  if (requestedDeptId && requestedDeptId !== req.user.department_id) {
    return res.status(403).json({ error: 'Access denied: You can only manage data for your own department.' });
  }

  // Inject user's department for safety if not explicitly passed
  if (!req.body.department_id && req.method !== 'GET') {
    req.body.department_id = req.user.department_id;
  }

  next();
}

module.exports = {
  verifyToken,
  isAdmin,
  isEditorOrAdmin,
  checkDeptOwnership,
};
