import { AIService } from './ai/aiService';
import { supabase } from '../config/supabase';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import {
  Flashcard,
  FlashcardMetadata,
  StudySession,
  StudyProgress,
  ReviewPerformance,
  CreateFlashcardsRequest,
  CreateFlashcardsResponse
} from '../types/ai-features';

/**
 * SM-2 Algorithm Implementation
 * E-Factor range: 1.3 to 2.5
 * Quality ratings: 0-5 (0-2 = fail, 3-5 = pass)
 */
interface SM2Result {
  interval: number; // Days until next review
  easeFactor: number; // Difficulty factor
  repetitions: number; // Number of successful repetitions
}

export class FlashcardService {
  /**
   * Generate flashcards from document content using AI
   */
  static async generateFlashcards(
    userId: string,
    documentId: string,
    content: string,
    title: string,
    options?: CreateFlashcardsRequest
  ): Promise<Flashcard[]> {
    logger.info('Generating flashcards from document', { userId, documentId, title });
    
    try {
      const count = options?.count || 10;
      const difficulty = options?.difficulty || 'medium';
      const type = options?.type || 'basic';
      
      // Generate flashcards based on type
      let flashcards: Flashcard[] = [];
      
      switch (type) {
        case 'basic':
          flashcards = await this.generateBasicFlashcards(userId, content, title, count, difficulty);
          break;
        case 'cloze':
          flashcards = await this.generateClozeFlashcards(userId, content, title, count, difficulty);
          break;
        case 'multi':
          flashcards = await this.generateMultiChoiceFlashcards(userId, content, title, count, difficulty);
          break;
        default:
          flashcards = await this.generateBasicFlashcards(userId, content, title, count, difficulty);
      }
      
      // Add document reference and metadata
      flashcards = flashcards.map(card => ({
        ...card,
        id: card.id || uuidv4(),
        user_id: userId,
        document_id: documentId,
        created_at: new Date().toISOString()
      }));
      
      // Save to database
      await this.saveFlashcards(flashcards);
      
      return flashcards;
    } catch (error) {
      logger.error('Error generating flashcards', { error, userId, documentId });
      throw error;
    }
  }
  
  /**
   * Generate basic Q&A flashcards
   */
  private static async generateBasicFlashcards(
    userId: string,
    content: string,
    title: string,
    count: number,
    difficulty: string
  ): Promise<Flashcard[]> {
    const prompt = `Generate ${count} flashcards from this document for ${difficulty} difficulty level.
    
    Document Title: ${title}
    Content: ${content.substring(0, 4000)}
    
    Requirements:
    1. Questions should test understanding, not just memorization
    2. Include a mix of factual and conceptual questions
    3. Answers should be concise but complete
    4. Difficulty level: ${difficulty}
    
    Format as JSON array: [{ 
      "question": "clear question", 
      "answer": "concise answer",
      "metadata": { 
        "difficulty": ${difficulty === 'easy' ? 0.3 : difficulty === 'hard' ? 0.8 : 0.5},
        "tags": ["topic1", "topic2"],
        "source": "specific section or concept from document"
      }
    }]`;
    
    try {
      const response = await AIService.generateResponse(userId, {
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert educator creating effective flashcards for spaced repetition learning.' 
          },
          { role: 'user', content: prompt }
        ]
      });
      
      if (!response || !response.content) {
        logger.error('No response from AI service');
        throw new Error('Failed to generate flashcards - no AI response');
      }
      
      const flashcards = JSON.parse(response.content);
      return flashcards.map((card: any) => ({
        ...card,
        type: 'basic'
      }));
    } catch (error) {
      logger.error('Error generating basic flashcards', error);
      throw error; // Re-throw to handle at higher level
    }
  }
  
  /**
   * Generate cloze deletion flashcards
   */
  private static async generateClozeFlashcards(
    userId: string,
    content: string,
    title: string,
    count: number,
    difficulty: string
  ): Promise<Flashcard[]> {
    const prompt = `Generate ${count} cloze deletion flashcards from this document.
    
    Document Title: ${title}
    Content: ${content.substring(0, 4000)}
    
    Requirements:
    1. Replace key terms with {{c1::term}} format
    2. Focus on important concepts, definitions, and relationships
    3. Each card should test one specific piece of knowledge
    4. Difficulty level: ${difficulty}
    
    Format as JSON array: [{ 
      "question": "The {{c1::key term}} is defined as the rest of the sentence",
      "answer": "key term",
      "metadata": { 
        "difficulty": ${difficulty === 'easy' ? 0.3 : difficulty === 'hard' ? 0.8 : 0.5},
        "tags": ["topic1", "topic2"],
        "cloze_text": "The key term is defined as..."
      }
    }]`;
    
    try {
      const response = await AIService.generateResponse(userId, {
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert at creating cloze deletion flashcards for effective learning.' 
          },
          { role: 'user', content: prompt }
        ]
      });
      
      if (!response || !response.content) {
        logger.error('No response from AI service');
        throw new Error('Failed to generate flashcards - no AI response');
      }
      
      const flashcards = JSON.parse(response.content);
      return flashcards.map((card: any) => ({
        ...card,
        type: 'cloze'
      }));
    } catch (error) {
      logger.error('Error generating cloze flashcards', error);
      throw error; // Re-throw to handle at higher level
    }
  }
  
  /**
   * Generate multiple choice flashcards
   */
  private static async generateMultiChoiceFlashcards(
    userId: string,
    content: string,
    title: string,
    count: number,
    difficulty: string
  ): Promise<Flashcard[]> {
    const prompt = `Generate ${count} multiple choice flashcards from this document.
    
    Document Title: ${title}
    Content: ${content.substring(0, 4000)}
    
    Requirements:
    1. Each question should have 4 options
    2. Include plausible distractors
    3. Indicate which option(s) are correct
    4. Difficulty level: ${difficulty}
    
    Format as JSON array: [{ 
      "question": "Which of the following is true about X?",
      "answer": "The correct answer with explanation",
      "metadata": { 
        "difficulty": ${difficulty === 'easy' ? 0.3 : difficulty === 'hard' ? 0.8 : 0.5},
        "tags": ["topic1", "topic2"],
        "choices": ["Option A", "Option B", "Option C", "Option D"],
        "correctChoices": [0] // indices of correct options
      }
    }]`;
    
    try {
      const response = await AIService.generateResponse(userId, {
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert at creating multiple choice questions for assessments.' 
          },
          { role: 'user', content: prompt }
        ]
      });
      
      if (!response || !response.content) {
        logger.error('No response from AI service');
        throw new Error('Failed to generate flashcards - no AI response');
      }
      
      const flashcards = JSON.parse(response.content);
      return flashcards.map((card: any) => ({
        ...card,
        type: 'multi'
      }));
    } catch (error) {
      logger.error('Error generating multiple choice flashcards', error);
      throw error; // Re-throw to handle at higher level
    }
  }
  
  /**
   * Save flashcards to database
   */
  private static async saveFlashcards(flashcards: Flashcard[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('flashcards')
        .insert(flashcards);
      
      if (error) {
        logger.error('Error saving flashcards to database', error);
        throw error;
      }
      
      logger.info('Flashcards saved successfully', { count: flashcards.length });
    } catch (error) {
      logger.error('Error saving flashcards', error);
      throw error;
    }
  }
  
  /**
   * Calculate next review using SM-2 algorithm
   */
  static calculateSM2(
    quality: number, // 0-5 rating
    repetitions: number,
    previousInterval: number,
    previousEaseFactor: number
  ): SM2Result {
    // Quality < 3 means the review failed
    if (quality < 3) {
      return {
        interval: 1, // Review again tomorrow
        easeFactor: previousEaseFactor,
        repetitions: 0 // Reset repetitions
      };
    }
    
    // Calculate new ease factor
    let newEaseFactor = previousEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    
    // Bound ease factor between 1.3 and 2.5
    newEaseFactor = Math.max(1.3, Math.min(2.5, newEaseFactor));
    
    // Calculate interval
    let interval: number;
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(previousInterval * newEaseFactor);
    }
    
    return {
      interval,
      easeFactor: newEaseFactor,
      repetitions: repetitions + 1
    };
  }
  
  /**
   * Update flashcard progress after review
   */
  static async updateFlashcardProgress(
    userId: string,
    flashcardId: string,
    quality: number // 0-5 rating
  ): Promise<StudyProgress> {
    logger.debug('Updating flashcard progress', { userId, flashcardId, quality });
    
    try {
      // Get current progress
      const { data: currentProgress } = await supabase
        .from('study_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('flashcard_id', flashcardId)
        .single();
      
      // Initialize or update progress
      let progress: StudyProgress;
      
      if (!currentProgress) {
        // First review
        const sm2Result = this.calculateSM2(quality, 0, 1, 2.5);
        
        progress = {
          flashcard_id: flashcardId,
          user_id: userId,
          repetitions: sm2Result.repetitions,
          ease_factor: sm2Result.easeFactor,
          interval: sm2Result.interval,
          next_review: new Date(Date.now() + sm2Result.interval * 24 * 60 * 60 * 1000).toISOString(),
          last_review: new Date().toISOString(),
          performance_history: [{
            date: new Date().toISOString(),
            quality,
            time_spent: 0
          }]
        };
      } else {
        // Subsequent review
        const sm2Result = this.calculateSM2(
          quality,
          currentProgress.repetitions,
          currentProgress.interval,
          currentProgress.ease_factor
        );
        
        progress = {
          ...currentProgress,
          repetitions: sm2Result.repetitions,
          ease_factor: sm2Result.easeFactor,
          interval: sm2Result.interval,
          next_review: new Date(Date.now() + sm2Result.interval * 24 * 60 * 60 * 1000).toISOString(),
          last_review: new Date().toISOString(),
          performance_history: [
            ...(currentProgress.performance_history || []),
            {
              date: new Date().toISOString(),
              quality,
              time_spent: 0
            }
          ]
        };
      }
      
      // Save progress
      const { error } = await supabase
        .from('study_progress')
        .upsert(progress, {
          onConflict: 'user_id,flashcard_id'
        });
      
      if (error) {
        logger.error('Error updating study progress', error);
        throw error;
      }
      
      return progress;
    } catch (error) {
      logger.error('Error updating flashcard progress', error);
      throw error;
    }
  }
  
  /**
   * Get flashcards due for review
   */
  static async getDueFlashcards(
    userId: string,
    limit: number = 20
  ): Promise<Flashcard[]> {
    logger.debug('Getting due flashcards', { userId, limit });
    
    try {
      // Get flashcards with progress
      const { data: dueCards } = await supabase
        .from('flashcards')
        .select(`
          *,
          study_progress!inner(
            next_review,
            repetitions,
            ease_factor
          )
        `)
        .eq('user_id', userId)
        .lte('study_progress.next_review', new Date().toISOString())
        .order('study_progress.next_review', { ascending: true })
        .limit(limit);
      
      // Get new flashcards (no progress yet)
      const { data: newCards } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', userId)
        .is('study_progress', null)
        .limit(Math.max(5, limit - (dueCards?.length || 0)));
      
      const allCards = [...(dueCards || []), ...(newCards || [])];
      
      logger.info('Retrieved due flashcards', { 
        dueCount: dueCards?.length || 0,
        newCount: newCards?.length || 0
      });
      
      return allCards;
    } catch (error) {
      logger.error('Error getting due flashcards', error);
      return [];
    }
  }
  
  /**
   * Create a study session
   */
  static async createStudySession(
    userId: string,
    flashcardIds: string[]
  ): Promise<StudySession> {
    logger.info('Creating study session', { userId, cardCount: flashcardIds.length });
    
    const session: StudySession = {
      id: uuidv4(),
      user_id: userId,
      flashcard_ids: flashcardIds,
      started_at: new Date().toISOString(),
      performance: {
        totalCards: flashcardIds.length,
        correctAnswers: 0,
        averageTime: 0,
        difficultyBreakdown: {
          easy: 0,
          medium: 0,
          hard: 0
        }
      }
    };
    
    try {
      const { error } = await supabase
        .from('study_sessions')
        .insert(session);
      
      if (error) {
        logger.error('Error creating study session', error);
        throw error;
      }
      
      return session;
    } catch (error) {
      logger.error('Error creating study session', error);
      throw error;
    }
  }
  
  /**
   * Get study statistics for a user
   */
  static async getStudyStats(userId: string): Promise<{
    totalCards: number;
    dueToday: number;
    streak: number;
    averageEaseFactor: number;
    masteredCards: number;
  }> {
    logger.debug('Getting study statistics', { userId });
    
    try {
      // Get all flashcards and progress
      const { data: flashcards } = await supabase
        .from('flashcards')
        .select('*, study_progress(*)')
        .eq('user_id', userId);
      
      if (!flashcards) {
        return {
          totalCards: 0,
          dueToday: 0,
          streak: 0,
          averageEaseFactor: 2.5,
          masteredCards: 0
        };
      }
      
      const now = new Date();
      const dueToday = flashcards.filter(card => {
        const progress = card.study_progress?.[0];
        if (!progress) return true; // New cards are due
        return new Date(progress.next_review) <= now;
      }).length;
      
      const masteredCards = flashcards.filter(card => {
        const progress = card.study_progress?.[0];
        return progress && progress.interval > 21; // 3+ weeks interval
      }).length;
      
      const avgEaseFactor = flashcards.reduce((sum, card) => {
        const progress = card.study_progress?.[0];
        return sum + (progress?.ease_factor || 2.5);
      }, 0) / flashcards.length;
      
      // Calculate streak (simplified)
      const { data: recentSessions } = await supabase
        .from('study_sessions')
        .select('started_at')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(30);
      
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        
        const hasSession = recentSessions?.some(session => {
          const sessionDate = new Date(session.started_at);
          sessionDate.setHours(0, 0, 0, 0);
          return sessionDate.getTime() === checkDate.getTime();
        });
        
        if (hasSession) {
          streak++;
        } else if (i > 0) {
          break; // Streak broken
        }
      }
      
      return {
        totalCards: flashcards.length,
        dueToday,
        streak,
        averageEaseFactor: avgEaseFactor,
        masteredCards
      };
    } catch (error) {
      logger.error('Error getting study statistics', error);
      return {
        totalCards: 0,
        dueToday: 0,
        streak: 0,
        averageEaseFactor: 2.5,
        masteredCards: 0
      };
    }
  }
}