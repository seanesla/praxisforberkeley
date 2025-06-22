import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { AIService } from '../services/ai/aiService';
import logger from '../utils/logger';

const router = express.Router();
const aiService = new AIService();

// Command types and actions
const COMMAND_TYPES = {
  NAVIGATION: 'navigation',
  CREATE: 'create',
  SEARCH: 'search',
  ACTION: 'action',
  SETTINGS: 'settings'
};

const COMMANDS = [
  // Navigation commands
  { pattern: /^(go to|open|navigate to) dashboard$/i, type: COMMAND_TYPES.NAVIGATION, action: 'dashboard' },
  { pattern: /^(go to|open|navigate to) documents?$/i, type: COMMAND_TYPES.NAVIGATION, action: 'documents' },
  { pattern: /^(go to|open|navigate to) notes?$/i, type: COMMAND_TYPES.NAVIGATION, action: 'notes' },
  { pattern: /^(go to|open|navigate to) flashcards?$/i, type: COMMAND_TYPES.NAVIGATION, action: 'flashcards' },
  { pattern: /^(go to|open|navigate to) mind ?maps?$/i, type: COMMAND_TYPES.NAVIGATION, action: 'mindmaps' },
  
  // Create commands
  { pattern: /^(create|new|add) note$/i, type: COMMAND_TYPES.CREATE, action: 'note' },
  { pattern: /^(create|new|add) smart note$/i, type: COMMAND_TYPES.CREATE, action: 'smart-note' },
  { pattern: /^(create|new|add) flashcard$/i, type: COMMAND_TYPES.CREATE, action: 'flashcard' },
  { pattern: /^(create|new|add) mind ?map$/i, type: COMMAND_TYPES.CREATE, action: 'mindmap' },
  { pattern: /^upload document$/i, type: COMMAND_TYPES.CREATE, action: 'upload' },
  
  // Search commands
  { pattern: /^(search|find) (.+)$/i, type: COMMAND_TYPES.SEARCH, action: 'search' },
  { pattern: /^(search|find) in documents? (.+)$/i, type: COMMAND_TYPES.SEARCH, action: 'search-documents' },
  { pattern: /^(search|find) in notes? (.+)$/i, type: COMMAND_TYPES.SEARCH, action: 'search-notes' },
  
  // Action commands
  { pattern: /^export (.+) as (pdf|markdown|json)$/i, type: COMMAND_TYPES.ACTION, action: 'export' },
  { pattern: /^generate flashcards from (.+)$/i, type: COMMAND_TYPES.ACTION, action: 'generate-flashcards' },
  { pattern: /^generate mind ?map from (.+)$/i, type: COMMAND_TYPES.ACTION, action: 'generate-mindmap' },
  { pattern: /^summarize (.+)$/i, type: COMMAND_TYPES.ACTION, action: 'summarize' },
  { pattern: /^start podcast mode$/i, type: COMMAND_TYPES.ACTION, action: 'podcast-mode' },
  
  // Settings commands
  { pattern: /^(toggle|switch) theme$/i, type: COMMAND_TYPES.SETTINGS, action: 'toggle-theme' },
  { pattern: /^(enable|disable) ai suggestions$/i, type: COMMAND_TYPES.SETTINGS, action: 'toggle-ai-suggestions' },
];

// Parse natural language command
router.post('/parse', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { command } = req.body;
  
  if (!command) {
    return res.status(400).json({ error: 'Command is required' });
  }
  
  try {
    // Log command to history
    await supabase
      .from('command_history')
      .insert({
        user_id: authReq.user!.id,
        command
      });

    // Try to match against known patterns
    for (const cmd of COMMANDS) {
      const match = command.match(cmd.pattern);
      if (match) {
        const result: any = {
          type: cmd.type,
          action: cmd.action,
          confidence: 1.0
        };
        
        // Extract parameters based on command type
        if (cmd.type === COMMAND_TYPES.SEARCH) {
          result.query = match[2] || match[1];
        } else if (cmd.action === 'export') {
          result.target = match[1];
          result.format = match[2];
        } else if (cmd.action.startsWith('generate-')) {
          result.source = match[1];
        } else if (cmd.action === 'summarize') {
          result.target = match[1];
        }
        
        return res.json({ 
          command: result,
          matched: true 
        });
      }
    }

    // If no pattern matches, use AI to understand intent
    const aiResult = await aiService.parseCommand(command);
    
    res.json({ 
      command: aiResult,
      matched: false,
      aiParsed: true 
    });
  } catch (error) {
    logger.error('Command parse error:', error);
    res.status(500).json({ error: 'Failed to parse command' });
  }
});

// Get command suggestions based on partial input
router.get('/suggestions', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { query = '' } = req.query;
  
  try {
    // Get user's recent commands
    const { data: recentCommands } = await supabase
      .from('command_history')
      .select('command')
      .eq('user_id', authReq.user!.id)
      .order('executed_at', { ascending: false })
      .limit(10);

    // Get user's recent documents and notes for context
    const [{ data: documents }, { data: notes }] = await Promise.all([
      supabase
        .from('documents')
        .select('id, title')
        .eq('user_id', authReq.user!.id)
        .order('updated_at', { ascending: false })
        .limit(5),
      supabase
        .from('notes')
        .select('id, title')
        .eq('user_id', authReq.user!.id)
        .order('updated_at', { ascending: false })
        .limit(5)
    ]);

    // Build suggestions
    const suggestions = [];
    
    // Add static command suggestions
    const staticSuggestions = [
      { command: 'create note', description: 'Create a new note', icon: 'document-text' },
      { command: 'create smart note', description: 'Create AI-powered smart note', icon: 'sparkles' },
      { command: 'upload document', description: 'Upload a new document', icon: 'cloud-upload' },
      { command: 'search', description: 'Search across all content', icon: 'search' },
      { command: 'go to dashboard', description: 'Navigate to dashboard', icon: 'home' },
      { command: 'generate flashcards', description: 'Create flashcards from document', icon: 'academic-cap' },
      { command: 'start podcast mode', description: 'Start interactive podcast', icon: 'microphone' },
    ];
    
    // Add document-specific suggestions
    documents?.forEach(doc => {
      suggestions.push({
        command: `open "${doc.title}"`,
        description: 'Open document',
        icon: 'document',
        entityId: doc.id
      });
      suggestions.push({
        command: `summarize "${doc.title}"`,
        description: 'Generate summary',
        icon: 'document-text',
        entityId: doc.id
      });
    });
    
    // Add note-specific suggestions
    notes?.forEach(note => {
      suggestions.push({
        command: `open note "${note.title}"`,
        description: 'Open note',
        icon: 'pencil',
        entityId: note.id
      });
    });
    
    // Filter based on query
    const filtered = [...staticSuggestions, ...suggestions]
      .filter(s => s.command.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10);

    res.json({ suggestions: filtered });
  } catch (error) {
    logger.error('Command suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// Execute a command (returns action details for frontend to handle)
router.post('/execute', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { command, parameters = {} } = req.body;
  
  try {
    // Based on command type, prepare execution details
    let executionResult = null;
    
    switch (command.type) {
      case COMMAND_TYPES.NAVIGATION:
        executionResult = {
          type: 'navigate',
          target: command.action,
          parameters
        };
        break;
        
      case COMMAND_TYPES.CREATE:
        executionResult = {
          type: 'create',
          entity: command.action,
          parameters
        };
        break;
        
      case COMMAND_TYPES.SEARCH:
        // Perform search and return results
        const searchQuery = parameters.query || command.query;
        // TODO: Implement actual search
        executionResult = {
          type: 'search',
          query: searchQuery,
          results: []
        };
        break;
        
      case COMMAND_TYPES.ACTION:
        executionResult = {
          type: 'action',
          action: command.action,
          parameters: { ...parameters, ...command }
        };
        break;
        
      case COMMAND_TYPES.SETTINGS:
        executionResult = {
          type: 'settings',
          setting: command.action,
          parameters
        };
        break;
    }
    
    res.json({ 
      success: true,
      execution: executionResult 
    });
  } catch (error) {
    logger.error('Command execution error:', error);
    res.status(500).json({ error: 'Failed to execute command' });
  }
});

export default router;