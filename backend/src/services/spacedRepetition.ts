import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

// SM-2 Algorithm implementation
interface SM2Result {
  interval: number;
  repetitions: number;
  easeFactor: number;
  nextReviewDate: Date;
}

interface StudyHeatmapData {
  date: string;
  count: number;
  intensity: number;
}

interface StudyPerformance {
  date: string;
  accuracy: number;
  cardsStudied: number;
  averageResponseTime: number;
}

export class SpacedRepetitionService {
  /**
   * Calculate next review using SM-2 algorithm
   * @param quality - User's self-assessment (0-5)
   * @param repetitions - Number of successful repetitions
   * @param previousInterval - Previous interval in days
   * @param previousEaseFactor - Previous ease factor
   */
  static calculateSM2(
    quality: number,
    repetitions: number,
    previousInterval: number,
    previousEaseFactor: number
  ): SM2Result {
    let interval: number;
    let newRepetitions: number;
    let easeFactor: number;

    // Calculate new ease factor
    easeFactor = previousEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    
    // Minimum ease factor is 1.3
    if (easeFactor < 1.3) {
      easeFactor = 1.3;
    }

    // Reset if quality < 3
    if (quality < 3) {
      newRepetitions = 0;
      interval = 1;
    } else {
      newRepetitions = repetitions + 1;
      
      if (newRepetitions === 1) {
        interval = 1;
      } else if (newRepetitions === 2) {
        interval = 6;
      } else {
        interval = Math.round(previousInterval * easeFactor);
      }
    }

    // Calculate next review date
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    return {
      interval,
      repetitions: newRepetitions,
      easeFactor,
      nextReviewDate
    };
  }

  /**
   * Initialize study card for a flashcard
   */
  static async initializeStudyCard(flashcardId: string, userId: string) {
    try {
      const { data, error } = await supabase
        .from('study_cards')
        .insert({
          flashcard_id: flashcardId,
          user_id: userId,
          repetitions: 0,
          ease_factor: 2.5,
          interval: 1,
          next_review_date: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error initializing study card:', error);
      throw error;
    }
  }

  /**
   * Get cards due for review
   */
  static async getDueCards(userId: string, setId?: string) {
    try {
      let query = supabase
        .from('study_cards')
        .select(`
          *,
          flashcard:flashcards(
            *,
            set:flashcard_sets(*)
          )
        `)
        .eq('user_id', userId)
        .lte('next_review_date', new Date().toISOString())
        .order('next_review_date', { ascending: true });

      if (setId) {
        // Filter by set if specified
        query = query.eq('flashcard.set_id', setId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data;
    } catch (error) {
      logger.error('Error getting due cards:', error);
      throw error;
    }
  }

  /**
   * Record a review and update study card
   */
  static async recordReview(
    studyCardId: string,
    quality: number,
    responseTime: number,
    sessionId?: string
  ) {
    try {
      // Get current study card
      const { data: studyCard, error: fetchError } = await supabase
        .from('study_cards')
        .select('*')
        .eq('id', studyCardId)
        .single();

      if (fetchError) throw fetchError;

      // Calculate new values using SM-2
      const sm2Result = this.calculateSM2(
        quality,
        studyCard.repetitions,
        studyCard.interval,
        studyCard.ease_factor
      );

      // Update study card
      const { error: updateError } = await supabase
        .from('study_cards')
        .update({
          repetitions: sm2Result.repetitions,
          ease_factor: sm2Result.easeFactor,
          interval: sm2Result.interval,
          next_review_date: sm2Result.nextReviewDate.toISOString(),
          last_reviewed_at: new Date().toISOString(),
          total_reviews: studyCard.total_reviews + 1,
          successful_reviews: quality >= 3 ? studyCard.successful_reviews + 1 : studyCard.successful_reviews,
          failed_reviews: quality < 3 ? studyCard.failed_reviews + 1 : studyCard.failed_reviews,
          average_response_time: Math.round(
            (studyCard.average_response_time * studyCard.total_reviews + responseTime) / 
            (studyCard.total_reviews + 1)
          )
        })
        .eq('id', studyCardId);

      if (updateError) throw updateError;

      // Record review details if session provided
      if (sessionId) {
        const { error: reviewError } = await supabase
          .from('study_reviews')
          .insert({
            session_id: sessionId,
            study_card_id: studyCardId,
            quality,
            response_time: responseTime,
            prev_ease_factor: studyCard.ease_factor,
            prev_interval: studyCard.interval,
            prev_repetitions: studyCard.repetitions,
            new_ease_factor: sm2Result.easeFactor,
            new_interval: sm2Result.interval,
            new_repetitions: sm2Result.repetitions
          });

        if (reviewError) throw reviewError;
      }

      return sm2Result;
    } catch (error) {
      logger.error('Error recording review:', error);
      throw error;
    }
  }

  /**
   * Create a study session
   */
  static async createStudySession(userId: string, setId?: string) {
    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .insert({
          user_id: userId,
          set_id: setId,
          session_type: 'review'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating study session:', error);
      throw error;
    }
  }

  /**
   * Complete a study session
   */
  static async completeStudySession(sessionId: string, stats: any) {
    try {
      const { error } = await supabase
        .from('study_sessions')
        .update({
          ended_at: new Date().toISOString(),
          duration: stats.duration,
          cards_studied: stats.cardsStudied,
          cards_mastered: stats.cardsMastered,
          cards_learning: stats.cardsLearning,
          cards_relearning: stats.cardsRelearning,
          accuracy_rate: stats.accuracyRate,
          average_ease: stats.averageEase
        })
        .eq('id', sessionId);

      if (error) throw error;

      // Update user's study streak
      const { data: session } = await supabase
        .from('study_sessions')
        .select('user_id')
        .eq('id', sessionId)
        .single();

      if (session) {
        await this.updateStudyStreak(session.user_id);
      }
    } catch (error) {
      logger.error('Error completing study session:', error);
      throw error;
    }
  }

  /**
   * Update user's study streak
   */
  static async updateStudyStreak(userId: string) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get current streak
      const { data: streak, error: fetchError } = await supabase
        .from('study_streaks')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (!streak) {
        // Create new streak
        await supabase
          .from('study_streaks')
          .insert({
            user_id: userId,
            current_streak: 1,
            longest_streak: 1,
            last_study_date: today,
            total_days_studied: 1
          });
      } else {
        const lastStudy = new Date(streak.last_study_date);
        const todayDate = new Date(today);
        const daysDiff = Math.floor((todayDate.getTime() - lastStudy.getTime()) / (1000 * 60 * 60 * 24));

        let newStreak = streak.current_streak;
        if (daysDiff === 1) {
          // Consecutive day
          newStreak = streak.current_streak + 1;
        } else if (daysDiff > 1) {
          // Streak broken
          newStreak = 1;
        }
        // If daysDiff === 0, already studied today, keep current streak

        await supabase
          .from('study_streaks')
          .update({
            current_streak: newStreak,
            longest_streak: Math.max(newStreak, streak.longest_streak),
            last_study_date: today,
            total_days_studied: daysDiff > 0 ? streak.total_days_studied + 1 : streak.total_days_studied
          })
          .eq('user_id', userId);
      }
    } catch (error) {
      logger.error('Error updating study streak:', error);
      throw error;
    }
  }

  /**
   * Get study statistics for a user
   */
  static async getStudyStats(userId: string) {
    try {
      // Get overall stats
      const { data: cards } = await supabase
        .from('study_cards')
        .select('*')
        .eq('user_id', userId);

      const now = new Date();
      const stats = {
        totalCards: cards?.length || 0,
        dueCards: 0,
        learningCards: 0,
        reviewCards: 0,
        masteredCards: 0,
        averageEaseFactor: 0,
        averageInterval: 0
      };

      if (cards && cards.length > 0) {
        cards.forEach(card => {
          const reviewDate = new Date(card.next_review_date);
          
          if (reviewDate <= now) {
            stats.dueCards++;
          }
          
          if (card.repetitions === 0) {
            stats.learningCards++;
          } else if (card.interval < 21) {
            stats.reviewCards++;
          } else {
            stats.masteredCards++;
          }
          
          stats.averageEaseFactor += card.ease_factor;
          stats.averageInterval += card.interval;
        });
        
        stats.averageEaseFactor /= cards.length;
        stats.averageInterval /= cards.length;
      }

      // Get streak info
      const { data: streak } = await supabase
        .from('study_streaks')
        .select('*')
        .eq('user_id', userId)
        .single();

      return {
        ...stats,
        currentStreak: streak?.current_streak || 0,
        longestStreak: streak?.longest_streak || 0,
        totalDaysStudied: streak?.total_days_studied || 0
      };
    } catch (error) {
      logger.error('Error getting study stats:', error);
      throw error;
    }
  }

  /**
   * Get study heatmap data for the last year
   */
  static async getHeatmapData(userId: string): Promise<StudyHeatmapData[]> {
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const { data: sessions, error } = await supabase
        .from('study_sessions')
        .select('started_at, cards_studied')
        .eq('user_id', userId)
        .gte('started_at', oneYearAgo.toISOString())
        .order('started_at', { ascending: true });

      if (error) throw error;

      // Group by date and calculate intensity
      const heatmapMap = new Map<string, { count: number; cards: number }>();
      
      sessions?.forEach(session => {
        const date = new Date(session.started_at).toISOString().split('T')[0];
        const existing = heatmapMap.get(date) || { count: 0, cards: 0 };
        heatmapMap.set(date, {
          count: existing.count + 1,
          cards: existing.cards + (session.cards_studied || 0)
        });
      });

      // Convert to array and calculate intensity
      const maxCards = Math.max(...Array.from(heatmapMap.values()).map(d => d.cards), 1);
      
      return Array.from(heatmapMap.entries()).map(([date, data]) => ({
        date,
        count: data.count,
        intensity: Math.min(data.cards / maxCards, 1) // 0-1 scale
      }));
    } catch (error) {
      logger.error('Error getting heatmap data:', error);
      throw error;
    }
  }

  /**
   * Get performance trends over time
   */
  static async getPerformanceTrends(userId: string, days: number = 30): Promise<StudyPerformance[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: sessions, error } = await supabase
        .from('study_sessions')
        .select('started_at, cards_studied, correct_answers, duration_seconds')
        .eq('user_id', userId)
        .gte('started_at', startDate.toISOString())
        .order('started_at', { ascending: true });

      if (error) throw error;

      // Group by date
      const performanceMap = new Map<string, {
        cardsStudied: number;
        correctAnswers: number;
        totalTime: number;
        sessionCount: number;
      }>();

      sessions?.forEach(session => {
        const date = new Date(session.started_at).toISOString().split('T')[0];
        const existing = performanceMap.get(date) || {
          cardsStudied: 0,
          correctAnswers: 0,
          totalTime: 0,
          sessionCount: 0
        };
        
        performanceMap.set(date, {
          cardsStudied: existing.cardsStudied + (session.cards_studied || 0),
          correctAnswers: existing.correctAnswers + (session.correct_answers || 0),
          totalTime: existing.totalTime + (session.duration_seconds || 0),
          sessionCount: existing.sessionCount + 1
        });
      });

      return Array.from(performanceMap.entries()).map(([date, data]) => ({
        date,
        accuracy: data.cardsStudied > 0 ? (data.correctAnswers / data.cardsStudied) * 100 : 0,
        cardsStudied: data.cardsStudied,
        averageResponseTime: data.cardsStudied > 0 ? Math.round(data.totalTime / data.cardsStudied) : 0
      }));
    } catch (error) {
      logger.error('Error getting performance trends:', error);
      throw error;
    }
  }

  /**
   * Get cards by difficulty distribution
   */
  static async getDifficultyDistribution(userId: string) {
    try {
      const { data: cards, error } = await supabase
        .from('study_cards')
        .select('ease_factor')
        .eq('user_id', userId);

      if (error) throw error;

      const distribution = {
        easy: 0,      // ease_factor > 2.5
        medium: 0,    // ease_factor 2.0-2.5
        hard: 0,      // ease_factor 1.5-2.0
        veryHard: 0   // ease_factor < 1.5
      };

      cards?.forEach(card => {
        if (card.ease_factor > 2.5) distribution.easy++;
        else if (card.ease_factor >= 2.0) distribution.medium++;
        else if (card.ease_factor >= 1.5) distribution.hard++;
        else distribution.veryHard++;
      });

      return distribution;
    } catch (error) {
      logger.error('Error getting difficulty distribution:', error);
      throw error;
    }
  }

  /**
   * Initialize study cards for all flashcards in a set
   */
  static async initializeSetStudyCards(setId: string, userId: string) {
    try {
      // Get all flashcards in the set
      const { data: flashcards, error: fetchError } = await supabase
        .from('flashcards')
        .select('id')
        .eq('set_id', setId);

      if (fetchError) throw fetchError;

      // Create study cards for each flashcard
      const studyCards = flashcards?.map(flashcard => ({
        flashcard_id: flashcard.id,
        user_id: userId,
        repetitions: 0,
        ease_factor: 2.5,
        interval: 1,
        next_review_date: new Date().toISOString()
      }));

      if (studyCards && studyCards.length > 0) {
        const { error: insertError } = await supabase
          .from('study_cards')
          .upsert(studyCards, { onConflict: 'flashcard_id,user_id' });

        if (insertError) throw insertError;
      }

      return studyCards?.length || 0;
    } catch (error) {
      logger.error('Error initializing set study cards:', error);
      throw error;
    }
  }

  /**
   * Get upcoming review forecast
   */
  static async getReviewForecast(userId: string, days: number = 7) {
    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      const { data: cards, error } = await supabase
        .from('study_cards')
        .select('next_review_date')
        .eq('user_id', userId)
        .lte('next_review_date', endDate.toISOString())
        .gte('next_review_date', new Date().toISOString());

      if (error) throw error;

      // Group by date
      const forecast = new Map<string, number>();
      
      cards?.forEach(card => {
        const date = new Date(card.next_review_date).toISOString().split('T')[0];
        forecast.set(date, (forecast.get(date) || 0) + 1);
      });

      // Fill in missing dates
      const result = [];
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        result.push({
          date: dateStr,
          count: forecast.get(dateStr) || 0
        });
      }

      return result;
    } catch (error) {
      logger.error('Error getting review forecast:', error);
      throw error;
    }
  }
}