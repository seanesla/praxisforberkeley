import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/documents',
  '/chat',
  '/mindmaps',
  '/flashcards',
  '/profile',
  '/settings',
];

// Define auth routes that should redirect to dashboard if already authenticated
const authRoutes = ['/login', '/register', '/forgot-password'];

// Define public routes that don't require authentication
const publicRoutes = ['/', '/about', '/pricing', '/contact', '/demo', '/flashcards-demo', '/test-flashcards', '/flashcards-full-demo', '/flashcards-real-test', '/test-api', '/flashcards-auth-test'];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));
  const isAuthRoute = authRoutes.some(route => path.startsWith(route));
  const isPublicRoute = publicRoutes.some(route => path === route);

  // Get the token from cookies
  const token = request.cookies.get('token')?.value;

  // Redirect to login if accessing protected route without token
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', path);
    const response = NextResponse.redirect(loginUrl);
    // Clear any stale auth cookies
    response.cookies.delete('token');
    return response;
  }

  // Redirect to dashboard if accessing auth routes with valid token
  if (isAuthRoute && token && token.length > 20) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Content Security Policy
  const isDevelopment = process.env.NODE_ENV === 'development';
  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${isDevelopment ? '' : 'https://cdn.jsdelivr.net'}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'} https://api.anthropic.com`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', cspDirectives);
  
  return response;
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt (static files)
     * - public files with extensions
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|.*\\..*).*)',
  ],
};