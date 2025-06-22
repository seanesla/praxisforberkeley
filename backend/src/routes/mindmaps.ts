import express, { Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { MindMapService } from '../services/mindMapService';
import { logger } from '../utils/logger';

const router = express.Router();

// Get all mind maps for the authenticated user
router.get('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    logger.info('[MINDMAPS] Fetching mind maps for user:', userId);

    const { data: mindMaps, error } = await supabase
      .from('mind_maps')
      .select(`
        *,
        documents (
          id,
          title
        )
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      logger.error('[MINDMAPS] Error fetching mind maps:', error);
      return res.status(500).json({ error: 'Failed to fetch mind maps' });
    }

    logger.info(`[MINDMAPS] Found ${mindMaps?.length || 0} mind maps`);
    res.json({ mindMaps: mindMaps || [] });
  } catch (error) {
    logger.error('[MINDMAPS] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific mind map
router.get('/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const mindMapId = req.params.id;

    logger.info('[MINDMAPS] Fetching mind map:', { userId, mindMapId });

    const { data: mindMap, error } = await supabase
      .from('mind_maps')
      .select(`
        *,
        documents (
          id,
          title,
          content
        )
      `)
      .eq('id', mindMapId)
      .eq('user_id', userId)
      .single();

    if (error || !mindMap) {
      logger.error('[MINDMAPS] Mind map not found or access denied:', error);
      return res.status(404).json({ error: 'Mind map not found' });
    }

    logger.info('[MINDMAPS] Mind map fetched successfully');
    res.json({ mindMap });
  } catch (error) {
    logger.error('[MINDMAPS] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new mind map
router.post('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { document_id, title, data } = req.body;

    logger.info('[MINDMAPS] Creating new mind map:', { userId, document_id, title });

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!data || !data.id || !data.text) {
      return res.status(400).json({ error: 'Valid mind map data is required' });
    }

    // If document_id is provided, verify it belongs to the user
    if (document_id) {
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('id')
        .eq('id', document_id)
        .eq('user_id', userId)
        .single();

      if (docError || !document) {
        logger.error('[MINDMAPS] Document not found or access denied:', docError);
        return res.status(404).json({ error: 'Document not found' });
      }
    }

    const mindMapId = uuidv4();

    const { data: mindMap, error: createError } = await supabase
      .from('mind_maps')
      .insert({
        id: mindMapId,
        user_id: userId,
        document_id: document_id || null,
        title,
        data,
      })
      .select()
      .single();

    if (createError) {
      logger.error('[MINDMAPS] Error creating mind map:', createError);
      return res.status(500).json({ error: 'Failed to create mind map' });
    }

    logger.info('[MINDMAPS] Mind map created successfully:', mindMapId);
    res.status(201).json({ mindMap });
  } catch (error) {
    logger.error('[MINDMAPS] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate a mind map from a document
router.post('/generate/:documentId', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const documentId = req.params.documentId;

    logger.info('[MINDMAPS] Generating mind map for document:', { userId, documentId });

    // Get document content
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, title, content')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (docError || !document) {
      logger.error('[MINDMAPS] Document not found or access denied:', docError);
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!document.content) {
      return res.status(400).json({ error: 'Document has no content to analyze' });
    }

    logger.info('[MINDMAPS] Generating mind map structure for:', document.title);

    // Generate mind map structure using AI
    const mindMapData = await MindMapService.generateMindMap(
      userId,
      document.content,
      document.title
    );

    if (!mindMapData) {
      return res.status(500).json({ error: 'Failed to generate mind map. Please check your API key configuration.' });
    }

    // Save the generated mind map
    const mindMapId = uuidv4();
    const mindMapTitle = `Mind Map: ${document.title}`;

    const { data: mindMap, error: createError } = await supabase
      .from('mind_maps')
      .insert({
        id: mindMapId,
        user_id: userId,
        document_id: documentId,
        title: mindMapTitle,
        data: mindMapData,
      })
      .select()
      .single();

    if (createError) {
      logger.error('[MINDMAPS] Error saving generated mind map:', createError);
      return res.status(500).json({ error: 'Failed to save mind map' });
    }

    logger.info('[MINDMAPS] Mind map generated and saved successfully:', mindMapId);
    res.status(201).json({ mindMap });
  } catch (error) {
    logger.error('[MINDMAPS] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a mind map
router.put('/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const mindMapId = req.params.id;
    const { title, data } = req.body;

    logger.info('[MINDMAPS] Updating mind map:', { userId, mindMapId });

    // Verify ownership
    const { data: existing, error: verifyError } = await supabase
      .from('mind_maps')
      .select('id')
      .eq('id', mindMapId)
      .eq('user_id', userId)
      .single();

    if (verifyError || !existing) {
      logger.error('[MINDMAPS] Mind map not found or access denied:', verifyError);
      return res.status(404).json({ error: 'Mind map not found' });
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) {
      updateData.title = title;
    }

    if (data !== undefined) {
      if (!data.id || !data.text) {
        return res.status(400).json({ error: 'Valid mind map data is required' });
      }
      updateData.data = data;
    }

    const { data: mindMap, error: updateError } = await supabase
      .from('mind_maps')
      .update(updateData)
      .eq('id', mindMapId)
      .select()
      .single();

    if (updateError) {
      logger.error('[MINDMAPS] Error updating mind map:', updateError);
      return res.status(500).json({ error: 'Failed to update mind map' });
    }

    logger.info('[MINDMAPS] Mind map updated successfully');
    res.json({ mindMap });
  } catch (error) {
    logger.error('[MINDMAPS] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a mind map
router.delete('/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const mindMapId = req.params.id;

    logger.info('[MINDMAPS] Deleting mind map:', { userId, mindMapId });

    // Verify ownership before deleting
    const { data: mindMap, error: verifyError } = await supabase
      .from('mind_maps')
      .select('id')
      .eq('id', mindMapId)
      .eq('user_id', userId)
      .single();

    if (verifyError || !mindMap) {
      logger.error('[MINDMAPS] Mind map not found or access denied:', verifyError);
      return res.status(404).json({ error: 'Mind map not found' });
    }

    const { error: deleteError } = await supabase
      .from('mind_maps')
      .delete()
      .eq('id', mindMapId);

    if (deleteError) {
      logger.error('[MINDMAPS] Error deleting mind map:', deleteError);
      return res.status(500).json({ error: 'Failed to delete mind map' });
    }

    logger.info('[MINDMAPS] Mind map deleted successfully:', mindMapId);
    res.json({ message: 'Mind map deleted successfully' });
  } catch (error) {
    logger.error('[MINDMAPS] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;