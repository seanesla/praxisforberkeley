import helmet from 'helmet';
import { Express } from 'express';

export const securityConfig = {
  // Request size limits
  requestLimits: {
    json: '10mb',
    urlencoded: '10mb',
    raw: '20mb',
    text: '1mb',
  },
  
  // File upload limits
  uploadLimits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10, // Max files per request
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'image/jpeg',
      'image/png',
      'image/gif',
    ],
  },
  
  // CORS settings
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // 24 hours
  },
  
  // Session settings
  session: {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict' as const,
    },
  },
};

export function configureSecurityMiddleware(app: Express) {
  // Helmet for security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));
  
  // Additional security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  });
}

// Sanitize file paths to prevent directory traversal
export function sanitizeFilePath(filePath: string): string {
  // Remove any directory traversal attempts
  const sanitized = filePath
    .split('/')
    .filter(segment => segment !== '..' && segment !== '.')
    .join('/');
  
  // Remove any null bytes
  return sanitized.replace(/\0/g, '');
}

// Validate file type
export function isAllowedFileType(mimeType: string): boolean {
  return securityConfig.uploadLimits.allowedMimeTypes.includes(mimeType);
}

// Generate secure random tokens
export function generateSecureToken(length: number = 32): string {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
}