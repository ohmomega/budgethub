import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

export function signToken(payload) {
  if (!SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set.');
  }
  // Sign a JWT token, expiring in 7 days
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  if (!SECRET) return null;
  try {
    return jwt.verify(token, SECRET);
  } catch (error) {
    return null;
  }
}
