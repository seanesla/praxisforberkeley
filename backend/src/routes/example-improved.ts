/**
 * Example of an improved route file with all security and best practices applied
 * This file serves as a template for updating other route files
 */

import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';
import { standardLimiter, aiLimiter } from '../middleware/rateLimiter';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { supabase } from '../config/supabase';
import type { 
  ApiError, 
  ApiSuccess,
  SearchQuery,
  SearchResult,
  SearchResponse 
} from '../types/api';

const router = Router();

// Define schemas for this route
const searchSchema = z.object({
  query: z.string().trim().min(1).max(500),
  filters: z.object({
    category: z.string().optional(),
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }).optional(),
  }).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const createResourceSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  tags: z.array(z.string()).max(10).optional(),
  metadata: z.record(z.any()).optional(),
});

const updateResourceSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(10000).optional(),
  tags: z.array(z.string()).max(10).optional(),
  metadata: z.record(z.any()).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update",
});

const resourceIdSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Search resources with proper validation and rate limiting
 */
router.post(
  '/search',
  standardLimiter,
  authenticateToken,
  validateBody(searchSchema),
  async (req: AuthRequest, res: Response<SearchResponse | ApiError>) => {
    try {
      const { query, filters, limit } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED' 
        });
      }

      // Build the query with proper parameterization
      let dbQuery = supabase
        .from('resources')
        .select('*')
        .eq('user_id', req.user.id)
        .textSearch('content', query)
        .limit(limit);

      // Apply filters safely
      if (filters?.category) {
        dbQuery = dbQuery.eq('category', filters.category);
      }

      if (filters?.dateRange) {
        dbQuery = dbQuery
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end);
      }

      const { data, error, count } = await dbQuery;

      if (error) {
        logger.error('Search query failed:', error);
        return res.status(500).json({ 
          error: 'Search failed',
          code: 'SEARCH_ERROR' 
        });
      }

      // Transform results with proper typing
      const results: SearchResult[] = (data || []).map(item => ({
        id: item.id,
        type: 'resource',
        title: item.title,
        content: item.content,
        relevance_score: 1.0, // Would be calculated by search service
        highlights: [], // Would be populated by search service
        metadata: item.metadata || {},
      }));

      const response: SearchResponse = {
        results,
        total: count || results.length,
        search_time_ms: 0, // Would be measured
        query_expansion: [],
      };

      return res.json(response);
    } catch (error) {
      logger.error('Unexpected error in search:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR' 
      });
    }
  }
);

/**
 * Create a new resource with AI processing
 */
router.post(
  '/resources',
  aiLimiter, // Strict rate limit for AI operations
  authenticateToken,
  validateBody(createResourceSchema),
  async (req: AuthRequest, res: Response<ApiSuccess | ApiError>) => {
    try {
      const { title, content, tags, metadata } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED' 
        });
      }

      // Start a transaction
      const { data: resource, error } = await supabase
        .from('resources')
        .insert({
          user_id: req.user.id,
          title,
          content,
          tags: tags || [],
          metadata: metadata || {},
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create resource:', error);
        return res.status(500).json({ 
          error: 'Failed to create resource',
          code: 'CREATE_FAILED' 
        });
      }

      // Log the action for analytics
      await supabase.from('analytics_events').insert({
        user_id: req.user.id,
        event_type: 'resource_created',
        event_category: 'resources',
        metadata: { resource_id: resource.id },
      });

      return res.status(201).json({
        data: resource,
        message: 'Resource created successfully',
      });
    } catch (error) {
      logger.error('Unexpected error creating resource:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR' 
      });
    }
  }
);

/**
 * Update a resource with proper validation
 */
router.put(
  '/resources/:id',
  standardLimiter,
  authenticateToken,
  validateParams(resourceIdSchema),
  validateBody(updateResourceSchema),
  async (req: AuthRequest, res: Response<ApiSuccess | ApiError>) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED' 
        });
      }

      // Verify ownership before update
      const { data: existing, error: fetchError } = await supabase
        .from('resources')
        .select('id')
        .eq('id', id)
        .eq('user_id', req.user.id)
        .single();

      if (fetchError || !existing) {
        return res.status(404).json({ 
          error: 'Resource not found',
          code: 'NOT_FOUND' 
        });
      }

      // Perform the update
      const { data: updated, error: updateError } = await supabase
        .from('resources')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', req.user.id)
        .select()
        .single();

      if (updateError) {
        logger.error('Failed to update resource:', updateError);
        return res.status(500).json({ 
          error: 'Failed to update resource',
          code: 'UPDATE_FAILED' 
        });
      }

      return res.json({
        data: updated,
        message: 'Resource updated successfully',
      });
    } catch (error) {
      logger.error('Unexpected error updating resource:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR' 
      });
    }
  }
);

/**
 * Delete a resource with proper authorization
 */
router.delete(
  '/resources/:id',
  standardLimiter,
  authenticateToken,
  validateParams(resourceIdSchema),
  async (req: AuthRequest, res: Response<ApiSuccess | ApiError>) => {
    try {
      const { id } = req.params;
      
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED' 
        });
      }

      // Delete with ownership check
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id)
        .eq('user_id', req.user.id);

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ 
            error: 'Resource not found',
            code: 'NOT_FOUND' 
          });
        }
        
        logger.error('Failed to delete resource:', error);
        return res.status(500).json({ 
          error: 'Failed to delete resource',
          code: 'DELETE_FAILED' 
        });
      }

      return res.json({
        message: 'Resource deleted successfully',
      });
    } catch (error) {
      logger.error('Unexpected error deleting resource:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR' 
      });
    }
  }
);

/**
 * Get resource statistics
 */
router.get(
  '/resources/stats',
  standardLimiter,
  authenticateToken,
  async (req: AuthRequest, res: Response<ApiSuccess | ApiError>) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED' 
        });
      }

      // Use a database function or aggregation query
      const { data, error } = await supabase
        .rpc('get_resource_stats', { user_id: req.user.id });

      if (error) {
        logger.error('Failed to get resource stats:', error);
        return res.status(500).json({ 
          error: 'Failed to get statistics',
          code: 'STATS_ERROR' 
        });
      }

      return res.json({
        data,
        metadata: {
          generated_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Unexpected error getting stats:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR' 
      });
    }
  }
);

export default router;