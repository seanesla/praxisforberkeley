import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { SpacedRepetitionService } from '../services/spacedRepetition';
import { logger } from '../utils/logger';
import { validate } from '../middleware/validation';
import { spacedRepetitionSchemas } from '../validation/schemas';
import { standardLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * Get cards due for review
 */
router.get('/due', 
  authenticateToken,
  standardLimiter,
  validate(spacedRepetitionSchemas.getDueCards),
  async (req: AuthRequest, res: Response) => {
  try {
    const { set_id } = req.query;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cards = await SpacedRepetitionService.getDueCards(
      req.user.id,
      set_id as string
    );

    return res.json({ cards });
  } catch (error) {
    logger.error('Error getting due cards:', error);
    return res.status(500).json({ error: 'Failed to get due cards' });
  }
});

/**
 * Initialize study card for flashcard
 */
router.post('/initialize', 
  authenticateToken,
  standardLimiter,
  validate(spacedRepetitionSchemas.initializeCard),
  async (req: AuthRequest, res: Response) => {
  try {
    const { flashcard_id } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!flashcard_id) {
      return res.status(400).json({ error: 'Flashcard ID required' });
    }

    const studyCard = await SpacedRepetitionService.initializeStudyCard(
      flashcard_id,
      req.user.id
    );

    return res.json({ studyCard });
  } catch (error) {
    logger.error('Error initializing study card:', error);
    return res.status(500).json({ error: 'Failed to initialize study card' });
  }
});

/**
 * Create study session
 */
router.post('/session/start', 
  authenticateToken,
  standardLimiter,
  validate(spacedRepetitionSchemas.startSession),
  async (req: AuthRequest, res: Response) => {
  try {
    const { set_id } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const session = await SpacedRepetitionService.createStudySession(
      req.user.id,
      set_id
    );

    return res.json({ session });
  } catch (error) {
    logger.error('Error creating study session:', error);
    return res.status(500).json({ error: 'Failed to create study session' });
  }
});

/**
 * Record a card review
 */
router.post('/review', 
  authenticateToken,
  standardLimiter,
  validate(spacedRepetitionSchemas.reviewCard),
  async (req: AuthRequest, res: Response) => {
  try {
    const { study_card_id, quality, response_time, session_id } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!study_card_id || quality === undefined || !response_time) {
      return res.status(400).json({ 
        error: 'Study card ID, quality rating, and response time required' 
      });
    }

    if (quality < 0 || quality > 5) {
      return res.status(400).json({ 
        error: 'Quality must be between 0 and 5' 
      });
    }

    const result = await SpacedRepetitionService.recordReview(
      study_card_id,
      quality,
      response_time,
      session_id
    );

    return res.json({ 
      result,
      message: 'Review recorded successfully' 
    });
  } catch (error) {
    logger.error('Error recording review:', error);
    return res.status(500).json({ error: 'Failed to record review' });
  }
});

/**
 * Complete study session
 */
router.post('/session/complete', 
  authenticateToken,
  standardLimiter,
  validate(spacedRepetitionSchemas.completeSession),
  async (req: AuthRequest, res: Response) => {
  try {
    const { session_id, stats } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!session_id || !stats) {
      return res.status(400).json({ 
        error: 'Session ID and stats required' 
      });
    }

    await SpacedRepetitionService.completeStudySession(session_id, stats);

    return res.json({ 
      message: 'Session completed successfully' 
    });
  } catch (error) {
    logger.error('Error completing session:', error);
    return res.status(500).json({ error: 'Failed to complete session' });
  }
});

/**
 * Get study statistics
 */
router.get('/stats', 
  authenticateToken,
  standardLimiter,
  async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = await SpacedRepetitionService.getStudyStats(req.user.id);

    return res.json({ stats });
  } catch (error) {
    logger.error('Error getting study stats:', error);
    return res.status(500).json({ error: 'Failed to get study stats' });
  }
});

/**
 * Get study streak
 */
router.get('/streak', 
  authenticateToken,
  standardLimiter,
  async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await SpacedRepetitionService.updateStudyStreak(req.user.id);
    const stats = await SpacedRepetitionService.getStudyStats(req.user.id);

    return res.json({ 
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      totalDaysStudied: stats.totalDaysStudied
    });
  } catch (error) {
    logger.error('Error getting study streak:', error);
    return res.status(500).json({ error: 'Failed to get study streak' });
  }
});

/**
 * Initialize study cards for entire set
 */
router.post('/initialize-set', 
  authenticateToken,
  standardLimiter,
  validate(spacedRepetitionSchemas.initializeSet),
  async (req: AuthRequest, res: Response) => {
  try {
    const { set_id } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!set_id) {
      return res.status(400).json({ error: 'Set ID required' });
    }

    const count = await SpacedRepetitionService.initializeSetStudyCards(
      set_id,
      req.user.id
    );

    return res.json({ initialized: count });
  } catch (error) {
    logger.error('Error initializing set study cards:', error);
    return res.status(500).json({ error: 'Failed to initialize study cards' });
  }
});

/**
 * Get study heatmap data
 */
router.get('/heatmap', 
  authenticateToken,
  standardLimiter,
  async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const heatmapData = await SpacedRepetitionService.getHeatmapData(req.user.id);

    return res.json({ heatmapData });
  } catch (error) {
    logger.error('Error getting heatmap data:', error);
    return res.status(500).json({ error: 'Failed to get heatmap data' });
  }
});

/**
 * Get performance trends
 */
router.get('/trends', 
  authenticateToken,
  standardLimiter,
  validate(spacedRepetitionSchemas.getTrends),
  async (req: AuthRequest, res: Response) => {
  try {
    const { days = 30 } = req.query;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const trends = await SpacedRepetitionService.getPerformanceTrends(
      req.user.id,
      parseInt(days as string)
    );

    return res.json({ trends });
  } catch (error) {
    logger.error('Error getting performance trends:', error);
    return res.status(500).json({ error: 'Failed to get performance trends' });
  }
});

/**
 * Get review forecast
 */
router.get('/forecast', 
  authenticateToken,
  standardLimiter,
  validate(spacedRepetitionSchemas.getForecast),
  async (req: AuthRequest, res: Response) => {
  try {
    const { days = 7 } = req.query;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const forecast = await SpacedRepetitionService.getReviewForecast(
      req.user.id,
      parseInt(days as string)
    );

    return res.json({ forecast });
  } catch (error) {
    logger.error('Error getting review forecast:', error);
    return res.status(500).json({ error: 'Failed to get review forecast' });
  }
});

/**
 * Get difficulty distribution
 */
router.get('/difficulty-distribution', 
  authenticateToken,
  standardLimiter,
  async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const distribution = await SpacedRepetitionService.getDifficultyDistribution(req.user.id);

    return res.json({ distribution });
  } catch (error) {
    logger.error('Error getting difficulty distribution:', error);
    return res.status(500).json({ error: 'Failed to get difficulty distribution' });
  }
});

export default router;