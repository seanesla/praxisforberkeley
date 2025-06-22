import { supabase } from '../config/supabase';
import { AIService } from './ai/aiService';
import { logger } from '../utils/logger';

export interface ExerciseType {
  type: 'multiple_choice' | 'fill_blank' | 'true_false' | 'matching' | 
        'ordering' | 'short_answer' | 'essay' | 'code_completion';
  difficulty: number;
}

export interface Exercise {
  id?: string;
  exercise_type: string;
  question: string;
  correct_answer: any;
  options?: any;
  hints?: string[];
  explanation?: string;
  points?: number;
  time_limit?: number;
  difficulty?: number;
  concepts?: string[];
  skills?: string[];
}

export class ExerciseEngineService {
  /**
   * Generate exercises from document content
   */
  static async generateExercises(
    documentId: string,
    userId: string,
    count: number = 10,
    types?: ExerciseType[]
  ) {
    try {
      // Get document content
      const { data: document, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      // Default exercise types if not specified
      const exerciseTypes = types || [
        { type: 'multiple_choice', difficulty: 0.5 },
        { type: 'fill_blank', difficulty: 0.5 },
        { type: 'true_false', difficulty: 0.3 },
        { type: 'short_answer', difficulty: 0.7 }
      ];

      // Generate exercises using AI
      const exercises: Exercise[] = [];
      const typesPerExercise = Math.ceil(count / exerciseTypes.length);

      for (const exerciseType of exerciseTypes) {
        const typeCount = Math.min(typesPerExercise, count - exercises.length);
        if (typeCount <= 0) break;

        const generated = await this.generateExercisesByType(
          document.content || '',
          document.title,
          exerciseType,
          typeCount
        );

        exercises.push(...generated);
      }

      return exercises;
    } catch (error) {
      logger.error('Error generating exercises:', error);
      throw error;
    }
  }

  /**
   * Generate specific type of exercises
   */
  private static async generateExercisesByType(
    content: string,
    title: string,
    exerciseType: ExerciseType,
    count: number
  ): Promise<Exercise[]> {
    try {
      const aiService = new AIService();
      const prompt = this.buildExercisePrompt(content, title, exerciseType, count);
      
      const response = await aiService.generateResponse(
        'system',
        {
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          maxTokens: 2000
        }
      );

      if (!response) throw new Error('Failed to generate exercises');

      // Parse AI response
      const exercises = this.parseExerciseResponse(response.content, exerciseType);
      return exercises;
    } catch (error) {
      logger.error('Error generating exercises by type:', error);
      return [];
    }
  }

  /**
   * Build prompt for exercise generation
   */
  private static buildExercisePrompt(
    content: string,
    title: string,
    exerciseType: ExerciseType,
    count: number
  ): string {
    const typeInstructions = {
      multiple_choice: `Generate ${count} multiple choice questions with 4 options each. Format:
Q: [question]
A) [correct answer]
B) [incorrect option]
C) [incorrect option]
D) [incorrect option]
Correct: A
Explanation: [brief explanation]`,
      
      fill_blank: `Generate ${count} fill-in-the-blank questions. Format:
Q: [sentence with _____ for blank]
Answer: [correct word/phrase]
Hint: [optional hint]`,
      
      true_false: `Generate ${count} true/false questions. Format:
Statement: [statement]
Answer: [True/False]
Explanation: [why it's true or false]`,
      
      matching: `Generate ${count} matching exercises with 4-5 pairs each. Format:
Set A: [item1], [item2], [item3], [item4]
Set B: [match1], [match2], [match3], [match4]
Answers: item1-match2, item2-match4, etc.`,
      
      ordering: `Generate ${count} ordering/sequencing questions. Format:
Q: [question about order/sequence]
Items: [item1], [item2], [item3], [item4]
Correct Order: [2, 4, 1, 3]`,
      
      short_answer: `Generate ${count} short answer questions. Format:
Q: [question]
Keywords: [key concepts that should be in answer]
Sample Answer: [example correct answer]`,
      
      essay: `Generate ${count} essay questions. Format:
Q: [essay prompt]
Key Points: [main points to cover]
Grading Criteria: [what to look for]`,
      
      code_completion: `Generate ${count} code completion exercises. Format:
Context: [problem description]
Code: [code with missing parts marked as ???]
Solution: [completed code]
Explanation: [why this solution works]`
    };

    return `Based on this document about "${title}":

${content.substring(0, 3000)}...

${typeInstructions[exerciseType.type]}

Make questions at difficulty level ${exerciseType.difficulty} (0=easy, 1=hard).
Focus on key concepts and ensure educational value.`;
  }

  /**
   * Parse AI response into exercise objects
   */
  private static parseExerciseResponse(
    response: string,
    exerciseType: ExerciseType
  ): Exercise[] {
    const exercises: Exercise[] = [];
    
    try {
      // Split response into individual exercises
      const blocks = response.split(/\n\n+/);
      
      for (const block of blocks) {
        const exercise = this.parseExerciseBlock(block, exerciseType);
        if (exercise) {
          exercises.push(exercise);
        }
      }
    } catch (error) {
      logger.error('Error parsing exercise response:', error);
    }

    return exercises;
  }

  /**
   * Parse individual exercise block
   */
  private static parseExerciseBlock(
    block: string,
    exerciseType: ExerciseType
  ): Exercise | null {
    try {
      const lines = block.trim().split('\n');
      if (lines.length === 0) return null;

      switch (exerciseType.type) {
        case 'multiple_choice':
          return this.parseMultipleChoice(lines, exerciseType.difficulty);
        
        case 'fill_blank':
          return this.parseFillBlank(lines, exerciseType.difficulty);
        
        case 'true_false':
          return this.parseTrueFalse(lines, exerciseType.difficulty);
        
        case 'short_answer':
          return this.parseShortAnswer(lines, exerciseType.difficulty);
        
        case 'matching':
          return this.parseMatching(lines, exerciseType.difficulty);
        
        case 'ordering':
          return this.parseOrdering(lines, exerciseType.difficulty);
        
        case 'essay':
          return this.parseEssay(lines, exerciseType.difficulty);
        
        case 'code_completion':
          return this.parseCodeCompletion(lines, exerciseType.difficulty);
        
        default:
          return null;
      }
    } catch (error) {
      return null;
    }
  }

  private static parseMultipleChoice(lines: string[], difficulty: number): Exercise {
    const question = lines[0].replace(/^Q:\s*/i, '');
    const options = lines.slice(1, 5).map(line => 
      line.replace(/^[A-D]\)\s*/i, '').trim()
    );
    const correctIndex = lines[5]?.match(/Correct:\s*([A-D])/i)?.[1];
    const explanation = lines[6]?.replace(/^Explanation:\s*/i, '');

    return {
      exercise_type: 'multiple_choice',
      question,
      correct_answer: { index: correctIndex?.charCodeAt(0) - 65, text: options[0] },
      options: { choices: options },
      explanation,
      difficulty,
      points: 1
    };
  }

  private static parseFillBlank(lines: string[], difficulty: number): Exercise {
    const question = lines[0].replace(/^Q:\s*/i, '');
    const answer = lines[1]?.replace(/^Answer:\s*/i, '');
    const hint = lines[2]?.replace(/^Hint:\s*/i, '');

    return {
      exercise_type: 'fill_blank',
      question,
      correct_answer: { text: answer },
      hints: hint ? [hint] : [],
      difficulty,
      points: 1
    };
  }

  private static parseTrueFalse(lines: string[], difficulty: number): Exercise {
    const statement = lines[0].replace(/^Statement:\s*/i, '');
    const answer = lines[1]?.replace(/^Answer:\s*/i, '').toLowerCase() === 'true';
    const explanation = lines[2]?.replace(/^Explanation:\s*/i, '');

    return {
      exercise_type: 'true_false',
      question: statement,
      correct_answer: { value: answer },
      explanation,
      difficulty,
      points: 1
    };
  }

  private static parseShortAnswer(lines: string[], difficulty: number): Exercise {
    const question = lines[0].replace(/^Q:\s*/i, '');
    const keywords = lines[1]?.replace(/^Keywords:\s*/i, '').split(',').map(k => k.trim());
    const sampleAnswer = lines[2]?.replace(/^Sample Answer:\s*/i, '');

    return {
      exercise_type: 'short_answer',
      question,
      correct_answer: { keywords, sample: sampleAnswer },
      difficulty,
      points: 2
    };
  }

  private static parseMatching(lines: string[], difficulty: number): Exercise {
    const setALine = lines.find(l => l.startsWith('Set A:'));
    const setBLine = lines.find(l => l.startsWith('Set B:'));
    const answersLine = lines.find(l => l.startsWith('Answers:'));
    
    const setA = setALine?.replace(/^Set A:\s*/i, '').split(',').map(item => item.trim());
    const setB = setBLine?.replace(/^Set B:\s*/i, '').split(',').map(item => item.trim());
    
    const pairs: Record<string, string> = {};
    answersLine?.replace(/^Answers:\s*/i, '').split(',').forEach(pair => {
      const [left, right] = pair.trim().split('-');
      pairs[left.trim()] = right.trim();
    });

    return {
      exercise_type: 'matching',
      question: 'Match the items from Set A with the corresponding items in Set B',
      correct_answer: { pairs },
      options: { setA, setB },
      difficulty,
      points: 3
    };
  }

  private static parseOrdering(lines: string[], difficulty: number): Exercise {
    const question = lines[0].replace(/^Q:\s*/i, '');
    const itemsLine = lines.find(l => l.startsWith('Items:'));
    const orderLine = lines.find(l => l.startsWith('Correct Order:'));
    
    const items = itemsLine?.replace(/^Items:\s*/i, '').split(',').map(item => item.trim());
    const correctOrder = orderLine?.replace(/^Correct Order:\s*/i, '')
      .replace(/[\[\]]/g, '')
      .split(',')
      .map(n => parseInt(n.trim()) - 1); // Convert to 0-based index

    return {
      exercise_type: 'ordering',
      question,
      correct_answer: { order: correctOrder },
      options: { items },
      difficulty,
      points: 2
    };
  }

  private static parseEssay(lines: string[], difficulty: number): Exercise {
    const question = lines[0].replace(/^Q:\s*/i, '');
    const keyPointsLine = lines.find(l => l.startsWith('Key Points:'));
    const criteriaLine = lines.find(l => l.startsWith('Grading Criteria:'));
    
    const keyPoints = keyPointsLine?.replace(/^Key Points:\s*/i, '').split(',').map(p => p.trim());
    const criteria = criteriaLine?.replace(/^Grading Criteria:\s*/i, '');

    return {
      exercise_type: 'essay',
      question,
      correct_answer: { keyPoints, criteria },
      difficulty,
      points: 5,
      time_limit: 900 // 15 minutes
    };
  }

  private static parseCodeCompletion(lines: string[], difficulty: number): Exercise {
    const contextLine = lines.find(l => l.startsWith('Context:'));
    const codeStart = lines.findIndex(l => l.startsWith('Code:'));
    const solutionStart = lines.findIndex(l => l.startsWith('Solution:'));
    const explanationLine = lines.find(l => l.startsWith('Explanation:'));
    
    const context = contextLine?.replace(/^Context:\s*/i, '');
    const code = lines.slice(codeStart + 1, solutionStart).join('\n');
    const solution = lines.slice(solutionStart + 1, lines.findIndex(l => l.startsWith('Explanation:'))).join('\n');
    const explanation = explanationLine?.replace(/^Explanation:\s*/i, '');

    return {
      exercise_type: 'code_completion',
      question: context || 'Complete the code below',
      correct_answer: { solution },
      options: { template: code },
      explanation,
      difficulty,
      points: 4
    };
  }

  /**
   * Create exercise set
   */
  static async createExerciseSet(
    userId: string,
    title: string,
    description: string,
    documentId?: string,
    exercises?: Exercise[]
  ) {
    try {
      // Create exercise set
      const { data: set, error: setError } = await supabase
        .from('exercise_sets')
        .insert({
          user_id: userId,
          title,
          description,
          document_id: documentId,
          exercise_count: exercises?.length || 0
        })
        .select()
        .single();

      if (setError) throw setError;

      // Add exercises if provided
      if (exercises && exercises.length > 0) {
        const exercisesWithSetId = exercises.map((ex, index) => ({
          ...ex,
          set_id: set.id,
          order_index: index
        }));

        const { error: exercisesError } = await supabase
          .from('exercises')
          .insert(exercisesWithSetId);

        if (exercisesError) throw exercisesError;
      }

      return set;
    } catch (error) {
      logger.error('Error creating exercise set:', error);
      throw error;
    }
  }

  /**
   * Evaluate exercise attempt
   */
  static async evaluateAttempt(
    exerciseId: string,
    userId: string,
    userAnswer: any,
    sessionId?: string
  ) {
    try {
      // Get exercise details
      const { data: exercise, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', exerciseId)
        .single();

      if (error) throw error;

      // Evaluate based on exercise type
      const evaluation = await this.evaluateAnswer(exercise, userAnswer);

      // Record attempt
      const { data: attempt, error: attemptError } = await supabase
        .from('exercise_attempts')
        .insert({
          user_id: userId,
          exercise_id: exerciseId,
          session_id: sessionId,
          user_answer: userAnswer,
          is_correct: evaluation.isCorrect,
          points_earned: evaluation.isCorrect ? exercise.points : 0,
          feedback: evaluation.feedback
        })
        .select()
        .single();

      if (attemptError) throw attemptError;

      // Update analytics
      await this.updateExerciseAnalytics(userId, exercise, evaluation.isCorrect);

      return {
        attempt,
        evaluation
      };
    } catch (error) {
      logger.error('Error evaluating attempt:', error);
      throw error;
    }
  }

  /**
   * Evaluate answer based on exercise type
   */
  private static async evaluateAnswer(exercise: any, userAnswer: any) {
    switch (exercise.exercise_type) {
      case 'multiple_choice':
        const isCorrectMC = userAnswer.index === exercise.correct_answer.index;
        return {
          isCorrect: isCorrectMC,
          feedback: isCorrectMC ? 'Correct!' : `Incorrect. ${exercise.explanation || ''}`
        };

      case 'true_false':
        const isCorrectTF = userAnswer.value === exercise.correct_answer.value;
        return {
          isCorrect: isCorrectTF,
          feedback: isCorrectTF ? 'Correct!' : `Incorrect. ${exercise.explanation || ''}`
        };

      case 'fill_blank':
        const isCorrectFB = userAnswer.text?.toLowerCase().trim() === 
                           exercise.correct_answer.text?.toLowerCase().trim();
        return {
          isCorrect: isCorrectFB,
          feedback: isCorrectFB ? 'Correct!' : `Incorrect. The answer is: ${exercise.correct_answer.text}`
        };

      case 'short_answer':
        // Use AI to evaluate short answers
        const aiService = new AIService();
        const evaluation = await aiService.generateResponse('system', {
          messages: [{
            role: 'user',
            content: `Evaluate this answer:
Question: ${exercise.question}
User Answer: ${userAnswer.text}
Keywords to look for: ${exercise.correct_answer.keywords?.join(', ')}
Sample Answer: ${exercise.correct_answer.sample}

Is the answer correct? Provide brief feedback.`
          }],
          temperature: 0.3,
          maxTokens: 200
        });

        const isCorrect = evaluation?.content.toLowerCase().includes('correct');
        return {
          isCorrect,
          feedback: evaluation?.content || 'Unable to evaluate answer'
        };

      case 'matching':
        let correctMatches = 0;
        const totalPairs = Object.keys(exercise.correct_answer.pairs).length;
        
        for (const [left, right] of Object.entries(userAnswer.pairs || {})) {
          if (exercise.correct_answer.pairs[left] === right) {
            correctMatches++;
          }
        }
        
        const matchingScore = correctMatches / totalPairs;
        return {
          isCorrect: matchingScore >= 0.8, // 80% threshold
          feedback: `You matched ${correctMatches} out of ${totalPairs} pairs correctly.`
        };

      case 'ordering':
        const userOrder = userAnswer.order || [];
        const correctOrder = exercise.correct_answer.order || [];
        let correctPositions = 0;
        
        for (let i = 0; i < correctOrder.length; i++) {
          if (userOrder[i] === correctOrder[i]) {
            correctPositions++;
          }
        }
        
        const orderingScore = correctPositions / correctOrder.length;
        return {
          isCorrect: orderingScore === 1,
          feedback: orderingScore === 1 
            ? 'Perfect! All items are in the correct order.' 
            : `${correctPositions} out of ${correctOrder.length} items are in the correct position.`
        };

      case 'essay':
        // Use AI to evaluate essays
        const essayAI = new AIService();
        const essayEval = await essayAI.generateResponse('system', {
          messages: [{
            role: 'user',
            content: `Evaluate this essay:
Question: ${exercise.question}
User Essay: ${userAnswer.text}
Key Points to cover: ${exercise.correct_answer.keyPoints?.join(', ')}
Grading Criteria: ${exercise.correct_answer.criteria}

Provide a score (0-100) and detailed feedback.`
          }],
          temperature: 0.3,
          maxTokens: 300
        });

        const scoreMatch = essayEval?.content.match(/\b(\d{1,3})\b/);
        const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
        
        return {
          isCorrect: score >= 70,
          feedback: essayEval?.content || 'Unable to evaluate essay'
        };

      case 'code_completion':
        // Use AI to evaluate code
        const codeAI = new AIService();
        const codeEval = await codeAI.generateResponse('system', {
          messages: [{
            role: 'user',
            content: `Evaluate this code completion:
Template: ${exercise.options.template}
User Solution: ${userAnswer.code}
Expected Solution: ${exercise.correct_answer.solution}

Is the code functionally correct? Consider syntax, logic, and whether it solves the problem.`
          }],
          temperature: 0.3,
          maxTokens: 200
        });

        const codeCorrect = codeEval?.content.toLowerCase().includes('correct') ||
                           codeEval?.content.toLowerCase().includes('works');
        
        return {
          isCorrect: codeCorrect,
          feedback: codeEval?.content || 'Unable to evaluate code'
        };

      default:
        return {
          isCorrect: false,
          feedback: 'Exercise type not supported for automatic evaluation'
        };
    }
  }

  /**
   * Update user's exercise analytics
   */
  private static async updateExerciseAnalytics(
    userId: string,
    exercise: any,
    isCorrect: boolean
  ) {
    try {
      // Get or create analytics record
      const { data: analytics, error: fetchError } = await supabase
        .from('exercise_analytics')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (!analytics) {
        // Create new analytics record
        await supabase
          .from('exercise_analytics')
          .insert({
            user_id: userId,
            total_attempts: 1,
            unique_exercises: 1,
            overall_accuracy: isCorrect ? 1.0 : 0.0,
            by_type_stats: {
              [exercise.exercise_type]: {
                attempts: 1,
                correct: isCorrect ? 1 : 0
              }
            }
          });
      } else {
        // Update existing analytics
        const typeStats = analytics.by_type_stats || {};
        const currentTypeStats = typeStats[exercise.exercise_type] || { attempts: 0, correct: 0 };
        
        typeStats[exercise.exercise_type] = {
          attempts: currentTypeStats.attempts + 1,
          correct: currentTypeStats.correct + (isCorrect ? 1 : 0)
        };

        const totalAttempts = analytics.total_attempts + 1;
        const totalCorrect = Object.values(typeStats).reduce(
          (sum: number, stats: any) => sum + stats.correct, 0
        );

        await supabase
          .from('exercise_analytics')
          .update({
            total_attempts: totalAttempts,
            overall_accuracy: totalCorrect / totalAttempts,
            by_type_stats: typeStats,
            last_activity_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      }
    } catch (error) {
      logger.error('Error updating exercise analytics:', error);
    }
  }

  /**
   * Start an exercise session
   */
  static async startSession(userId: string, documentId: string) {
    try {
      const { data: session, error } = await supabase
        .from('exercise_sessions')
        .insert({
          user_id: userId,
          document_id: documentId,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return session;
    } catch (error) {
      logger.error('Error starting exercise session:', error);
      throw error;
    }
  }

  /**
   * Complete an exercise session
   */
  static async completeSession(sessionId: string, stats: any) {
    try {
      const { error } = await supabase
        .from('exercise_sessions')
        .update({
          completed_at: new Date().toISOString(),
          exercises_completed: stats.completed,
          correct_answers: stats.correct,
          total_points_earned: stats.points,
          performance_by_type: stats.byType,
          duration_seconds: stats.duration
        })
        .eq('id', sessionId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error completing exercise session:', error);
      throw error;
    }
  }

  /**
   * Get adaptive difficulty based on performance
   */
  static async getAdaptiveDifficulty(userId: string, exerciseType?: string): Promise<number> {
    try {
      const { data: responses, error } = await supabase
        .from('exercise_responses')
        .select('is_correct, exercises!inner(difficulty, exercise_type)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (!responses || responses.length === 0) {
        return 0.5; // Default medium difficulty
      }

      // Filter by type if specified
      const relevantResponses = exerciseType
        ? responses.filter(r => r.exercises?.exercise_type === exerciseType)
        : responses;

      if (relevantResponses.length === 0) {
        return 0.5;
      }

      // Calculate success rate
      const correctCount = relevantResponses.filter(r => r.is_correct).length;
      const successRate = correctCount / relevantResponses.length;

      // Adjust difficulty based on success rate
      let newDifficulty = 0.5;
      if (successRate > 0.8) {
        newDifficulty = Math.min(1, newDifficulty + 0.1);
      } else if (successRate < 0.4) {
        newDifficulty = Math.max(0, newDifficulty - 0.1);
      }

      return newDifficulty;
    } catch (error) {
      logger.error('Error calculating adaptive difficulty:', error);
      return 0.5;
    }
  }

  /**
   * Get exercise recommendations
   */
  static async getRecommendations(userId: string, documentId?: string) {
    try {
      // Get user's weak areas
      const { data: analytics, error } = await supabase
        .from('analytics_metrics')
        .select('*')
        .eq('user_id', userId)
        .eq('metric_type', 'exercise_performance')
        .order('recorded_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      const weakTypes = [];
      if (analytics && analytics[0]?.dimensions?.by_type) {
        for (const [type, stats] of Object.entries(analytics[0].dimensions.by_type)) {
          if ((stats as any).accuracy < 0.6) {
            weakTypes.push(type);
          }
        }
      }

      // Recommend exercises focusing on weak areas
      const recommendations = {
        focusAreas: weakTypes,
        suggestedTypes: weakTypes.length > 0 ? weakTypes : ['multiple_choice', 'short_answer'],
        difficulty: await this.getAdaptiveDifficulty(userId),
        count: 10
      };

      return recommendations;
    } catch (error) {
      logger.error('Error getting exercise recommendations:', error);
      throw error;
    }
  }

  /**
   * Save exercises to database
   */
  static async saveExercises(exercises: Exercise[], documentId: string, userId: string) {
    try {
      const exercisesToInsert = exercises.map(ex => ({
        ...ex,
        document_id: documentId,
        user_id: userId
      }));

      const { data, error } = await supabase
        .from('exercises')
        .insert(exercisesToInsert)
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error saving exercises:', error);
      throw error;
    }
  }
}