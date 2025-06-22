import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { DocumentWorkspaceService } from '../services/documentWorkspace';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Create a new workspace
 */
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, settings } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Workspace name required' });
    }

    const workspace = await DocumentWorkspaceService.createWorkspace(
      req.user.id,
      name,
      description,
      settings
    );

    return res.json({ workspace });
  } catch (error) {
    logger.error('Error creating workspace:', error);
    return res.status(500).json({ error: 'Failed to create workspace' });
  }
});

/**
 * Get user workspaces
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const workspaces = await DocumentWorkspaceService.getUserWorkspaces(req.user.id);

    return res.json({ workspaces });
  } catch (error) {
    logger.error('Error getting workspaces:', error);
    return res.status(500).json({ error: 'Failed to get workspaces' });
  }
});

/**
 * Get workspace details
 */
router.get('/:workspaceId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const workspace = await DocumentWorkspaceService.getWorkspace(
      workspaceId,
      req.user.id
    );

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    return res.json({ workspace });
  } catch (error) {
    logger.error('Error getting workspace:', error);
    return res.status(500).json({ error: 'Failed to get workspace' });
  }
});

/**
 * Update workspace
 */
router.put('/:workspaceId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const updates = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const workspace = await DocumentWorkspaceService.updateWorkspace(
      workspaceId,
      req.user.id,
      updates
    );

    return res.json({ workspace });
  } catch (error) {
    logger.error('Error updating workspace:', error);
    return res.status(500).json({ error: 'Failed to update workspace' });
  }
});

/**
 * Delete workspace
 */
router.delete('/:workspaceId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await DocumentWorkspaceService.deleteWorkspace(workspaceId, req.user.id);

    return res.json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    logger.error('Error deleting workspace:', error);
    return res.status(500).json({ error: 'Failed to delete workspace' });
  }
});

/**
 * Add documents to workspace
 */
router.post('/:workspaceId/documents', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { document_ids } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!document_ids || !Array.isArray(document_ids)) {
      return res.status(400).json({ error: 'Document IDs array required' });
    }

    await DocumentWorkspaceService.addDocumentsToWorkspace(
      workspaceId,
      req.user.id,
      document_ids
    );

    return res.json({ message: 'Documents added successfully' });
  } catch (error) {
    logger.error('Error adding documents to workspace:', error);
    return res.status(500).json({ error: 'Failed to add documents' });
  }
});

/**
 * Remove document from workspace
 */
router.delete('/:workspaceId/documents/:documentId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, documentId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await DocumentWorkspaceService.removeDocumentFromWorkspace(
      workspaceId,
      req.user.id,
      documentId
    );

    return res.json({ message: 'Document removed successfully' });
  } catch (error) {
    logger.error('Error removing document from workspace:', error);
    return res.status(500).json({ error: 'Failed to remove document' });
  }
});

/**
 * Share workspace (collaborate)
 */
router.post('/:workspaceId/collaborate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { user_email, permission = 'view' } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!user_email) {
      return res.status(400).json({ error: 'User email required' });
    }

    const collaboration = await DocumentWorkspaceService.shareWorkspace(
      workspaceId,
      req.user.id,
      user_email,
      permission as 'view' | 'edit' | 'admin'
    );

    return res.json({ collaboration });
  } catch (error) {
    logger.error('Error sharing workspace:', error);
    return res.status(500).json({ error: 'Failed to share workspace' });
  }
});

/**
 * Remove collaborator
 */
router.delete('/:workspaceId/collaborators/:userId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, userId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await DocumentWorkspaceService.removeCollaborator(
      workspaceId,
      req.user.id,
      userId
    );

    return res.json({ message: 'Collaborator removed successfully' });
  } catch (error) {
    logger.error('Error removing collaborator:', error);
    return res.status(500).json({ error: 'Failed to remove collaborator' });
  }
});

/**
 * Get workspace activity
 */
router.get('/:workspaceId/activity', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { limit = 50 } = req.query;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const activity = await DocumentWorkspaceService.getWorkspaceActivity(
      workspaceId,
      req.user.id,
      Number(limit)
    );

    return res.json({ activity });
  } catch (error) {
    logger.error('Error getting workspace activity:', error);
    return res.status(500).json({ error: 'Failed to get activity' });
  }
});

/**
 * Create version snapshot
 */
router.post('/:workspaceId/version', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { name, description } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const version = await DocumentWorkspaceService.createVersion(
      workspaceId,
      req.user.id,
      name,
      description
    );

    return res.json({ version });
  } catch (error) {
    logger.error('Error creating version:', error);
    return res.status(500).json({ error: 'Failed to create version' });
  }
});

/**
 * Get workspace versions
 */
router.get('/:workspaceId/versions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const versions = await DocumentWorkspaceService.getVersions(
      workspaceId,
      req.user.id
    );

    return res.json({ versions });
  } catch (error) {
    logger.error('Error getting versions:', error);
    return res.status(500).json({ error: 'Failed to get versions' });
  }
});

/**
 * Restore version
 */
router.post('/:workspaceId/versions/:versionId/restore', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, versionId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await DocumentWorkspaceService.restoreVersion(
      workspaceId,
      versionId,
      req.user.id
    );

    return res.json({ message: 'Version restored successfully' });
  } catch (error) {
    logger.error('Error restoring version:', error);
    return res.status(500).json({ error: 'Failed to restore version' });
  }
});

/**
 * Add comment to workspace
 */
router.post('/:workspaceId/comments', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { content, document_id, parent_id } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!content) {
      return res.status(400).json({ error: 'Comment content required' });
    }

    const comment = await DocumentWorkspaceService.addComment(
      workspaceId,
      req.user.id,
      content,
      document_id,
      parent_id
    );

    return res.json({ comment });
  } catch (error) {
    logger.error('Error adding comment:', error);
    return res.status(500).json({ error: 'Failed to add comment' });
  }
});

/**
 * Get workspace comments
 */
router.get('/:workspaceId/comments', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const comments = await DocumentWorkspaceService.getComments(
      workspaceId,
      req.user.id
    );

    return res.json({ comments });
  } catch (error) {
    logger.error('Error getting comments:', error);
    return res.status(500).json({ error: 'Failed to get comments' });
  }
});

/**
 * Generate workspace insights
 */
router.get('/:workspaceId/insights', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const insights = await DocumentWorkspaceService.generateWorkspaceInsights(
      workspaceId,
      req.user.id
    );

    return res.json({ insights });
  } catch (error) {
    logger.error('Error generating workspace insights:', error);
    return res.status(500).json({ error: 'Failed to generate insights' });
  }
});

export default router;