import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { WorkflowAutomationService } from '../services/workflowAutomation';
import { logger } from '../utils/logger';
import { supabase } from '../config/supabase';

const router = Router();

/**
 * Create workflow
 */
router.post('/workflows', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const workflow = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!workflow.name || !workflow.trigger_type || !workflow.flow_data) {
      return res.status(400).json({ 
        error: 'Workflow name, trigger type, and flow data required' 
      });
    }

    const { data: newWorkflow, error } = await supabase
      .from('workflows')
      .insert({
        user_id: req.user.id,
        ...workflow,
        enabled: workflow.enabled !== false
      })
      .select()
      .single();

    if (error) throw error;

    return res.json({ workflow: newWorkflow });
  } catch (error) {
    logger.error('Error creating workflow:', error);
    return res.status(500).json({ error: 'Failed to create workflow' });
  }
});

/**
 * Get workflows
 */
router.get('/workflows', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { enabled, trigger_type } = req.query;

    let query = supabase
      .from('workflows')
      .select('*')
      .eq('user_id', req.user.id);

    if (enabled !== undefined) {
      query = query.eq('enabled', enabled === 'true');
    }

    if (trigger_type) {
      query = query.eq('trigger_type', trigger_type);
    }

    const { data: workflows, error } = await query
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({ workflows });
  } catch (error) {
    logger.error('Error getting workflows:', error);
    return res.status(500).json({ error: 'Failed to get workflows' });
  }
});

/**
 * Get workflow details
 */
router.get('/workflows/:workflowId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workflowId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: workflow, error } = await supabase
      .from('workflows')
      .select(`
        *,
        executions:workflow_executions(
          id,
          status,
          started_at,
          completed_at
        )
      `)
      .eq('id', workflowId)
      .eq('user_id', req.user.id)
      .single();

    if (error || !workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    return res.json({ workflow });
  } catch (error) {
    logger.error('Error getting workflow details:', error);
    return res.status(500).json({ error: 'Failed to get workflow' });
  }
});

/**
 * Update workflow
 */
router.put('/workflows/:workflowId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workflowId } = req.params;
    const updates = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { error } = await supabase
      .from('workflows')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', workflowId)
      .eq('user_id', req.user.id);

    if (error) throw error;

    return res.json({ message: 'Workflow updated successfully' });
  } catch (error) {
    logger.error('Error updating workflow:', error);
    return res.status(500).json({ error: 'Failed to update workflow' });
  }
});

/**
 * Delete workflow
 */
router.delete('/workflows/:workflowId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workflowId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', workflowId)
      .eq('user_id', req.user.id);

    if (error) throw error;

    return res.json({ message: 'Workflow deleted successfully' });
  } catch (error) {
    logger.error('Error deleting workflow:', error);
    return res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

/**
 * Execute workflow
 */
router.post('/workflows/:workflowId/execute', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { input_data } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const execution = await WorkflowAutomationService.executeWorkflow(
      workflowId,
      req.user.id,
      input_data
    );

    return res.json({ execution });
  } catch (error) {
    logger.error('Error executing workflow:', error);
    return res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

/**
 * Get workflow executions
 */
router.get('/workflows/:workflowId/executions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { status, limit = 20 } = req.query;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify workflow ownership
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('id')
      .eq('id', workflowId)
      .eq('user_id', req.user.id)
      .single();

    if (workflowError || !workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    let query = supabase
      .from('workflow_executions')
      .select(`
        *,
        steps:workflow_execution_steps(*)
      `)
      .eq('workflow_id', workflowId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: executions, error } = await query
      .order('started_at', { ascending: false })
      .limit(Number(limit));

    if (error) throw error;

    return res.json({ executions });
  } catch (error) {
    logger.error('Error getting workflow executions:', error);
    return res.status(500).json({ error: 'Failed to get executions' });
  }
});

/**
 * Get execution details
 */
router.get('/executions/:executionId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { executionId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: execution, error } = await supabase
      .from('workflow_executions')
      .select(`
        *,
        workflow:workflows(*),
        steps:workflow_execution_steps(*)
      `)
      .eq('id', executionId)
      .single();

    if (error || !execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    // Verify ownership through workflow
    if (execution.workflow.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.json({ execution });
  } catch (error) {
    logger.error('Error getting execution details:', error);
    return res.status(500).json({ error: 'Failed to get execution' });
  }
});

/**
 * Cancel execution
 */
router.post('/executions/:executionId/cancel', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { executionId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Update execution status
    const { error } = await supabase
      .from('workflow_executions')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString()
      })
      .eq('id', executionId)
      .eq('status', 'running');

    if (error) throw error;

    return res.json({ message: 'Execution cancelled successfully' });
  } catch (error) {
    logger.error('Error cancelling execution:', error);
    return res.status(500).json({ error: 'Failed to cancel execution' });
  }
});

/**
 * Get workflow actions
 */
router.get('/actions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.query;

    let query = supabase
      .from('workflow_actions')
      .select('*')
      .eq('active', true);

    if (category) {
      query = query.eq('category', category);
    }

    const { data: actions, error } = await query
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    return res.json({ actions });
  } catch (error) {
    logger.error('Error getting workflow actions:', error);
    return res.status(500).json({ error: 'Failed to get actions' });
  }
});

/**
 * Get workflow templates
 */
router.get('/templates', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { category, difficulty } = req.query;

    let query = supabase
      .from('workflow_templates')
      .select('*')
      .eq('active', true);

    if (category) {
      query = query.eq('category', category);
    }

    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    const { data: templates, error } = await query
      .order('usage_count', { ascending: false });

    if (error) throw error;

    return res.json({ templates });
  } catch (error) {
    logger.error('Error getting workflow templates:', error);
    return res.status(500).json({ error: 'Failed to get templates' });
  }
});

/**
 * Create workflow from template
 */
router.post('/templates/:templateId/create', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { templateId } = req.params;
    const { name, customizations } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('workflow_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Create workflow from template
    const workflow = {
      user_id: req.user.id,
      name: name || template.name,
      description: template.description,
      trigger_type: 'manual',
      trigger_config: {},
      flow_data: {
        ...template.flow_data,
        ...customizations
      },
      enabled: true
    };

    const { data: newWorkflow, error } = await supabase
      .from('workflows')
      .insert(workflow)
      .select()
      .single();

    if (error) throw error;

    // Update template usage count
    await supabase
      .from('workflow_templates')
      .update({ usage_count: template.usage_count + 1 })
      .eq('id', templateId);

    return res.json({ workflow: newWorkflow });
  } catch (error) {
    logger.error('Error creating workflow from template:', error);
    return res.status(500).json({ error: 'Failed to create workflow' });
  }
});

export default router;