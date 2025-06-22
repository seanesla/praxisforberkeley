import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { KnowledgeGapService } from '../services/knowledgeGap';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Detect knowledge gaps for user
 */
router.get('/detect', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const gaps = await KnowledgeGapService.detectGaps(req.user.id);

    return res.json({ gaps });
  } catch (error) {
    logger.error('Error detecting knowledge gaps:', error);
    return res.status(500).json({ error: 'Failed to detect knowledge gaps' });
  }
});

/**
 * Extract concepts from document
 */
router.post('/extract-concepts', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { document_id } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!document_id) {
      return res.status(400).json({ error: 'Document ID required' });
    }

    const concepts = await KnowledgeGapService.extractConcepts(
      document_id,
      req.user.id
    );

    return res.json({ concepts });
  } catch (error) {
    logger.error('Error extracting concepts:', error);
    return res.status(500).json({ error: 'Failed to extract concepts' });
  }
});

/**
 * Update concept mastery
 */
router.post('/update-mastery', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { concept, mastery_level, source } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!concept || mastery_level === undefined) {
      return res.status(400).json({ error: 'Concept and mastery level required' });
    }

    if (mastery_level < 0 || mastery_level > 1) {
      return res.status(400).json({ error: 'Mastery level must be between 0 and 1' });
    }

    await KnowledgeGapService.updateConceptMastery(
      req.user.id,
      concept,
      mastery_level,
      source
    );

    return res.json({ message: 'Concept mastery updated successfully' });
  } catch (error) {
    logger.error('Error updating concept mastery:', error);
    return res.status(500).json({ error: 'Failed to update concept mastery' });
  }
});

/**
 * Generate learning path
 */
router.post('/learning-path', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { gap_ids, preferences } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!gap_ids || !Array.isArray(gap_ids) || gap_ids.length === 0) {
      return res.status(400).json({ error: 'Gap IDs required' });
    }

    const learningPath = await KnowledgeGapService.generateLearningPath(
      req.user.id,
      gap_ids,
      preferences
    );

    return res.json({ learningPath });
  } catch (error) {
    logger.error('Error generating learning path:', error);
    return res.status(500).json({ error: 'Failed to generate learning path' });
  }
});

/**
 * Get learning progress
 */
router.get('/progress', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const progress = await KnowledgeGapService.getLearningProgress(req.user.id);

    return res.json({ progress });
  } catch (error) {
    logger.error('Error getting learning progress:', error);
    return res.status(500).json({ error: 'Failed to get learning progress' });
  }
});

/**
 * Resolve a knowledge gap
 */
router.post('/resolve', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { gap_id, resolution_notes } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!gap_id) {
      return res.status(400).json({ error: 'Gap ID required' });
    }

    await KnowledgeGapService.resolveGap(
      gap_id,
      req.user.id,
      resolution_notes
    );

    return res.json({ message: 'Knowledge gap resolved successfully' });
  } catch (error) {
    logger.error('Error resolving knowledge gap:', error);
    return res.status(500).json({ error: 'Failed to resolve knowledge gap' });
  }
});

/**
 * Get recommendations for a concept
 */
router.get('/recommendations/:concept', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { concept } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const recommendations = await KnowledgeGapService.getRecommendations(
      req.user.id,
      concept
    );

    return res.json({ recommendations });
  } catch (error) {
    logger.error('Error getting recommendations:', error);
    return res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

/**
 * Analyze learning patterns
 */
router.get('/learning-patterns', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const gaps = await KnowledgeGapService.detectGaps(req.user.id);
    
    // Analyze patterns
    const patterns = {
      totalGaps: gaps.length,
      severityDistribution: {
        high: gaps.filter(g => g.severity > 0.7).length,
        medium: gaps.filter(g => g.severity > 0.4 && g.severity <= 0.7).length,
        low: gaps.filter(g => g.severity <= 0.4).length
      },
      typeDistribution: gaps.reduce((acc, gap) => {
        acc[gap.type] = (acc[gap.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      topConcepts: gaps
        .sort((a, b) => b.severity - a.severity)
        .slice(0, 5)
        .map(g => ({
          concept: g.concept,
          severity: g.severity,
          type: g.type
        }))
    };

    return res.json({ patterns });
  } catch (error) {
    logger.error('Error analyzing learning patterns:', error);
    return res.status(500).json({ error: 'Failed to analyze learning patterns' });
  }
});

export default router;