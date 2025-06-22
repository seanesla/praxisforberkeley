import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Standard rate limiter for general API endpoints
export const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for AI/resource-intensive operations
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 AI requests per windowMs
  message: 'Too many AI requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// Very strict rate limiter for report generation
export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 reports per hour
  message: 'Report generation limit exceeded, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth rate limiter to prevent brute force
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 failed auth attempts per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful auth
});

// File upload rate limiter
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 uploads per windowMs
  message: 'Too many file uploads, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Search rate limiter
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 searches per minute
  message: 'Too many search requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Dynamic rate limiter based on user tier (example)
export const createUserTierLimiter = (tier: 'free' | 'premium' | 'enterprise') => {
  const limits = {
    free: { windowMs: 15 * 60 * 1000, max: 50 },
    premium: { windowMs: 15 * 60 * 1000, max: 200 },
    enterprise: { windowMs: 15 * 60 * 1000, max: 1000 },
  };

  const config = limits[tier] || limits.free;

  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: `Rate limit exceeded for ${tier} tier.`,
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Custom key generator for authenticated users
export const authenticatedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise use IP
    return (req as any).user?.id || req.ip;
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});