import { verifyToken } from '@/lib/jwt';

/**
 * Extract and verify the authenticated user from a request's cookie.
 * Returns the JWT payload (with id, username, email, role) or null.
 */
export async function getUserFromRequest(request) {
  const token = request.cookies.get('token')?.value;
  if (!token) return null;
  return verifyToken(token);
}
