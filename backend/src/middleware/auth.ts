import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import logger from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      res.status(401).json({
        error: {
          message: 'Access token required',
          code: 'AUTH_TOKEN_MISSING',
        },
      });
      return;
    }

    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn(`Invalid token attempt: ${error?.message || 'No user found'}`);
      res.status(403).json({
        error: {
          message: 'Invalid or expired token',
          code: 'AUTH_TOKEN_INVALID',
        },
      });
      return;
    }

    // Attach user to request
    (req as AuthRequest).user = {
      id: user.id,
      email: user.email!,
    };

    // Log successful authentication in debug mode
    logger.debug(`User ${user.email} authenticated successfully`);

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      error: {
        message: 'Authentication failed',
        code: 'AUTH_INTERNAL_ERROR',
      },
    });
  }
}

// Optional auth middleware - doesn't fail if no token
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      next();
      return;
    }

    const { data: { user } } = await supabase.auth.getUser(token);

    if (user) {
      (req as AuthRequest).user = {
        id: user.id,
        email: user.email!,
      };
    }

    next();
  } catch (error) {
    // Log error but continue - this is optional auth
    logger.debug('Optional auth error (continuing):', error);
    next();
  }
}

// Admin auth middleware
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authReq = req as AuthRequest;
  
  if (!authReq.user) {
    res.status(401).json({
      error: {
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      },
    });
    return;
  }

  // Check if user is admin (you'll need to implement this based on your schema)
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', authReq.user.id)
      .eq('role', 'admin')
      .single();

    if (error || !data) {
      logger.warn(`Unauthorized admin access attempt by user ${authReq.user.email}`);
      res.status(403).json({
        error: {
          message: 'Admin access required',
          code: 'AUTH_INSUFFICIENT_PRIVILEGES',
        },
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Admin auth check error:', error);
    res.status(500).json({
      error: {
        message: 'Authorization check failed',
        code: 'AUTH_CHECK_FAILED',
      },
    });
  }
}

// Socket.io authentication helper
export async function authenticateSocketToken(token: string): Promise<{ id: string; email: string } | null> {
  try {
    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn(`Invalid socket token attempt: ${error?.message || 'No user found'}`);
      return null;
    }

    return {
      id: user.id,
      email: user.email!,
    };
  } catch (error) {
    logger.error('Socket auth error:', error);
    return null;
  }
}