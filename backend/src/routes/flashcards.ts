import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { FlashcardService } from '../services/flashcardService';
import { AuthRequest } from '../types/express';
import { logger } from '../utils/logger';

const router = express.Router();

// Get all flashcards for a user
router.get('/', authenticateToken as any, async (req: AuthRequest, res): Promise<void> => {
  logger.info('[FLASHCARDS] Fetching flashcards');
  
  try {
    const userId = req.user.id;
    const { document_id, limit = 50, offset = 0 } = req.query;
    
    let query = supabase
      .from('flashcards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);
    
    if (document_id) {
      query = query.eq('document_id', document_id);
    }
    
    const { data, error } = await query;
    
    if (error) {
      logger.error('[FLASHCARDS] Database error:', error);
      res.status(500).json({ error: 'Failed to fetch flashcards' });
      return;
    }
    
    logger.info(`[FLASHCARDS] Found ${data?.length || 0} flashcards`);
    res.json({ flashcards: data || [] });
  } catch (error) {
    logger.error('[FLASHCARDS] Error:', error);
    res.status(500).json({ error: 'Failed to fetch flashcards' });
  }
});

// Generate flashcards from document
router.post('/generate/:documentId', authenticateToken as any, async (req: AuthRequest, res): Promise<void> => {
  logger.info('[FLASHCARDS] Generating flashcards from document');
  
  try {
    const userId = req.user.id;
    const { documentId } = req.params;
    const { numCards = 10 } = req.body;
    
    // Verify document ownership
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, title, content')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();
    
    if (docError || !document) {
      logger.error('[FLASHCARDS] Document not found:', docError);
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    
    // Generate flashcards using FlashcardService
    const flashcards = await FlashcardService.generateFlashcards(
      userId,
      documentId,
      document.content || '',
      document.title,
      { count: numCards }
    );
    
    logger.info('Flashcards generated successfully', { count: flashcards.length });
    res.json({ 
      flashcards,
      documentId,
      documentTitle: document.title,
    });
  } catch (error) {
    logger.error('[FLASHCARDS] Generation error:', error);
    res.status(500).json({ error: 'Failed to generate flashcards' });
  }
});

// Update flashcard (for spaced repetition tracking)
router.put('/:id', authenticateToken as any, async (req: AuthRequest, res): Promise<void> => {
  logger.info('[FLASHCARDS] Updating flashcard');
  
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { difficulty_rating, review_date } = req.body;
    
    // Verify ownership
    const { data: flashcard, error: fetchError } = await supabase
      .from('flashcards')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (fetchError || !flashcard) {
      logger.error('[FLASHCARDS] Flashcard not found:', fetchError);
      res.status(404).json({ error: 'Flashcard not found' });
      return;
    }
    
    // Update using SM-2 algorithm
    const quality = difficulty_rating ? 
      (difficulty_rating === 'easy' ? 5 : difficulty_rating === 'hard' ? 2 : 3) : 3;
    
    const progress = await FlashcardService.updateFlashcardProgress(
      userId,
      id,
      quality
    );
    
    logger.info('Flashcard progress updated', { flashcardId: id });
    res.json({ progress });
  } catch (error) {
    logger.error('[FLASHCARDS] Update error:', error);
    res.status(500).json({ error: 'Failed to update flashcard' });
  }
});

// Delete flashcard
router.delete('/:id', authenticateToken as any, async (req: AuthRequest, res): Promise<void> => {
  logger.info('[FLASHCARDS] Deleting flashcard');
  
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const { error } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) {
      logger.error('[FLASHCARDS] Delete error:', error);
      res.status(500).json({ error: 'Failed to delete flashcard' });
      return;
    }
    
    logger.info('[FLASHCARDS] Flashcard deleted successfully');
    res.json({ message: 'Flashcard deleted successfully' });
  } catch (error) {
    logger.error('[FLASHCARDS] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete flashcard' });
  }
});

// Get due flashcards for review
router.get('/due', authenticateToken as any, async (req: AuthRequest, res): Promise<void> => {
  logger.info('Fetching due flashcards', { userId: req.user.id });
  
  try {
    const userId = req.user.id;
    const { limit = 20 } = req.query;
    
    const dueFlashcards = await FlashcardService.getDueFlashcards(userId, Number(limit));
    
    res.json({ flashcards: dueFlashcards });
  } catch (error) {
    logger.error('Error fetching due flashcards', error);
    res.status(500).json({ error: 'Failed to fetch due flashcards' });
  }
});

// Create study session
router.post('/study-session', authenticateToken as any, async (req: AuthRequest, res): Promise<void> => {
  logger.info('Creating study session');
  
  try {
    const userId = req.user.id;
    const { flashcard_ids } = req.body;
    
    if (!flashcard_ids || !Array.isArray(flashcard_ids)) {
      res.status(400).json({ error: 'flashcard_ids array is required' });
      return;
    }
    
    const session = await FlashcardService.createStudySession(userId, flashcard_ids);
    
    res.json({ session });
  } catch (error) {
    logger.error('Error creating study session', error);
    res.status(500).json({ error: 'Failed to create study session' });
  }
});

// Get study statistics
router.get('/stats', authenticateToken as any, async (req: AuthRequest, res): Promise<void> => {
  logger.info('Fetching study statistics');
  
  try {
    const userId = req.user.id;
    const stats = await FlashcardService.getStudyStats(userId);
    
    res.json({ stats });
  } catch (error) {
    logger.error('Error fetching study statistics', error);
    res.status(500).json({ error: 'Failed to fetch study statistics' });
  }
});

export default router;