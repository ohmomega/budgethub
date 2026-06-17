import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Encode the secret for jose (Edge-compatible JWT library)
const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || '');

async function verifyJwtPayload(token) {
  try {
    if (!process.env.JWT_SECRET) return null;
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Allow system files and auth API routes to pass through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Retrieve token cookie
  const token = request.cookies.get('token')?.value;

  // Protect pages under dashboard, periods, and admin, plus general API routes
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/periods') ||
    pathname.startsWith('/admin') ||
    (pathname.startsWith('/api') && !pathname.startsWith('/api/auth'));

  const isCostCentersAdmin =
    pathname.startsWith('/api/cost-centers') && request.method !== 'GET';

  // Ensure admin page routes and admin-related api routes are restricted
  const isAdminRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/users') ||
    isCostCentersAdmin;

  if (isProtectedRoute) {
    if (!token) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const payload = await verifyJwtPayload(token);
    if (!payload) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 401 });
      }
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('token');
      return response;
    }

    // Enforce role check
    if (isAdminRoute && payload.role !== 'admin') {
      if (pathname.startsWith('/api')) {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Redirect logged-in users away from the login page
  if (pathname === '/login' && token) {
    const payload = await verifyJwtPayload(token);
    if (payload) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
