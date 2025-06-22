import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validation';
import { searchLimiter, standardLimiter } from '../middleware/rateLimiter';
import { SemanticSearch2Service } from '../services/semanticSearch2';
import logger from '../utils/logger';
import { searchSchema, saveSearchSchema } from '../validation/schemas';
import { generateFacetCounts } from '../utils/searchUtils';
import { supabase } from '../config/supabase';

const router = Router();

/**
 * Enhanced semantic search
 */
router.post(
  '/search',
  searchLimiter,
  authenticateToken,
  validateBody(searchSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { query, scope, filters, options } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const searchQuery = {
        text: query.trim(),
        scope: scope || ['documents', 'notes'],
        filters,
        options: {
          expandQuery: options?.expandQuery !== false, // Default true
          includeContext: options?.includeContext || false,
          minRelevance: options?.minRelevance || 0.5,
          maxResults: options?.maxResults || 20
        }
      };

    const results = await SemanticSearch2Service.search(req.user.id, searchQuery);

    return res.json(results);
  } catch (error) {
    logger.error('Error performing search:', error);
    return res.status(500).json({ error: 'Failed to perform search' });
  }
});

/**
 * Get search suggestions
 */
router.get('/suggestions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    const suggestions = await SemanticSearch2Service.getSearchSuggestions(
      req.user.id,
      q
    );

    return res.json({ suggestions });
  } catch (error) {
    logger.error('Error getting search suggestions:', error);
    return res.status(500).json({ error: 'Failed to get search suggestions' });
  }
});

/**
 * Analyze search effectiveness
 */
router.get('/effectiveness', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const effectiveness = await SemanticSearch2Service.analyzeSearchEffectiveness(
      req.user.id
    );

    return res.json({ effectiveness });
  } catch (error) {
    logger.error('Error analyzing search effectiveness:', error);
    return res.status(500).json({ error: 'Failed to analyze search effectiveness' });
  }
});

/**
 * Save search
 */
router.post(
  '/save',
  standardLimiter,
  authenticateToken,
  validateBody(saveSearchSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { query, name, filters } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

    const { data: savedSearch, error } = await supabase
      .from('saved_searches')
      .insert({
        user_id: req.user.id,
        name,
        query,
        filters,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return res.json({ savedSearch });
  } catch (error) {
    logger.error('Error saving search:', error);
    return res.status(500).json({ error: 'Failed to save search' });
  }
});

/**
 * Get saved searches
 */
router.get('/saved', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: savedSearches, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({ savedSearches });
  } catch (error) {
    logger.error('Error getting saved searches:', error);
    return res.status(500).json({ error: 'Failed to get saved searches' });
  }
});

/**
 * Delete saved search
 */
router.delete('/saved/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    return res.json({ message: 'Search deleted successfully' });
  } catch (error) {
    logger.error('Error deleting saved search:', error);
    return res.status(500).json({ error: 'Failed to delete saved search' });
  }
});

/**
 * Search trends
 */
router.get('/trends', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: recentQueries, error } = await supabase
      .from('search_queries')
      .select('query_text, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Analyze trends
    const termFrequency: Record<string, number> = {};
    const dailySearches: Record<string, number> = {};
    
    recentQueries?.forEach(query => {
      // Term frequency
      const terms = query.query_text.toLowerCase().split(/\s+/);
      terms.forEach(term => {
        if (term.length > 2) {
          termFrequency[term] = (termFrequency[term] || 0) + 1;
        }
      });
      
      // Daily searches
      const date = new Date(query.created_at).toDateString();
      dailySearches[date] = (dailySearches[date] || 0) + 1;
    });

    const trends = {
      topTerms: Object.entries(termFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([term, count]) => ({ term, count })),
      searchVolume: Object.entries(dailySearches)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      totalSearches: recentQueries?.length || 0
    };

    return res.json({ trends });
  } catch (error) {
    logger.error('Error getting search trends:', error);
    return res.status(500).json({ error: 'Failed to get search trends' });
  }
});

/**
 * Advanced search with facets
 */
router.post('/advanced', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { query, facets } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Build filters from facets
    const filters: any = {};
    
    if (facets?.dateRange) {
      filters.dateRange = facets.dateRange;
    }
    
    if (facets?.documentTypes?.length > 0) {
      filters.documentTypes = facets.documentTypes;
    }
    
    if (facets?.tags?.length > 0) {
      filters.tags = facets.tags;
    }
    
    if (facets?.authors?.length > 0) {
      filters.authors = facets.authors;
    }

    const searchQuery = {
      text: query || '*',
      scope: facets?.scope || ['documents', 'notes'],
      filters,
      options: {
        expandQuery: facets?.expandQuery !== false,
        includeContext: true,
        minRelevance: facets?.minRelevance || 0.3,
        maxResults: facets?.maxResults || 50
      }
    };

    const results = await SemanticSearch2Service.search(req.user.id, searchQuery);

    // Generate facet counts
    const facetCounts = await generateFacetCounts(results.results);

    return res.json({
      ...results,
      facets: facetCounts
    });
  } catch (error) {
    logger.error('Error performing advanced search:', error);
    return res.status(500).json({ error: 'Failed to perform advanced search' });
  }
});

// Helper function has been moved to utils/searchUtils.ts

export default router;