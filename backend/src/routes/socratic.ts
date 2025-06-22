import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { AIService } from '../services/ai/aiService';
import { RAGService } from '../services/ragService';
import logger from '../utils/logger';

const router = express.Router();
const ragService = new RAGService();

interface Question {
  id: string;
  text: string;
  type: 'open' | 'multiple-choice' | 'reflection' | 'application';
  options?: string[];
  hint?: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  concept: string;
}

// Start Socratic dialogue session
router.post('/start', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { documentId, topic, documentTitle } = req.body;
  
  try {
    // Create session
    const { data: session, error } = await supabase
      .from('socratic_sessions')
      .insert({
        user_id: authReq.user!.id,
        document_id: documentId,
        topic,
        status: 'active',
        metadata: { documentTitle }
      })
      .select()
      .single();

    if (error) throw error;

    // Get document content for context
    const { data: document } = await supabase
      .from('documents')
      .select('content')
      .eq('id', documentId)
      .single();

    // Generate first question based on topic and document
    const firstQuestion = await generateQuestion(
      document?.content || '',
      topic,
      'easy',
      []
    );

    // Store question
    await supabase
      .from('socratic_questions')
      .insert({
        session_id: session.id,
        question: firstQuestion,
        order_index: 1
      });

    res.json({ 
      sessionId: session.id,
      firstQuestion 
    });
  } catch (error) {
    logger.error('Start Socratic session error:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// Get next question
router.post('/next-question', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { sessionId, previousResponses, topic, depth } = req.body;
  
  try {
    // Get session and document
    const { data: session } = await supabase
      .from('socratic_sessions')
      .select('*, documents(content)')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Determine difficulty based on performance
    const correctCount = previousResponses.filter((r: any) => r.correct).length;
    const accuracy = correctCount / previousResponses.length;
    const difficulty = accuracy > 0.8 ? 'hard' : accuracy > 0.6 ? 'medium' : 'easy';

    // Get concepts already covered
    const coveredConcepts = previousResponses.map((r: any) => r.concept);

    // Generate next question
    const nextQuestion = await generateQuestion(
      session.documents?.content || '',
      topic,
      difficulty,
      coveredConcepts,
      depth
    );

    if (nextQuestion) {
      // Store question
      await supabase
        .from('socratic_questions')
        .insert({
          session_id: sessionId,
          question: nextQuestion,
          order_index: previousResponses.length + 1
        });

      res.json({ question: nextQuestion });
    } else {
      // No more questions
      res.json({ question: null, complete: true });
    }
  } catch (error) {
    logger.error('Get next question error:', error);
    res.status(500).json({ error: 'Failed to get next question' });
  }
});

// Evaluate answer
router.post('/evaluate', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { sessionId, questionId, answer, questionType } = req.body;
  
  try {
    // Get the question details
    const { data: questionData } = await supabase
      .from('socratic_questions')
      .select('question')
      .eq('session_id', sessionId)
      .eq('question->id', questionId)
      .single();

    const question = questionData?.question as Question;

    // Evaluate based on question type
    let evaluation;
    if (questionType === 'multiple-choice') {
      evaluation = {
        correct: answer === question.options?.[0], // Assuming first option is correct
        explanation: question.explanation
      };
    } else {
      // Use AI to evaluate open-ended answers
      evaluation = await aiService.evaluateAnswer(
        question.text,
        answer,
        question.concept,
        questionType
      );
    }

    // Store response
    await supabase
      .from('socratic_responses')
      .insert({
        session_id: sessionId,
        question_id: questionId,
        answer,
        evaluation,
        correct: evaluation.correct
      });

    // Suggest depth adjustment based on performance
    const suggestedDepth = evaluation.correct ? 
      Math.min(5, (req.body.depth || 1) + 1) : 
      Math.max(1, (req.body.depth || 1) - 1);

    res.json({
      correct: evaluation.correct,
      explanation: evaluation.explanation,
      suggestedDepth
    });
  } catch (error) {
    logger.error('Evaluate answer error:', error);
    res.status(500).json({ error: 'Failed to evaluate answer' });
  }
});

// Get session summary
router.post('/summary', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { sessionId, responses, topic } = req.body;
  
  try {
    // Calculate statistics
    const totalQuestions = responses.length;
    const correctAnswers = responses.filter((r: any) => r.correct).length;
    const accuracy = (correctAnswers / totalQuestions) * 100;
    
    // Get unique concepts covered
    const concepts = [...new Set(responses.map((r: any) => r.concept))];

    // Generate learning summary
    const summary = await aiService.generateLearningSummary(
      topic,
      responses,
      concepts,
      accuracy
    );

    // Update session
    await supabase
      .from('socratic_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        summary,
        metadata: {
          totalQuestions,
          correctAnswers,
          accuracy,
          concepts
        }
      })
      .eq('id', sessionId);

    res.json({
      summary,
      statistics: {
        totalQuestions,
        correctAnswers,
        accuracy,
        conceptsCovered: concepts.length
      }
    });
  } catch (error) {
    logger.error('Get summary error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Get session history
router.get('/sessions', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  
  try {
    const { data: sessions, error } = await supabase
      .from('socratic_sessions')
      .select(`
        *,
        documents (
          title
        )
      `)
      .eq('user_id', authReq.user!.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ sessions });
  } catch (error) {
    logger.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Helper function to generate questions
async function generateQuestion(
  documentContent: string,
  topic: string,
  difficulty: 'easy' | 'medium' | 'hard',
  coveredConcepts: string[],
  depth: number = 1
): Promise<Question | null> {
  try {
    // Extract relevant content based on topic
    const relevantContent = await ragService.query(topic, {
      documentContent,
      limit: 3
    });

    // Generate question using AI
    const prompt = `
      Generate a Socratic question about "${topic}" based on this content.
      Difficulty: ${difficulty}
      Depth level: ${depth}
      Already covered concepts: ${coveredConcepts.join(', ')}
      
      Question types:
      - Easy: Basic understanding and recall
      - Medium: Application and analysis
      - Hard: Synthesis and evaluation
      
      For depth levels:
      - Level 1: Surface understanding
      - Level 2-3: Connections and implications
      - Level 4-5: Deep insights and critiques
      
      Create a question that guides the learner to discover insights themselves.
    `;

    const question = await aiService.generateSocraticQuestion(
      prompt,
      relevantContent,
      difficulty,
      topic
    );

    return question;
  } catch (error) {
    logger.error('Generate question error:', error);
    return null;
  }
}

export default router;