import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import logger from '../utils/logger';

export function validateBody<T>(schema: ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        logger.warn('Validation error:', { errors, body: req.body });
        
        return res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
      }
      
      logger.error('Unexpected validation error:', error);
      return res.status(500).json({
        error: 'Internal validation error',
      });
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = await schema.parseAsync(req.query);
      req.query = validated as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        logger.warn('Query validation error:', { errors, query: req.query });
        
        return res.status(400).json({
          error: 'Invalid query parameters',
          details: errors,
        });
      }
      
      logger.error('Unexpected query validation error:', error);
      return res.status(500).json({
        error: 'Internal validation error',
      });
    }
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = await schema.parseAsync(req.params);
      req.params = validated as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        logger.warn('Params validation error:', { errors, params: req.params });
        
        return res.status(400).json({
          error: 'Invalid URL parameters',
          details: errors,
        });
      }
      
      logger.error('Unexpected params validation error:', error);
      return res.status(500).json({
        error: 'Internal validation error',
      });
    }
  };
}