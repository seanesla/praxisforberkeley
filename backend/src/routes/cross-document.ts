import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { CrossDocumentInsightsService } from '../services/crossDocumentInsights';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Analyze relationships between documents
 */
router.post('/analyze', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { document_ids, analysis_types } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!document_ids || !Array.isArray(document_ids) || document_ids.length < 2) {
      return res.status(400).json({ error: 'At least 2 document IDs required' });
    }

    const analysis = await CrossDocumentInsightsService.analyzeDocumentSet(
      document_ids,
      req.user.id,
      analysis_types
    );

    return res.json({ analysis });
  } catch (error) {
    logger.error('Error analyzing documents:', error);
    return res.status(500).json({ error: 'Failed to analyze documents' });
  }
});

/**
 * Get cross-document insights
 */
router.get('/insights', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { category, limit = 20 } = req.query;

    const insights = await CrossDocumentInsightsService.getInsights(
      req.user.id,
      {
        category: category as string,
        limit: Number(limit)
      }
    );

    return res.json({ insights });
  } catch (error) {
    logger.error('Error getting insights:', error);
    return res.status(500).json({ error: 'Failed to get insights' });
  }
});

/**
 * Get pattern analysis across documents
 */
router.get('/patterns', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { pattern_type, min_frequency = 2 } = req.query;

    const patterns = await CrossDocumentInsightsService.detectPatterns(
      req.user.id,
      {
        patternType: pattern_type as string,
        minFrequency: Number(min_frequency)
      }
    );

    return res.json({ patterns });
  } catch (error) {
    logger.error('Error detecting patterns:', error);
    return res.status(500).json({ error: 'Failed to detect patterns' });
  }
});

/**
 * Extract common themes
 */
router.post('/themes', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { document_ids, max_themes = 10 } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let targetDocumentIds = document_ids;
    
    // If no document IDs provided, analyze all user documents
    if (!targetDocumentIds || targetDocumentIds.length === 0) {
      const allDocs = await CrossDocumentInsightsService.getUserDocumentIds(req.user.id);
      targetDocumentIds = allDocs;
    }

    const themes = await CrossDocumentInsightsService.extractThemes(
      targetDocumentIds,
      req.user.id,
      Number(max_themes)
    );

    return res.json({ themes });
  } catch (error) {
    logger.error('Error extracting themes:', error);
    return res.status(500).json({ error: 'Failed to extract themes' });
  }
});

/**
 * Get concept evolution across documents
 */
router.get('/concept-evolution', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { concept, start_date, end_date } = req.query;

    if (!concept) {
      return res.status(400).json({ error: 'Concept parameter required' });
    }

    const evolution = await CrossDocumentInsightsService.trackConceptEvolution(
      req.user.id,
      concept as string,
      {
        startDate: start_date ? new Date(start_date as string) : undefined,
        endDate: end_date ? new Date(end_date as string) : undefined
      }
    );

    return res.json({ evolution });
  } catch (error) {
    logger.error('Error tracking concept evolution:', error);
    return res.status(500).json({ error: 'Failed to track concept evolution' });
  }
});

/**
 * Get contradiction analysis
 */
router.post('/contradictions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { document_ids } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const contradictions = await CrossDocumentInsightsService.findContradictions(
      document_ids || [],
      req.user.id
    );

    return res.json({ contradictions });
  } catch (error) {
    logger.error('Error finding contradictions:', error);
    return res.status(500).json({ error: 'Failed to find contradictions' });
  }
});

/**
 * Get knowledge graph
 */
router.get('/knowledge-graph', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { depth = 2, focus_concepts } = req.query;

    const graph = await CrossDocumentInsightsService.buildKnowledgeGraph(
      req.user.id,
      {
        depth: Number(depth),
        focusConcepts: focus_concepts ? (focus_concepts as string).split(',') : undefined
      }
    );

    return res.json({ graph });
  } catch (error) {
    logger.error('Error building knowledge graph:', error);
    return res.status(500).json({ error: 'Failed to build knowledge graph' });
  }
});

/**
 * Get document timeline
 */
router.get('/timeline', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { group_by = 'month' } = req.query;

    const timeline = await CrossDocumentInsightsService.getDocumentTimeline(
      req.user.id,
      group_by as 'day' | 'week' | 'month' | 'year'
    );

    return res.json({ timeline });
  } catch (error) {
    logger.error('Error getting document timeline:', error);
    return res.status(500).json({ error: 'Failed to get document timeline' });
  }
});

/**
 * Generate synthesis report
 */
router.post('/synthesis', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { document_ids, focus_areas, output_format = 'markdown' } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!document_ids || document_ids.length === 0) {
      return res.status(400).json({ error: 'Document IDs required' });
    }

    const synthesis = await CrossDocumentInsightsService.generateSynthesis(
      document_ids,
      req.user.id,
      {
        focusAreas: focus_areas,
        outputFormat: output_format
      }
    );

    return res.json({ synthesis });
  } catch (error) {
    logger.error('Error generating synthesis:', error);
    return res.status(500).json({ error: 'Failed to generate synthesis' });
  }
});

/**
 * Get research gaps
 */
router.post('/research-gaps', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { document_ids, domain } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const gaps = await CrossDocumentInsightsService.identifyResearchGaps(
      document_ids || [],
      req.user.id,
      domain
    );

    return res.json({ gaps });
  } catch (error) {
    logger.error('Error identifying research gaps:', error);
    return res.status(500).json({ error: 'Failed to identify research gaps' });
  }
});

export default router;