import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { aiLimiter, standardLimiter } from '../middleware/rateLimiter';
import { ExerciseEngineService } from '../services/exerciseEngine';
import logger from '../utils/logger';
import { generateExercisesSchema, createExerciseSetSchema, submitAttemptSchema } from '../validation/schemas';
import { supabase } from '../config/supabase';

const router = Router();

/**
 * Generate exercises from document
 */
router.post(
  '/generate',
  aiLimiter,
  authenticateToken,
  validateBody(generateExercisesSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { document_id, count = 10, exercise_types } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

    const exercises = await ExerciseEngineService.generateExercises(
      document_id,
      req.user.id,
      count,
      exercise_types
    );

    return res.json({ exercises });
  } catch (error) {
    logger.error('Error generating exercises:', error);
    return res.status(500).json({ error: 'Failed to generate exercises' });
  }
});

/**
 * Create exercise set
 */
router.post(
  '/sets',
  standardLimiter,
  authenticateToken,
  validateBody(createExerciseSetSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { title, description, document_id, exercises } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

    const set = await ExerciseEngineService.createExerciseSet(
      req.user.id,
      title,
      description,
      document_id,
      exercises
    );

    return res.json({ set });
  } catch (error) {
    logger.error('Error creating exercise set:', error);
    return res.status(500).json({ error: 'Failed to create exercise set' });
  }
});

/**
 * Get exercise sets
 */
router.get('/sets', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: sets, error } = await supabase
      .from('exercise_sets')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({ sets });
  } catch (error) {
    logger.error('Error getting exercise sets:', error);
    return res.status(500).json({ error: 'Failed to get exercise sets' });
  }
});

/**
 * Get exercises for a set
 */
router.get('/sets/:setId/exercises', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { setId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify set ownership
    const { data: set, error: setError } = await supabase
      .from('exercise_sets')
      .select('*')
      .eq('id', setId)
      .eq('user_id', req.user.id)
      .single();

    if (setError || !set) {
      return res.status(404).json({ error: 'Exercise set not found' });
    }

    // Get exercises
    const { data: exercises, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('set_id', setId)
      .order('order_index', { ascending: true });

    if (error) throw error;

    return res.json({ exercises });
  } catch (error) {
    logger.error('Error getting exercises:', error);
    return res.status(500).json({ error: 'Failed to get exercises' });
  }
});

/**
 * Start exercise session
 */
router.post('/sessions/start', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { set_id, session_type = 'practice' } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!set_id) {
      return res.status(400).json({ error: 'Set ID required' });
    }

    const { data: session, error } = await supabase
      .from('exercise_sessions')
      .insert({
        user_id: req.user.id,
        set_id,
        session_type,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;

    return res.json({ session });
  } catch (error) {
    logger.error('Error starting exercise session:', error);
    return res.status(500).json({ error: 'Failed to start exercise session' });
  }
});

/**
 * Submit exercise attempt
 */
router.post(
  '/attempt',
  standardLimiter,
  authenticateToken,
  validateBody(submitAttemptSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { exercise_id, user_answer, session_id, time_taken } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

    const result = await ExerciseEngineService.evaluateAttempt(
      exercise_id,
      req.user.id,
      user_answer,
      session_id
    );

    // Update session if provided
    if (session_id && time_taken) {
      await supabase
        .from('exercise_sessions')
        .update({
          completed_exercises: supabase.sql`completed_exercises + 1`,
          correct_answers: result.evaluation.isCorrect ? 
            supabase.sql`correct_answers + 1` : supabase.sql`correct_answers`
        })
        .eq('id', session_id);
    }

    return res.json(result);
  } catch (error) {
    logger.error('Error submitting exercise attempt:', error);
    return res.status(500).json({ error: 'Failed to submit attempt' });
  }
});

/**
 * Complete exercise session
 */
router.post('/sessions/:sessionId/complete', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('exercise_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', req.user.id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Calculate final stats
    const percentage = session.total_exercises > 0 ? 
      (session.correct_answers / session.total_exercises) * 100 : 0;

    // Update session
    const { error } = await supabase
      .from('exercise_sessions')
      .update({
        completed_at: new Date().toISOString(),
        duration: Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000),
        percentage,
        score: session.correct_answers,
        max_score: session.total_exercises
      })
      .eq('id', sessionId);

    if (error) throw error;

    return res.json({ 
      message: 'Session completed successfully',
      stats: {
        correct: session.correct_answers,
        total: session.total_exercises,
        percentage
      }
    });
  } catch (error) {
    logger.error('Error completing session:', error);
    return res.status(500).json({ error: 'Failed to complete session' });
  }
});

/**
 * Get exercise analytics
 */
router.get('/analytics', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: analytics, error } = await supabase
      .from('exercise_analytics')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return res.json({ analytics: analytics || {} });
  } catch (error) {
    logger.error('Error getting exercise analytics:', error);
    return res.status(500).json({ error: 'Failed to get analytics' });
  }
});

/**
 * Get exercise templates
 */
router.get('/templates', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { data: templates, error } = await supabase
      .from('exercise_templates')
      .select('*')
      .eq('active', true)
      .order('template_type', { ascending: true });

    if (error) throw error;

    return res.json({ templates });
  } catch (error) {
    logger.error('Error getting exercise templates:', error);
    return res.status(500).json({ error: 'Failed to get templates' });
  }
});

export default router;