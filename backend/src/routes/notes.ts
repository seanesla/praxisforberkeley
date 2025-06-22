import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import logger from '../utils/logger';
import { io } from '../services/websocket';

const router = express.Router();

// Get all notes
router.get('/', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  
  try {
    const { data: notes, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', authReq.user!.id)
      .order('updated_at', { ascending: false });

    if (error) {
      logger.error('Error fetching notes:', error);
      return res.status(500).json({ error: 'Failed to fetch notes' });
    }

    res.json({ notes });
  } catch (error) {
    logger.error('Notes fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single note
router.get('/:id', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { id } = req.params;
  
  try {
    const { data: note, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .eq('user_id', authReq.user!.id)
      .single();

    if (error || !note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Get linked documents
    if (note.document_ids && note.document_ids.length > 0) {
      const { data: documents } = await supabase
        .from('documents')
        .select('id, title')
        .in('id', note.document_ids)
        .eq('user_id', authReq.user!.id);
      
      note.linked_documents = documents || [];
    }

    res.json({ note });
  } catch (error) {
    logger.error('Note fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new note
router.post('/', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { title, content = '', tags = [], documentIds = [], isSmartNote = false } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  try {
    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        user_id: authReq.user!.id,
        title,
        content,
        tags,
        document_ids: documentIds,
        is_smart_note: isSmartNote,
        metadata: {}
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Add to activity feed
    await supabase
      .from('activity_feed')
      .insert({
        user_id: authReq.user!.id,
        activity_type: 'note_created',
        entity_type: 'note',
        entity_id: note.id,
        metadata: { title: note.title, is_smart_note: isSmartNote }
      });

    res.json({ note });
  } catch (error) {
    logger.error('Note creation error:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Update note (with real-time sync)
router.put('/:id', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { id } = req.params;
  const { title, content, tags, documentIds } = req.body;
  
  try {
    const updateData: any = { updated_at: new Date() };
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (tags !== undefined) updateData.tags = tags;
    if (documentIds !== undefined) updateData.document_ids = documentIds;

    const { data: note, error } = await supabase
      .from('notes')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', authReq.user!.id)
      .select()
      .single();

    if (error || !note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Emit real-time update to connected clients
    io.to(`user:${authReq.user!.id}`).emit('noteUpdated', { 
      noteId: id, 
      updates: updateData 
    });

    res.json({ note });
  } catch (error) {
    logger.error('Note update error:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// Delete note
router.delete('/:id', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { id } = req.params;
  
  try {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', authReq.user!.id);

    if (error) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Emit real-time update
    io.to(`user:${authReq.user!.id}`).emit('noteDeleted', { noteId: id });

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    logger.error('Note delete error:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// Accept context suggestion
router.post('/:id/accept-suggestion', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { id } = req.params;
  const { suggestionId, acceptedText } = req.body;
  
  try {
    // Mark suggestion as accepted
    await supabase
      .from('context_suggestions')
      .update({ accepted: true })
      .eq('id', suggestionId)
      .eq('note_id', id);

    // Update note content
    const { data: note } = await supabase
      .from('notes')
      .select('content')
      .eq('id', id)
      .eq('user_id', authReq.user!.id)
      .single();

    if (note) {
      const updatedContent = note.content + ' ' + acceptedText;
      await supabase
        .from('notes')
        .update({ content: updatedContent })
        .eq('id', id);

      // Emit real-time update
      io.to(`user:${authReq.user!.id}`).emit('noteUpdated', { 
        noteId: id, 
        updates: { content: updatedContent }
      });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Accept suggestion error:', error);
    res.status(500).json({ error: 'Failed to accept suggestion' });
  }
});

// Export note
router.get('/:id/export', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const { id } = req.params;
  const { format = 'markdown' } = req.query;
  
  try {
    const { data: note, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .eq('user_id', authReq.user!.id)
      .single();

    if (error || !note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    let exportedContent = '';
    const timestamp = new Date().toISOString().split('T')[0];
    
    switch (format) {
      case 'markdown':
        exportedContent = `# ${note.title}\n\n`;
        exportedContent += `*Created: ${new Date(note.created_at).toLocaleDateString()}*\n\n`;
        if (note.tags?.length > 0) {
          exportedContent += `**Tags:** ${note.tags.join(', ')}\n\n`;
        }
        exportedContent += note.content;
        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', `attachment; filename="${note.title}-${timestamp}.md"`);
        break;
        
      case 'pdf':
        // TODO: Implement PDF export
        return res.status(501).json({ error: 'PDF export not yet implemented' });
        
      default:
        return res.status(400).json({ error: 'Invalid export format' });
    }

    res.send(exportedContent);
  } catch (error) {
    logger.error('Note export error:', error);
    res.status(500).json({ error: 'Failed to export note' });
  }
});

export default router;