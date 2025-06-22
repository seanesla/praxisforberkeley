import { supabase } from '../config/supabase';
import { AIService } from './ai/aiService';
import { logger } from '../utils/logger';

export interface KnowledgeGap {
  id?: string;
  gap_type: 'missing_prerequisite' | 'weak_understanding' | 'misconception' | 'not_practiced';
  severity: number; // 0-1 scale
  concept: string;
  related_concepts?: string[];
  description: string;
  detected_from: any;
  detection_confidence: number;
  recommended_actions?: any[];
  recommended_resources?: any[];
}

export interface ConceptExtraction {
  concept: string;
  type: 'main' | 'prerequisite' | 'related';
  importance: number;
  source: string;
}

export interface LearningPath {
  id?: string;
  path_name: string;
  description: string;
  steps: LearningStep[];
  total_steps: number;
  estimated_duration: number;
  difficulty: string;
}

export interface LearningStep {
  order: number;
  type: 'study' | 'practice' | 'review' | 'assessment';
  resource_type: 'document' | 'flashcard' | 'exercise' | 'video';
  resource_id?: string;
  title: string;
  description: string;
  estimated_time: number; // minutes
  required: boolean;
}

export class KnowledgeGapService {
  /**
   * Extract concepts from document content
   */
  static async extractConcepts(documentId: string, userId: string): Promise<ConceptExtraction[]> {
    try {
      const { data: document, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      const aiService = new AIService();
      const response = await aiService.generateResponse('system', {
        messages: [{
          role: 'user',
          content: `Extract key concepts from this document:
Title: ${document.title}
Content: ${document.content?.substring(0, 3000)}...

Return concepts in JSON format:
[
  {
    "concept": "concept name",
    "type": "main|prerequisite|related",
    "importance": 0.0-1.0,
    "description": "brief description"
  }
]`
        }],
        temperature: 0.3,
        maxTokens: 1000
      });

      if (!response) return [];

      try {
        const parsed = JSON.parse(response.content);
        return parsed.map((c: any) => ({
          ...c,
          source: documentId
        }));
      } catch (e) {
        logger.error('Error parsing concepts:', e);
        return [];
      }
    } catch (error) {
      logger.error('Error extracting concepts:', error);
      return [];
    }
  }
  /**
   * Analyze user's knowledge state and detect gaps
   */
  static async analyzeKnowledgeGaps(userId: string) {
    try {
      const gaps: KnowledgeGap[] = [];

      // Analyze from multiple sources
      const [
        exerciseGaps,
        flashcardGaps,
        studyPatternGaps,
        prerequisiteGaps
      ] = await Promise.all([
        this.analyzeExercisePerformance(userId),
        this.analyzeFlashcardPerformance(userId),
        this.analyzeStudyPatterns(userId),
        this.analyzePrerequisites(userId)
      ]);

      gaps.push(...exerciseGaps, ...flashcardGaps, ...studyPatternGaps, ...prerequisiteGaps);

      // Deduplicate and prioritize gaps
      const uniqueGaps = this.deduplicateGaps(gaps);
      const prioritizedGaps = this.prioritizeGaps(uniqueGaps);

      // Store detected gaps
      for (const gap of prioritizedGaps) {
        await this.storeKnowledgeGap(userId, gap);
      }

      // Generate learning paths for high severity gaps
      const criticalGaps = prioritizedGaps.filter(g => g.severity >= 0.8);
      for (const gap of criticalGaps) {
        await this.generateLearningPath(userId, gap);
      }

      return prioritizedGaps;
    } catch (error) {
      logger.error('Error analyzing knowledge gaps:', error);
      throw error;
    }
  }

  /**
   * Analyze exercise performance to detect gaps
   */
  private static async analyzeExercisePerformance(userId: string): Promise<KnowledgeGap[]> {
    try {
      const gaps: KnowledgeGap[] = [];

      // Get recent exercise attempts
      const { data: attempts, error } = await supabase
        .from('exercise_attempts')
        .select(`
          *,
          exercise:exercises(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Group by concepts and analyze performance
      const conceptPerformance = new Map<string, { correct: number; total: number }>();

      attempts?.forEach(attempt => {
        const concepts = attempt.exercise?.concepts || [];
        concepts.forEach((concept: string) => {
          const current = conceptPerformance.get(concept) || { correct: 0, total: 0 };
          current.total++;
          if (attempt.is_correct) current.correct++;
          conceptPerformance.set(concept, current);
        });
      });

      // Identify weak concepts
      conceptPerformance.forEach((perf, concept) => {
        const accuracy = perf.correct / perf.total;
        
        if (accuracy < 0.6 && perf.total >= 3) {
          gaps.push({
            gap_type: 'weak_understanding',
            severity: accuracy < 0.3 ? 0.9 : accuracy < 0.5 ? 0.7 : 0.5,
            concept,
            description: `Struggling with exercises related to "${concept}"`,
            detected_from: {
              source: 'exercise_performance',
              accuracy,
              attempts: perf.total
            },
            detection_confidence: Math.min(perf.total / 10, 1),
            recommended_actions: [
              { type: 'review', description: `Review materials on ${concept}` },
              { type: 'practice', description: `Complete targeted exercises on ${concept}` }
            ]
          });
        }
      });

      return gaps;
    } catch (error) {
      logger.error('Error analyzing exercise performance:', error);
      return [];
    }
  }

  /**
   * Analyze flashcard performance to detect retention gaps
   */
  private static async analyzeFlashcardPerformance(userId: string): Promise<KnowledgeGap[]> {
    try {
      const gaps: KnowledgeGap[] = [];

      // Get study cards with poor retention
      const { data: cards, error } = await supabase
        .from('study_cards')
        .select(`
          *,
          flashcard:flashcards(
            *,
            set:flashcard_sets(*)
          )
        `)
        .eq('user_id', userId)
        .lt('ease_factor', 2.0) // Cards with difficulty
        .gt('total_reviews', 2); // At least reviewed a few times

      if (error) throw error;

      // Group by topics/sets
      const setPerformance = new Map<string, any[]>();
      
      cards?.forEach(card => {
        const setId = card.flashcard?.set_id;
        if (setId) {
          const current = setPerformance.get(setId) || [];
          current.push(card);
          setPerformance.set(setId, current);
        }
      });

      // Identify retention gaps
      setPerformance.forEach((cards, setId) => {
        const avgEase = cards.reduce((sum, c) => sum + c.ease_factor, 0) / cards.length;
        const failureRate = cards.reduce((sum, c) => 
          sum + (c.failed_reviews / c.total_reviews), 0) / cards.length;

        if (avgEase < 2.0 || failureRate > 0.4) {
          const setName = cards[0]?.flashcard?.set?.title || 'Unknown Set';
          
          gaps.push({
            gap_type: 'weak_understanding',
            severity: failureRate > 0.6 ? 0.8 : 0.6,
            concept: setName,
            description: `Poor retention of material in "${setName}"`,
            detected_from: {
              source: 'flashcard_performance',
              average_ease: avgEase,
              failure_rate: failureRate,
              card_count: cards.length
            },
            detection_confidence: Math.min(cards.length / 20, 1),
            recommended_actions: [
              { type: 'adjust_intervals', description: 'Shorten review intervals' },
              { type: 'simplify', description: 'Break down complex cards' },
              { type: 'add_context', description: 'Add more context or examples' }
            ]
          });
        }
      });

      return gaps;
    } catch (error) {
      logger.error('Error analyzing flashcard performance:', error);
      return [];
    }
  }

  /**
   * Analyze study patterns to detect behavioral gaps
   */
  private static async analyzeStudyPatterns(userId: string): Promise<KnowledgeGap[]> {
    try {
      const gaps: KnowledgeGap[] = [];

      // Get study sessions
      const { data: sessions, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      if (!sessions || sessions.length < 5) return gaps;

      // Analyze patterns
      const avgDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length;
      const avgAccuracy = sessions.reduce((sum, s) => sum + (s.accuracy_rate || 0), 0) / sessions.length;
      
      // Check for rushed sessions
      const rushedSessions = sessions.filter(s => 
        s.duration && s.cards_studied && (s.duration / s.cards_studied) < 10 // Less than 10 seconds per card
      );

      if (rushedSessions.length > sessions.length * 0.3) {
        gaps.push({
          gap_type: 'not_practiced',
          severity: 0.5,
          concept: 'Study Habits',
          description: 'Study sessions appear rushed, potentially impacting retention',
          detected_from: {
            source: 'study_patterns',
            rushed_percentage: rushedSessions.length / sessions.length,
            avg_time_per_card: avgDuration / (sessions[0]?.cards_studied || 1)
          },
          detection_confidence: 0.8,
          recommended_actions: [
            { type: 'behavior', description: 'Slow down during study sessions' },
            { type: 'schedule', description: 'Schedule longer study blocks' }
          ]
        });
      }

      // Check for inconsistent study habits
      const daysBetweenSessions = this.calculateDaysBetweenSessions(sessions);
      const avgDaysBetween = daysBetweenSessions.reduce((a, b) => a + b, 0) / daysBetweenSessions.length;

      if (avgDaysBetween > 3) {
        gaps.push({
          gap_type: 'not_practiced',
          severity: 0.7,
          concept: 'Study Consistency',
          description: 'Inconsistent study schedule affecting knowledge retention',
          detected_from: {
            source: 'study_patterns',
            avg_days_between_sessions: avgDaysBetween
          },
          detection_confidence: 0.9,
          recommended_actions: [
            { type: 'schedule', description: 'Establish daily study routine' },
            { type: 'reminder', description: 'Set up study reminders' }
          ]
        });
      }

      return gaps;
    } catch (error) {
      logger.error('Error analyzing study patterns:', error);
      return [];
    }
  }

  /**
   * Analyze prerequisite knowledge based on concept mastery
   */
  private static async analyzePrerequisites(userId: string): Promise<KnowledgeGap[]> {
    try {
      const gaps: KnowledgeGap[] = [];

      // Get concept mastery levels
      const { data: masteryLevels, error } = await supabase
        .from('concept_mastery')
        .select('*')
        .eq('user_id', userId)
        .lt('mastery_level', 0.6) // Concepts not well understood
        .order('mastery_level', { ascending: true });

      if (error) throw error;

      // For each weak concept, check if it might be due to missing prerequisites
      for (const mastery of masteryLevels || []) {
        const aiService = new AIService();
        
        // Ask AI to identify potential prerequisites
        const response = await aiService.generateResponse('system', {
          messages: [{
            role: 'user',
            content: `What are the prerequisite concepts needed to understand "${mastery.concept}"? List 2-3 key prerequisites.`
          }],
          temperature: 0.3,
          maxTokens: 200
        });

        if (response) {
          // Parse prerequisites from response
          const prereqConcepts = response.content
            .split('\n')
            .filter(line => line.trim().length > 0)
            .slice(0, 3);

          gaps.push({
            gap_type: 'missing_prerequisite',
            severity: 0.9,
            concept: mastery.concept,
            related_concepts: prereqConcepts,
            description: `Weak understanding of "${mastery.concept}" may be due to missing prerequisites`,
            detected_from: {
              source: 'prerequisite_analysis',
              current_mastery: mastery.mastery_level,
              last_assessed: mastery.last_assessed
            },
            detection_confidence: 0.8,
            recommended_actions: [
              { type: 'study', description: `Review prerequisite concepts first` },
              { type: 'sequence', description: `Follow a structured learning path` }
            ]
          });
        }
      }

      return gaps;
    } catch (error) {
      logger.error('Error analyzing prerequisites:', error);
      return [];
    }
  }

  /**
   * Store detected knowledge gap
   */
  private static async storeKnowledgeGap(userId: string, gap: KnowledgeGap) {
    try {
      const { error } = await supabase
        .from('knowledge_gaps')
        .insert({
          user_id: userId,
          concept: gap.concept,
          gap_type: gap.gap_type,
          severity: gap.severity,
          related_concepts: gap.related_concepts || [],
          recommended_resources: gap.recommended_resources || [],
          detection_method: gap.detected_from.source,
          resolved: false
        });

      if (error) throw error;

      // Record analytics event
      await supabase
        .from('analytics_metrics')
        .insert({
          user_id: userId,
          metric_type: 'gap_detection',
          metric_value: gap.severity,
          dimensions: {
            gap_type: gap.gap_type,
            concept: gap.concept,
            source: gap.detected_from.source
          }
        });
    } catch (error) {
      logger.error('Error storing knowledge gap:', error);
    }
  }

  /**
   * Generate learning path for a gap
   */
  static async generateLearningPath(userId: string, gap: KnowledgeGap) {
    try {
      const aiService = new AIService();
      
      // Get relevant resources
      const resources = await this.findRelevantResources(userId, gap);
      
      // Generate path using AI
      const response = await aiService.generateResponse('system', {
        messages: [{
          role: 'user',
          content: `Create a learning path to address this knowledge gap:
${gap.description}

Available resources:
${resources.map((r: any) => `- ${r.type}: ${r.title}`).join('\n')}

Generate a structured learning path with 3-5 steps.`
        }],
        temperature: 0.5,
        maxTokens: 1000
      });

      if (!response) throw new Error('Failed to generate learning path');

      // Parse and create learning path
      const steps = this.parseLearningSteps(response.content);
      
      const { data: path, error } = await supabase
        .from('learning_paths')
        .insert({
          user_id: userId,
          title: `Path to resolve: ${gap.description.substring(0, 50)}...`,
          description: `Personalized learning path to address ${gap.gap_type} gap`,
          target_concepts: [gap.concept],
          prerequisite_concepts: gap.related_concepts || [],
          steps,
          estimated_duration: steps.reduce((sum, s) => sum + s.estimated_time, 0),
          difficulty_level: gap.severity >= 0.8 ? 'hard' : gap.severity >= 0.5 ? 'medium' : 'easy',
          completion_percentage: 0
        })
        .select()
        .single();

      if (error) throw error;
      return path;
    } catch (error) {
      logger.error('Error generating learning path:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private static deduplicateGaps(gaps: KnowledgeGap[]): KnowledgeGap[] {
    const unique = new Map<string, KnowledgeGap>();
    
    gaps.forEach(gap => {
      const key = `${gap.gap_type}-${gap.description.substring(0, 50)}`;
      const existing = unique.get(key);
      
      if (!existing || gap.detection_confidence > existing.detection_confidence) {
        unique.set(key, gap);
      }
    });

    return Array.from(unique.values());
  }

  private static prioritizeGaps(gaps: KnowledgeGap[]): KnowledgeGap[] {
    return gaps.sort((a, b) => {
      // Higher severity first
      const severityDiff = b.severity - a.severity;
      if (severityDiff !== 0) return severityDiff;
      
      // Then by confidence
      return b.detection_confidence - a.detection_confidence;
    });
  }

  private static calculateDaysBetweenSessions(sessions: any[]): number[] {
    const days: number[] = [];
    
    for (let i = 1; i < sessions.length; i++) {
      const curr = new Date(sessions[i].started_at);
      const prev = new Date(sessions[i - 1].started_at);
      const diffDays = Math.floor((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
      days.push(diffDays);
    }
    
    return days;
  }

  private static async findRelevantResources(userId: string, gap: KnowledgeGap) {
    // Find documents, flashcard sets, and exercises related to the gap
    const resources = [];
    
    try {
      // Search documents
      const { data: docs } = await supabase
        .from('documents')
        .select('id, title')
        .eq('user_id', userId)
        .limit(5);
      
      docs?.forEach(doc => resources.push({ type: 'document', ...doc }));
      
      // Search flashcard sets
      const { data: sets } = await supabase
        .from('flashcard_sets')
        .select('id, title')
        .eq('user_id', userId)
        .limit(3);
      
      sets?.forEach(set => resources.push({ type: 'flashcard', ...set }));
    } catch (error) {
      logger.error('Error finding resources:', error);
    }
    
    return resources;
  }

  private static parseLearningSteps(aiResponse: string): LearningStep[] {
    // Simple parsing - in production would be more sophisticated
    const steps: LearningStep[] = [];
    const lines = aiResponse.split('\n');
    
    let order = 1;
    lines.forEach(line => {
      if (line.match(/^\d+\.|Step \d+:/)) {
        steps.push({
          order: order++,
          type: 'study',
          resource_type: 'document',
          title: line.replace(/^\d+\.|Step \d+:/, '').trim(),
          description: 'Complete this learning activity',
          estimated_time: 15,
          required: true
        });
      }
    });
    
    return steps.length > 0 ? steps : [
      {
        order: 1,
        type: 'study',
        resource_type: 'document',
        title: 'Review foundational concepts',
        description: 'Start with basic materials',
        estimated_time: 30,
        required: true
      }
    ];
  }

  /**
   * Update concept mastery based on performance
   */
  static async updateConceptMastery(
    userId: string,
    concept: string,
    performance: number,
    source: string
  ) {
    try {
      // Get current mastery
      const { data: current, error: fetchError } = await supabase
        .from('concept_mastery')
        .select('*')
        .eq('user_id', userId)
        .eq('concept', concept)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      const now = new Date().toISOString();
      const assessmentEntry = {
        date: now,
        score: performance,
        source
      };

      if (!current) {
        // Create new mastery record
        await supabase
          .from('concept_mastery')
          .insert({
            user_id: userId,
            concept,
            mastery_level: performance,
            last_assessed: now,
            assessment_history: [assessmentEntry]
          });
      } else {
        // Update existing mastery with weighted average
        const history = current.assessment_history || [];
        history.push(assessmentEntry);
        
        // Keep last 10 assessments
        if (history.length > 10) {
          history.shift();
        }

        // Calculate weighted average (recent assessments have more weight)
        let weightedSum = 0;
        let weightSum = 0;
        history.forEach((assessment: any, index: number) => {
          const weight = (index + 1) / history.length;
          weightedSum += assessment.score * weight;
          weightSum += weight;
        });

        const newMastery = weightedSum / weightSum;

        await supabase
          .from('concept_mastery')
          .update({
            mastery_level: newMastery,
            last_assessed: now,
            assessment_history: history
          })
          .eq('user_id', userId)
          .eq('concept', concept);
      }
    } catch (error) {
      logger.error('Error updating concept mastery:', error);
    }
  }

  /**
   * Get learning progress for a user
   */
  static async getLearningProgress(userId: string) {
    try {
      // Get all gaps
      const { data: gaps, error: gapsError } = await supabase
        .from('knowledge_gaps')
        .select('*')
        .eq('user_id', userId)
        .order('severity', { ascending: false });

      if (gapsError) throw gapsError;

      // Get active learning paths
      const { data: paths, error: pathsError } = await supabase
        .from('learning_paths')
        .select('*')
        .eq('user_id', userId)
        .gt('completion_percentage', 0)
        .lt('completion_percentage', 100);

      if (pathsError) throw pathsError;

      // Get concept mastery levels
      const { data: mastery, error: masteryError } = await supabase
        .from('concept_mastery')
        .select('*')
        .eq('user_id', userId)
        .order('mastery_level', { ascending: false });

      if (masteryError) throw masteryError;

      // Calculate progress metrics
      const totalGaps = gaps?.length || 0;
      const resolvedGaps = gaps?.filter(g => g.resolved).length || 0;
      const criticalGaps = gaps?.filter(g => g.severity >= 0.8 && !g.resolved).length || 0;

      const avgMastery = mastery && mastery.length > 0
        ? mastery.reduce((sum, m) => sum + m.mastery_level, 0) / mastery.length
        : 0;

      const strongConcepts = mastery?.filter(m => m.mastery_level >= 0.8).length || 0;
      const weakConcepts = mastery?.filter(m => m.mastery_level < 0.5).length || 0;

      return {
        gaps: {
          total: totalGaps,
          resolved: resolvedGaps,
          critical: criticalGaps,
          resolution_rate: totalGaps > 0 ? resolvedGaps / totalGaps : 0
        },
        paths: {
          active: paths?.length || 0,
          avg_completion: paths && paths.length > 0
            ? paths.reduce((sum, p) => sum + p.completion_percentage, 0) / paths.length
            : 0
        },
        mastery: {
          average: avgMastery,
          strong_concepts: strongConcepts,
          weak_concepts: weakConcepts,
          total_concepts: mastery?.length || 0
        }
      };
    } catch (error) {
      logger.error('Error getting learning progress:', error);
      throw error;
    }
  }

  /**
   * Mark a gap as resolved
   */
  static async resolveGap(gapId: string, userId: string) {
    try {
      const { error } = await supabase
        .from('knowledge_gaps')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString()
        })
        .eq('id', gapId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error resolving gap:', error);
      throw error;
    }
  }

  /**
   * Get recommendations based on gaps
   */
  static async getRecommendations(userId: string) {
    try {
      const { data: gaps, error } = await supabase
        .from('knowledge_gaps')
        .select('*')
        .eq('user_id', userId)
        .eq('resolved', false)
        .order('severity', { ascending: false })
        .limit(5);

      if (error) throw error;

      const recommendations = [];

      for (const gap of gaps || []) {
        // Get relevant documents
        const { data: docs } = await supabase
          .from('documents')
          .select('id, title')
          .eq('user_id', userId)
          .limit(3);

        recommendations.push({
          gap_id: gap.id,
          concept: gap.concept,
          priority: gap.severity >= 0.8 ? 'high' : gap.severity >= 0.5 ? 'medium' : 'low',
          actions: gap.recommended_actions,
          resources: docs?.map(d => ({
            type: 'document',
            id: d.id,
            title: d.title
          })) || []
        });
      }

      return recommendations;
    } catch (error) {
      logger.error('Error getting recommendations:', error);
      throw error;
    }
  }
}