import express from 'express';
import rateLimit from 'express-rate-limit';
import Joi from 'joi';
import { supabase } from '../config/supabase';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validate, authSchemas, schemas } from '../utils/validation';
import logger from '../utils/logger';
import { AuthResponse, ErrorResponse } from '../types/auth';

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
router.use('/register', authLimiter);
router.use('/login', authLimiter);
router.use(generalLimiter);

// Register new user
router.post('/register', validate(authSchemas.register), async (req, res): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      res.status(409).json({
        error: {
          message: 'User with this email already exists',
          code: 'USER_EXISTS',
        },
      } as ErrorResponse);
      return;
    }

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      logger.error('Registration error:', error);
      res.status(400).json({
        error: {
          message: error.message,
          code: 'REGISTRATION_FAILED',
        },
      } as ErrorResponse);
      return;
    }

    if (!data.user) {
      res.status(500).json({
        error: {
          message: 'User creation failed',
          code: 'USER_CREATION_FAILED',
        },
      } as ErrorResponse);
      return;
    }

    // Create user profile in users table
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        email: data.user.email!,
        full_name: name || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (profileError) {
      logger.error('Failed to create user profile:', profileError);
      // Continue anyway - auth user exists
    }

    logger.info(`New user registered: ${email}`);
    
    res.status(201).json({
      user: {
        id: data.user.id,
        email: data.user.email!,
        created_at: data.user.created_at,
      },
      session: data.session ? {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at || Date.now() + 3600000,
      } : null,
    } as AuthResponse);
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      error: {
        message: 'Registration failed',
        code: 'INTERNAL_ERROR',
      },
    } as ErrorResponse);
  }
});

// Login
router.post('/login', validate(authSchemas.login), async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.warn(`Failed login attempt for email: ${email}`);
      res.status(401).json({
        error: {
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        },
      } as ErrorResponse);
      return;
    }

    if (!data.user || !data.session) {
      res.status(401).json({
        error: {
          message: 'Login failed',
          code: 'LOGIN_FAILED',
        },
      } as ErrorResponse);
      return;
    }

    logger.info(`User logged in: ${email}`);
    
    res.json({
      user: {
        id: data.user.id,
        email: data.user.email!,
        created_at: data.user.created_at,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at || Date.now() + 3600000,
      },
    } as AuthResponse);
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: {
        message: 'Login failed',
        code: 'INTERNAL_ERROR',
      },
    } as ErrorResponse);
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    
    if (!authReq.user) {
      res.status(401).json({ 
        error: { 
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        } 
      });
      return;
    }
    
    // Get full user data from database if needed
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authReq.user.id)
      .single();
    
    if (error || !userData) {
      // If no user profile exists, return basic auth data
      res.json({ 
        user: {
          id: authReq.user.id,
          email: authReq.user.email
        }
      });
      return;
    }
    
    res.json({ 
      user: {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        avatar_url: userData.avatar_url,
        created_at: userData.created_at
      }
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get user data',
        code: 'INTERNAL_ERROR',
      },
    } as ErrorResponse);
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (token) {
      // Attempt to sign out the session
      const { error } = await supabase.auth.admin.signOut(token);
      
      if (error) {
        logger.warn('Logout error:', error);
      }
    }

    logger.info(`User logged out: ${authReq.user?.email}`);
    res.json({ message: 'Logout successful' });
  } catch (error) {
    logger.error('Logout error:', error);
    // Even if logout fails on server, return success to clear client state
    res.json({ message: 'Logout successful' });
  }
});

// Refresh token
router.post('/refresh', async (req, res): Promise<void> => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      res.status(400).json({
        error: {
          message: 'Refresh token is required',
          code: 'REFRESH_TOKEN_REQUIRED'
        }
      } as ErrorResponse);
      return;
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error || !data.session) {
      logger.warn('Invalid refresh token attempt');
      res.status(401).json({
        error: {
          message: 'Invalid refresh token',
          code: 'INVALID_REFRESH_TOKEN'
        }
      } as ErrorResponse);
      return;
    }

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at || Date.now() + 3600000
    });
  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to refresh token',
        code: 'INTERNAL_ERROR'
      }
    } as ErrorResponse);
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  
  try {
    // Get additional user data if needed
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authReq.user!.id)
      .single();

    if (error) {
      logger.error('Error fetching user data:', error);
      res.status(500).json({
        error: {
          message: 'Failed to fetch user data',
          code: 'USER_FETCH_FAILED',
        },
      } as ErrorResponse);
      return;
    }

    res.json({
      user: userData || authReq.user,
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch user data',
        code: 'INTERNAL_ERROR',
      },
    } as ErrorResponse);
  }
});

// Refresh token
router.post('/refresh', validate(authSchemas.refreshToken), async (req, res): Promise<void> => {
  try {
    const { refresh_token } = req.body;

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error || !data.session) {
      logger.warn('Token refresh failed:', error);
      res.status(401).json({
        error: {
          message: 'Invalid refresh token',
          code: 'INVALID_REFRESH_TOKEN',
        },
      } as ErrorResponse);
      return;
    }

    res.json({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at || Date.now() + 3600000,
      },
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({
      error: {
        message: 'Token refresh failed',
        code: 'INTERNAL_ERROR',
      },
    } as ErrorResponse);
  }
});

// Request password reset
router.post('/forgot-password', validate(Joi.object({ email: schemas.email })), async (req, res): Promise<void> => {
  try {
    const { email } = req.body;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`,
    });

    if (error) {
      logger.error('Password reset error:', error);
      // Don't reveal whether email exists
      res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
      return;
    }

    logger.info(`Password reset requested for: ${email}`);
    res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
  } catch (error) {
    logger.error('Password reset error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to process password reset request',
        code: 'INTERNAL_ERROR',
      },
    } as ErrorResponse);
  }
});

// Update password
router.post('/update-password', authenticateToken, validate(Joi.object({
  current_password: schemas.password,
  new_password: schemas.password,
})), async (req, res): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const { current_password, new_password } = req.body;

    // Verify current password first
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authReq.user!.email,
      password: current_password,
    });

    if (signInError) {
      res.status(401).json({
        error: {
          message: 'Current password is incorrect',
          code: 'INVALID_CURRENT_PASSWORD',
        },
      } as ErrorResponse);
      return;
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
      password: new_password,
    });

    if (error) {
      logger.error('Password update error:', error);
      res.status(400).json({
        error: {
          message: error.message,
          code: 'PASSWORD_UPDATE_FAILED',
        },
      } as ErrorResponse);
      return;
    }

    logger.info(`Password updated for user: ${authReq.user!.email}`);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    logger.error('Password update error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to update password',
        code: 'INTERNAL_ERROR',
      },
    } as ErrorResponse);
  }
});

// Get API keys (masked)
router.get('/api-keys', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('api_keys')
      .eq('user_id', req.user!.id)
      .single();

    if (!userSettings || !userSettings.api_keys) {
      return res.json({ apiKeys: {} });
    }

    // Import at runtime to avoid circular dependency
    const { decrypt, maskApiKey } = await import('../utils/encryption');

    // Decrypt and mask keys for display
    const maskedKeys: Record<string, string> = {};
    for (const [provider, encryptedKey] of Object.entries(userSettings.api_keys)) {
      if (encryptedKey && typeof encryptedKey === 'string') {
        try {
          const decryptedKey = decrypt(encryptedKey);
          maskedKeys[provider] = maskApiKey(decryptedKey);
        } catch (error) {
          logger.error(`Failed to decrypt ${provider} key:`, error);
          maskedKeys[provider] = '***';
        }
      }
    }

    return res.json({ apiKeys: maskedKeys });
  } catch (error) {
    logger.error('Error fetching API keys:', error);
    return res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

// Update API keys (encrypted)
router.put('/api-keys', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const keysToUpdate = req.body;
    
    // Import at runtime to avoid circular dependency
    const { encrypt, validateApiKey } = await import('../utils/encryption');

    // Validate and encrypt keys
    const encryptedKeys: Record<string, string> = {};
    for (const [provider, apiKey] of Object.entries(keysToUpdate)) {
      if (typeof apiKey === 'string' && apiKey.trim() !== '') {
        // Validate key format
        if (!validateApiKey(provider, apiKey)) {
          return res.status(400).json({ 
            error: `Invalid ${provider} API key format` 
          });
        }
        
        // Encrypt the key
        encryptedKeys[provider] = encrypt(apiKey);
      }
    }

    // Get existing keys
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('api_keys')
      .eq('user_id', req.user!.id)
      .single();

    const existingKeys = userSettings?.api_keys || {};
    const updatedKeys = { ...existingKeys, ...encryptedKeys };

    // Upsert user settings
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: req.user!.id,
        api_keys: updatedKeys,
        updated_at: new Date().toISOString()
      });

    if (error) {
      logger.error('Error updating API keys:', error);
      return res.status(500).json({ error: 'Failed to update API keys' });
    }

    return res.json({ message: 'API keys updated successfully' });
  } catch (error) {
    logger.error('Error updating API keys:', error);
    return res.status(500).json({ error: 'Failed to update API keys' });
  }
});

export default router;