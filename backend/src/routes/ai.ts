import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { AIService } from '../services/ai/aiService';
import { RAGService } from '../services/ragService';
import logger from '../utils/logger';

const router = express.Router();
const ragService = new RAGService();

// Chat with AI
router.post('/chat', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { message, context = {}, mode = 'general' } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  try {
    let response;
    
    if (mode === 'grounded' && context.documentIds?.length > 0) {
      // Use RAG for grounded responses
      response = await ragService.query(message, {
        userId: authReq.user!.id,
        documentIds: context.documentIds,
        includeMetadata: true
      });
    } else {
      // General AI chat
      response = await AIService.chat(message, {
        userId: authReq.user!.id,
        ...context
      });
    }

    res.json({ response });
  } catch (error) {
    logger.error('AI chat error:', error);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

// Get instant context suggestions for smart notes
router.post('/context-suggestions', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { noteContent, currentSentence, recentContext, documentIds, cursorPosition } = req.body;
  
  try {
    // Use recent context for better relevance
    const queryText = recentContext || currentSentence || noteContent;
    
    // Get relevant context from documents with enhanced options
    const suggestions = await ragService.getContextSuggestions(
      queryText,
      {
        userId: authReq.user!.id,
        documentIds,
        limit: 5, // Get more suggestions for better filtering
        minScore: 0.7 // 70% similarity threshold as per README
      }
    );

    // Get document titles for better source attribution
    const documentTitles = await Promise.all(
      suggestions.map(async (s) => {
        const { data: doc } = await supabase
          .from('documents')
          .select('title')
          .eq('id', s.metadata.documentId)
          .single();
        return doc?.title || 'Unknown Document';
      })
    );

    // Format suggestions with enhanced metadata
    const formattedSuggestions = suggestions.map((s, index) => ({
      text: s.content,
      source: s.metadata.source,
      documentId: s.metadata.documentId,
      documentTitle: documentTitles[index],
      relevance: s.score,
      pageNumber: s.metadata.pageNumber,
      paragraph: s.metadata.paragraph
    }));

    res.json({ suggestions: formattedSuggestions });
  } catch (error) {
    logger.error('Context suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// Generate summary
router.post('/summarize', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { documentId, level = 'brief' } = req.body;
  
  if (!documentId) {
    return res.status(400).json({ error: 'Document ID is required' });
  }
  
  try {
    // Get document
    const { data: document, error } = await supabase
      .from('documents')
      .select('content, title')
      .eq('id', documentId)
      .eq('user_id', authReq.user!.id)
      .single();

    if (error || !document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Generate summary
    const summary = await AIService.generateSummary(document.content, {
      level,
      title: document.title
    });

    res.json({ summary });
  } catch (error) {
    logger.error('Summarization error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Generate flashcards from document
router.post('/generate-flashcards', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { documentId, count = 10 } = req.body;
  
  if (!documentId) {
    return res.status(400).json({ error: 'Document ID is required' });
  }
  
  try {
    // Get document
    const { data: document, error } = await supabase
      .from('documents')
      .select('content, title')
      .eq('id', documentId)
      .eq('user_id', authReq.user!.id)
      .single();

    if (error || !document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Generate flashcards using AI
    const flashcards = await AIService.generateFlashcards(document.content, {
      count,
      difficulty: 'mixed',
      documentTitle: document.title
    });

    // Save flashcards to database
    const savedFlashcards = await Promise.all(
      flashcards.map(async (card) => {
        const { data, error } = await supabase
          .from('flashcards')
          .insert({
            user_id: authReq.user!.id,
            front: card.question,
            back: card.answer,
            document_id: documentId,
            auto_generated: true,
            metadata: { difficulty: card.difficulty }
          })
          .select()
          .single();
        
        return data;
      })
    );

    res.json({ flashcards: savedFlashcards });
  } catch (error) {
    logger.error('Flashcard generation error:', error);
    res.status(500).json({ error: 'Failed to generate flashcards' });
  }
});

// Generate mind map from document/notes
router.post('/generate-mindmap', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { documentId, noteId, text } = req.body;
  
  try {
    let content = text;
    
    if (documentId) {
      const { data: document } = await supabase
        .from('documents')
        .select('content')
        .eq('id', documentId)
        .eq('user_id', authReq.user!.id)
        .single();
      
      content = document?.content || '';
    } else if (noteId) {
      const { data: note } = await supabase
        .from('notes')
        .select('content')
        .eq('id', noteId)
        .eq('user_id', authReq.user!.id)
        .single();
      
      content = note?.content || '';
    }
    
    if (!content) {
      return res.status(400).json({ error: 'No content provided' });
    }

    // Generate mind map structure using AI
    const mindMapData = await AIService.generateMindMap(content);

    // Save mind map
    const { data: mindMap, error } = await supabase
      .from('mind_maps')
      .insert({
        user_id: authReq.user!.id,
        title: mindMapData.title,
        data: mindMapData,
        source_document_id: documentId,
        source_note_id: noteId
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({ mindMap });
  } catch (error) {
    logger.error('Mind map generation error:', error);
    res.status(500).json({ error: 'Failed to generate mind map' });
  }
});

// Change perspective on content
router.post('/change-perspective', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { content, perspective = 'beginner' } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }
  
  try {
    const rewritten = await AIService.changePerspective(content, perspective);
    res.json({ rewritten });
  } catch (error) {
    logger.error('Perspective change error:', error);
    res.status(500).json({ error: 'Failed to change perspective' });
  }
});

// Knowledge gap detection
router.post('/detect-gaps', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { documentIds } = req.body;
  
  if (!documentIds || documentIds.length === 0) {
    return res.status(400).json({ error: 'Document IDs are required' });
  }
  
  try {
    // Get documents
    const { data: documents } = await supabase
      .from('documents')
      .select('id, title, content')
      .in('id', documentIds)
      .eq('user_id', authReq.user!.id);

    if (!documents || documents.length === 0) {
      return res.status(404).json({ error: 'Documents not found' });
    }

    // Detect knowledge gaps
    const gaps = await AIService.detectKnowledgeGaps(documents);
    
    res.json({ gaps });
  } catch (error) {
    logger.error('Knowledge gap detection error:', error);
    res.status(500).json({ error: 'Failed to detect knowledge gaps' });
  }
});

export default router;