const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Generate access & refresh tokens
function generateTokens(user) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    department_id: user.department_id,
    full_name: user.full_name
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

  return { accessToken, refreshToken };
}

// @route   POST /api/auth/login
// @desc    Authenticate user and get tokens
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const userRes = await db.query(
      `SELECT u.*, d.dept_name, d.dept_code 
       FROM users u 
       LEFT JOIN departments d ON u.department_id = d.id 
       WHERE u.username = $1 AND u.is_active = true`,
      [username.trim()]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    // Update last login timestamp
    await db.query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);

    const { accessToken, refreshToken } = generateTokens(user);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
        email: user.email,
        department_id: user.department_id,
        department_name: user.dept_name,
        department_code: user.dept_code
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token using refresh token
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired refresh token' });
      }

      const userRes = await db.query(
        `SELECT u.*, d.dept_name, d.dept_code 
         FROM users u 
         LEFT JOIN departments d ON u.department_id = d.id 
         WHERE u.id = $1 AND u.is_active = true`,
        [decoded.id]
      );

      if (userRes.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userRes.rows[0];
      const tokens = generateTokens(user);

      res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken, // Optionally rotate refresh token
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          full_name: user.full_name,
          department_id: user.department_id,
          department_name: user.dept_name,
          department_code: user.dept_code
        }
      });
    });
  } catch (err) {
    console.error('Token refresh error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/auth/register
// @desc    Create a new user (Admin only)
router.post('/register', verifyToken, isAdmin, async (req, res) => {
  const { username, password, full_name, role, department_id, email } = req.body;

  if (!username || !password || !full_name || !role) {
    return res.status(400).json({ error: 'Please provide username, password, full name, and role' });
  }

  try {
    // Check if user exists
    const userExists = await db.query('SELECT id FROM users WHERE username = $1', [username.trim()]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await db.query(
      `INSERT INTO users (username, password_hash, full_name, role, department_id, email)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, full_name, role, department_id, email, created_at`,
      [username.trim(), passwordHash, full_name, role, department_id || null, email || null]
    );

    res.status(201).json(newUser.rows[0]);
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user details
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userRes = await db.query(
      `SELECT u.id, u.username, u.full_name, u.role, u.department_id, d.dept_name, d.dept_code
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(userRes.rows[0]);
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/auth/users
// @desc    Get all users (Admin only)
router.get('/users', verifyToken, isAdmin, async (req, res) => {
  try {
    const usersRes = await db.query(
      `SELECT u.id, u.username, u.full_name, u.email, u.role, u.department_id, u.is_active, u.created_at, u.last_login_at, d.dept_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       ORDER BY u.created_at DESC`
    );
    res.json(usersRes.rows);
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PATCH /api/auth/users/:id
// @desc    Update user details (Admin only)
router.patch('/users/:id', verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { full_name, role, department_id, is_active, password, email } = req.body;

  try {
    let query = 'UPDATE users SET ';
    const params = [];
    let paramIndex = 1;

    if (full_name !== undefined) {
      query += `full_name = $${paramIndex++}, `;
      params.push(full_name);
    }
    if (email !== undefined) {
      query += `email = $${paramIndex++}, `;
      params.push(email);
    }
    if (role !== undefined) {
      query += `role = $${paramIndex++}, `;
      params.push(role);
    }
    if (department_id !== undefined) {
      query += `department_id = $${paramIndex++}, `;
      params.push(department_id || null);
    }
    if (is_active !== undefined) {
      query += `is_active = $${paramIndex++}, `;
      params.push(is_active);
    }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      query += `password_hash = $${paramIndex++}, `;
      params.push(passwordHash);
    }

    // Remove trailing comma and space
    query = query.slice(0, -2);
    query += ` WHERE id = $${paramIndex} RETURNING id, username, full_name, role, department_id, email, is_active`;
    params.push(id);

    const updateRes = await db.query(query, params);
    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updateRes.rows[0]);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/auth/users/:id
// @desc    Delete a user (Admin only)
router.delete('/users/:id', verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;

  if (req.user.id === id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }

  try {
    const checkRes = await db.query('SELECT id FROM expense_entries WHERE created_by = $1 LIMIT 1', [id]);
    if (checkRes.rows.length > 0) {
      return res.status(400).json({ error: 'Cannot delete user: they have created budget entries' });
    }

    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully', id });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
