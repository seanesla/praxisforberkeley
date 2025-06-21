import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

// Common validation schemas
export const schemas = {
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).max(128).required(),
  uuid: Joi.string().uuid({ version: 'uuidv4' }),
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort_by: Joi.string().optional(),
    sort_order: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

// Auth validation schemas
export const authSchemas = {
  register: Joi.object({
    email: schemas.email,
    password: schemas.password,
    name: Joi.string().min(2).max(100).optional(),
  }),
  
  login: Joi.object({
    email: schemas.email,
    password: schemas.password,
  }),
  
  refreshToken: Joi.object({
    refresh_token: Joi.string().required(),
  }),
};

// Validation middleware factory
export function validate(schema: Joi.ObjectSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = await schema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });
      
      // Replace request body with validated data
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof Joi.ValidationError) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));
        
        res.status(400).json({
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors,
          },
        });
        return;
      }
      
      next(error);
    }
  };
}

// Query validation middleware
export function validateQuery(schema: Joi.ObjectSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = await schema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true,
      });
      
      // Replace request query with validated data
      req.query = validated;
      next();
    } catch (error) {
      if (error instanceof Joi.ValidationError) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));
        
        res.status(400).json({
          error: {
            message: 'Invalid query parameters',
            code: 'VALIDATION_ERROR',
            details: errors,
          },
        });
        return;
      }
      
      next(error);
    }
  };
}