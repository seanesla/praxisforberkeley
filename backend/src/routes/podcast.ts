import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { AIService } from '../services/ai/aiService';
import { RAGService } from '../services/ragService';
import logger from '../utils/logger';

const router = express.Router();
const ragService = new RAGService();

// Start podcast session
router.post('/start', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { documentId, language = 'en' } = req.body;
  
  try {
    // Create podcast session
    const { data: session, error } = await supabase
      .from('podcast_sessions')
      .insert({
        user_id: authReq.user!.id,
        document_id: documentId,
        language,
        status: 'active',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      // Check if the error is due to missing table
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        logger.error('Podcast tables not found. Please run the podcast migration SQL in Supabase.');
        return res.status(503).json({ 
          error: 'Podcast feature is not yet set up. Please contact your administrator.',
          details: 'The podcast tables need to be created in the database.'
        });
      }
      throw error;
    }

    // Initialize voice service (Vapi integration would go here)
    const voiceConfig = {
      sessionId: session.id,
      language,
      voice: language === 'es' ? 'es-ES-Neural2-A' : 'en-US-Neural2-D'
    };

    res.json({ 
      sessionId: session.id,
      voiceConfig,
      message: 'Podcast session started'
    });
  } catch (error) {
    logger.error('Podcast start error:', error);
    res.status(500).json({ error: 'Failed to start podcast session' });
  }
});

// Transcribe voice input
router.post('/transcribe', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { sessionId, audioData, language = 'en' } = req.body;
  
  try {
    // In production, this would use a speech-to-text service
    // For now, we'll simulate transcription
    const mockTranscription = {
      text: req.body.mockText || 'This is a transcribed message',
      confidence: 0.95,
      timestamp: Date.now(),
      language
    };

    // Store transcription
    await supabase
      .from('podcast_transcripts')
      .insert({
        session_id: sessionId,
        user_id: authReq.user!.id,
        speaker: 'user',
        text: mockTranscription.text,
        timestamp: new Date().toISOString()
      });

    res.json(mockTranscription);
  } catch (error) {
    logger.error('Transcription error:', error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

// Generate AI response with voice
router.post('/respond', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { sessionId, message, documentId, language = 'en' } = req.body;
  
  try {
    // Get relevant context from document
    let context = {};
    if (documentId) {
      const suggestions = await ragService.query(message, {
        userId: authReq.user!.id,
        documentIds: [documentId],
        includeMetadata: true
      });
      context = { documentContext: suggestions };
    }

    // Generate AI response
    const aiResponse = await AIService.chat(message, {
      userId: authReq.user!.id,
      mode: 'podcast',
      language,
      ...context
    });

    // Store AI response
    await supabase
      .from('podcast_transcripts')
      .insert({
        session_id: sessionId,
        user_id: authReq.user!.id,
        speaker: 'ai',
        text: aiResponse,
        timestamp: new Date().toISOString()
      });

    // In production, this would generate audio using text-to-speech
    const audioUrl = `/api/podcast/audio/${sessionId}/${Date.now()}.mp3`;

    res.json({ 
      text: aiResponse,
      audioUrl,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('AI response error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// Handle voice commands
router.post('/voice-command', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { sessionId, text } = req.body;
  
  try {
    // Parse voice command
    const commandPatterns = {
      change_topic: /(?:let's talk about|switch to|change topic to)\s+(.+)/i,
      pause: /(?:pause|stop|wait)/i,
      resume: /(?:resume|continue|go on)/i,
      repeat: /(?:repeat|say that again|what did you say)/i,
      explain: /(?:explain|clarify|elaborate)/i
    };

    let command: string | null = null;
    let parameters: any = {};

    for (const [cmd, pattern] of Object.entries(commandPatterns)) {
      const match = text.match(pattern);
      if (match) {
        command = cmd;
        if (match[1]) {
          parameters = { topic: match[1] };
        }
        break;
      }
    }

    if (!command) {
      command = 'continue';
    }

    // Update session state based on command
    await supabase
      .from('podcast_sessions')
      .update({
        current_command: command,
        command_parameters: parameters,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    res.json({ command, parameters });
  } catch (error) {
    logger.error('Voice command error:', error);
    res.status(500).json({ error: 'Failed to process voice command' });
  }
});

// End podcast session
router.post('/end', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { sessionId } = req.body;
  
  try {
    // Get session transcripts
    const { data: transcripts } = await supabase
      .from('podcast_transcripts')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });

    // Generate summary
    const conversationText = transcripts
      ?.map(t => `${t.speaker}: ${t.text}`)
      .join('\n');

    const summary = await AIService.generateSummary(conversationText || '', {
      level: 'comprehensive',
      format: 'podcast_summary'
    });

    // Update session
    const { error } = await supabase
      .from('podcast_sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        summary,
        duration: Date.now() - new Date(transcripts?.[0]?.timestamp || Date.now()).getTime()
      })
      .eq('id', sessionId);

    if (error) throw error;

    res.json({ 
      summary,
      duration: transcripts?.length || 0,
      message: 'Podcast session ended'
    });
  } catch (error) {
    logger.error('End podcast error:', error);
    res.status(500).json({ error: 'Failed to end podcast session' });
  }
});

// Get podcast sessions
router.get('/sessions', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  
  try {
    const { data: sessions, error } = await supabase
      .from('podcast_sessions')
      .select(`
        *,
        documents (
          title,
          created_at
        )
      `)
      .eq('user_id', authReq.user!.id)
      .order('started_at', { ascending: false });

    if (error) throw error;

    res.json({ sessions });
  } catch (error) {
    logger.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get podcast sessions' });
  }
});

// Get session transcript
router.get('/transcript/:sessionId', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { sessionId } = req.params;
  
  try {
    const { data: transcripts, error } = await supabase
      .from('podcast_transcripts')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', authReq.user!.id)
      .order('timestamp', { ascending: true });

    if (error) throw error;

    res.json({ transcripts });
  } catch (error) {
    logger.error('Get transcript error:', error);
    res.status(500).json({ error: 'Failed to get transcript' });
  }
});

// Save transcript as note
router.post('/save-transcript', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { sessionId, title } = req.body;
  
  try {
    // Get session and transcripts
    const { data: session } = await supabase
      .from('podcast_sessions')
      .select('*, podcast_transcripts(*)')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Format transcript as note
    const noteContent = `# Podcast Transcript: ${title}\n\n` +
      `Date: ${new Date(session.started_at).toLocaleString()}\n` +
      `Duration: ${Math.round((session.duration || 0) / 60000)} minutes\n\n` +
      `## Summary\n${session.summary}\n\n` +
      `## Full Transcript\n` +
      session.podcast_transcripts
        .map((t: any) => `**${t.speaker === 'user' ? 'You' : 'AI'}:** ${t.text}`)
        .join('\n\n');

    // Save as note
    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        user_id: authReq.user!.id,
        title: `Podcast: ${title}`,
        content: noteContent,
        metadata: {
          type: 'podcast_transcript',
          session_id: sessionId
        }
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ noteId: note.id, message: 'Transcript saved as note' });
  } catch (error) {
    logger.error('Save transcript error:', error);
    res.status(500).json({ error: 'Failed to save transcript' });
  }
});

// Get podcast analytics
router.get('/analytics', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  
  try {
    // Get user's podcast stats
    const { data: stats } = await supabase
      .rpc('get_podcast_analytics', { p_user_id: authReq.user!.id });

    res.json({ 
      totalSessions: stats?.total_sessions || 0,
      totalDuration: stats?.total_duration || 0,
      averageDuration: stats?.average_duration || 0,
      topicsDiscussed: stats?.topics || [],
      lastSession: stats?.last_session || null
    });
  } catch (error) {
    logger.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get podcast analytics' });
  }
});

export default router;