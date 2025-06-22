import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { AIService } from './ai/aiService';
import { SpacedRepetitionService } from './spacedRepetition';
import { ExerciseEngineService } from './exerciseEngine';
import { KnowledgeGapService } from './knowledgeGap';
import { ReportGeneratorService } from './reportGenerator';
import { CrossDocumentInsightsService } from './crossDocumentInsights';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'learning' | 'research' | 'productivity' | 'custom';
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  conditions?: WorkflowCondition[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowTrigger {
  type: 'time' | 'event' | 'manual' | 'data_change';
  config: {
    schedule?: string; // cron expression
    event?: string;
    dataSource?: string;
    threshold?: any;
  };
}

export interface WorkflowAction {
  id: string;
  type: 'create_flashcards' | 'generate_exercises' | 'analyze_gaps' | 'generate_report' | 'send_notification' | 'update_data' | 'ai_task';
  config: any;
  order: number;
  continueOnError?: boolean;
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'exists';
  value: any;
  logic?: 'and' | 'or';
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  userId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  results: WorkflowExecutionResult[];
  error?: string;
  metadata?: any;
}

export interface WorkflowExecutionResult {
  actionId: string;
  status: 'success' | 'failed' | 'skipped';
  output?: any;
  error?: string;
  executedAt: Date;
}

export interface UserWorkflow {
  id: string;
  userId: string;
  templateId?: string;
  name: string;
  config: {
    trigger: WorkflowTrigger;
    actions: WorkflowAction[];
    conditions?: WorkflowCondition[];
  };
  isActive: boolean;
  lastExecutedAt?: Date;
  nextExecutionAt?: Date;
  executionCount: number;
  createdAt: Date;
}

export class WorkflowAutomationService {
  /**
   * Create a custom workflow
   */
  static async createWorkflow(
    userId: string,
    name: string,
    trigger: WorkflowTrigger,
    actions: WorkflowAction[],
    conditions?: WorkflowCondition[]
  ): Promise<UserWorkflow> {
    try {
      const config = {
        trigger,
        actions: actions.map((action, index) => ({
          ...action,
          id: action.id || `action_${index}`,
          order: index
        })),
        conditions
      };

      const nextExecutionAt = this.calculateNextExecution(trigger);

      const { data: workflow, error } = await supabase
        .from('user_workflows')
        .insert({
          user_id: userId,
          name,
          config,
          is_active: true,
          next_execution_at: nextExecutionAt?.toISOString(),
          execution_count: 0,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Workflow created', { workflowId: workflow.id, userId });

      return {
        id: workflow.id,
        userId: workflow.user_id,
        name: workflow.name,
        config: workflow.config,
        isActive: workflow.is_active,
        lastExecutedAt: workflow.last_executed_at ? new Date(workflow.last_executed_at) : undefined,
        nextExecutionAt: workflow.next_execution_at ? new Date(workflow.next_execution_at) : undefined,
        executionCount: workflow.execution_count,
        createdAt: new Date(workflow.created_at)
      };
    } catch (error) {
      logger.error('Error creating workflow:', error);
      throw error;
    }
  }

  /**
   * Execute a workflow
   */
  static async executeWorkflow(
    workflowId: string,
    userId: string,
    manualTriggerData?: any
  ): Promise<WorkflowExecution> {
    try {
      // Get workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('user_workflows')
        .select('*')
        .eq('id', workflowId)
        .eq('user_id', userId)
        .single();

      if (workflowError || !workflow) {
        throw new Error('Workflow not found');
      }

      // Check conditions if any
      if (workflow.config.conditions) {
        const conditionsMet = await this.evaluateConditions(
          workflow.config.conditions,
          userId,
          manualTriggerData
        );
        
        if (!conditionsMet) {
          logger.info('Workflow conditions not met', { workflowId });
          return this.createSkippedExecution(workflowId, userId);
        }
      }

      // Create execution record
      const { data: execution, error: execError } = await supabase
        .from('workflow_executions')
        .insert({
          workflow_id: workflowId,
          user_id: userId,
          status: 'running',
          started_at: new Date().toISOString(),
          metadata: manualTriggerData
        })
        .select()
        .single();

      if (execError) throw execError;

      // Execute actions asynchronously
      this.executeActions(execution.id, workflow.config.actions, userId);

      return {
        id: execution.id,
        workflowId: execution.workflow_id,
        userId: execution.user_id,
        status: execution.status,
        startedAt: new Date(execution.started_at),
        results: [],
        metadata: execution.metadata
      };
    } catch (error) {
      logger.error('Error executing workflow:', error);
      throw error;
    }
  }

  /**
   * Execute workflow actions
   */
  private static async executeActions(
    executionId: string,
    actions: WorkflowAction[],
    userId: string
  ): Promise<void> {
    const results: WorkflowExecutionResult[] = [];

    try {
      for (const action of actions) {
        const startTime = new Date();
        
        try {
          const output = await this.executeAction(action, userId, results);
          
          results.push({
            actionId: action.id,
            status: 'success',
            output,
            executedAt: startTime
          });
        } catch (error) {
          logger.error('Error executing action:', { action, error });
          
          results.push({
            actionId: action.id,
            status: 'failed',
            error: error.message,
            executedAt: startTime
          });

          if (!action.continueOnError) {
            throw error;
          }
        }
      }

      // Update execution as completed
      await supabase
        .from('workflow_executions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          results
        })
        .eq('id', executionId);

    } catch (error) {
      // Update execution as failed
      await supabase
        .from('workflow_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          results,
          error: error.message
        })
        .eq('id', executionId);
    }
  }

  /**
   * Execute a single action
   */
  private static async executeAction(
    action: WorkflowAction,
    userId: string,
    previousResults: WorkflowExecutionResult[]
  ): Promise<any> {
    switch (action.type) {
      case 'create_flashcards':
        return this.executeCreateFlashcards(action.config, userId);
      
      case 'generate_exercises':
        return this.executeGenerateExercises(action.config, userId);
      
      case 'analyze_gaps':
        return this.executeAnalyzeGaps(action.config, userId);
      
      case 'generate_report':
        return this.executeGenerateReport(action.config, userId);
      
      case 'send_notification':
        return this.executeSendNotification(action.config, userId);
      
      case 'update_data':
        return this.executeUpdateData(action.config, userId);
      
      case 'ai_task':
        return this.executeAITask(action.config, userId, previousResults);
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Action: Create flashcards from documents
   */
  private static async executeCreateFlashcards(config: any, userId: string): Promise<any> {
    const { documentIds, setName, count = 10 } = config;

    // Get documents
    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .in('id', documentIds);

    if (!documents || documents.length === 0) {
      throw new Error('No documents found');
    }

    // Generate flashcards using AI
    const aiService = new AIService();
    const flashcards = [];

    for (const doc of documents) {
      const prompt = `Generate ${Math.ceil(count / documents.length)} flashcards from this document:
Title: ${doc.title}
Content: ${doc.content?.substring(0, 3000)}...

Format each flashcard as:
Q: [question]
A: [answer]`;

      const response = await aiService.generateResponse('system', {
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        maxTokens: 1000
      });

      if (response) {
        const cards = response.content.split('\n\n').map(card => {
          const [question, answer] = card.split('\nA: ');
          return {
            question: question.replace('Q: ', ''),
            answer: answer || ''
          };
        }).filter(card => card.question && card.answer);

        flashcards.push(...cards);
      }
    }

    // Create flashcard set
    const { data: set } = await supabase
      .from('flashcard_sets')
      .insert({
        name: setName || `Auto-generated from ${documents[0].title}`,
        description: `Generated by workflow on ${new Date().toLocaleDateString()}`,
        user_id: userId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    // Create flashcards
    const createdCards = [];
    for (const card of flashcards.slice(0, count)) {
      const { data } = await supabase
        .from('flashcards')
        .insert({
          set_id: set.id,
          question: card.question,
          answer: card.answer,
          user_id: userId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (data) createdCards.push(data);
    }

    return {
      setId: set.id,
      setName: set.name,
      flashcardsCreated: createdCards.length
    };
  }

  /**
   * Action: Generate exercises from content
   */
  private static async executeGenerateExercises(config: any, userId: string): Promise<any> {
    const { documentId, exerciseTypes, count = 10 } = config;

    const exercises = await ExerciseEngineService.generateExercises(
      documentId,
      userId,
      count,
      exerciseTypes
    );

    return {
      documentId,
      exercisesGenerated: exercises.length,
      exerciseTypes: [...new Set(exercises.map(e => e.type))]
    };
  }

  /**
   * Action: Analyze knowledge gaps
   */
  private static async executeAnalyzeGaps(config: any, userId: string): Promise<any> {
    const { autoCreateLearningPath = true } = config;

    const gaps = await KnowledgeGapService.detectGaps(userId);
    
    let learningPathId;
    if (autoCreateLearningPath && gaps.length > 0) {
      const learningPath = await KnowledgeGapService.generateLearningPath(
        userId,
        gaps.map(g => g.id)
      );
      learningPathId = learningPath.id;
    }

    return {
      gapsDetected: gaps.length,
      severityBreakdown: {
        high: gaps.filter(g => g.severity > 0.7).length,
        medium: gaps.filter(g => g.severity > 0.4 && g.severity <= 0.7).length,
        low: gaps.filter(g => g.severity <= 0.4).length
      },
      learningPathId
    };
  }

  /**
   * Action: Generate report
   */
  private static async executeGenerateReport(config: any, userId: string): Promise<any> {
    const { templateId, parameters } = config;

    const report = await ReportGeneratorService.generateReport(
      userId,
      templateId,
      parameters
    );

    return {
      reportId: report.id,
      reportTitle: report.title,
      status: report.status
    };
  }

  /**
   * Action: Send notification
   */
  private static async executeSendNotification(config: any, userId: string): Promise<any> {
    const { type, title, message, data } = config;

    // Create notification record
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: type || 'workflow',
        title,
        message,
        data,
        read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // In production, you'd also send push notification, email, etc.

    return {
      notificationId: notification.id,
      sent: true
    };
  }

  /**
   * Action: Update data
   */
  private static async executeUpdateData(config: any, userId: string): Promise<any> {
    const { table, updates, conditions } = config;

    let query = supabase.from(table).update(updates);

    // Add user_id condition for security
    query = query.eq('user_id', userId);

    // Add other conditions
    if (conditions) {
      Object.entries(conditions).forEach(([field, value]) => {
        query = query.eq(field, value);
      });
    }

    const { data, error } = await query.select();

    if (error) throw error;

    return {
      table,
      recordsUpdated: data?.length || 0
    };
  }

  /**
   * Action: Execute AI task
   */
  private static async executeAITask(
    config: any,
    userId: string,
    previousResults: WorkflowExecutionResult[]
  ): Promise<any> {
    const { prompt, useContext = true, saveResult = false } = config;
    const aiService = new AIService();

    let enhancedPrompt = prompt;
    if (useContext && previousResults.length > 0) {
      const context = previousResults
        .filter(r => r.status === 'success')
        .map(r => `${r.actionId}: ${JSON.stringify(r.output)}`)
        .join('\n');
      
      enhancedPrompt = `${prompt}\n\nContext from previous actions:\n${context}`;
    }

    const response = await aiService.generateResponse('system', {
      messages: [{ role: 'user', content: enhancedPrompt }],
      temperature: 0.7,
      maxTokens: 1500
    });

    if (!response) {
      throw new Error('Failed to generate AI response');
    }

    let result = { content: response.content };

    if (saveResult) {
      // Save as note
      const { data: note } = await supabase
        .from('notes')
        .insert({
          user_id: userId,
          title: `AI Task: ${new Date().toLocaleDateString()}`,
          content: response.content,
          tags: ['workflow', 'ai-generated'],
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      result['noteId'] = note?.id;
    }

    return result;
  }

  /**
   * Get workflow templates
   */
  static async getTemplates(category?: string): Promise<WorkflowTemplate[]> {
    try {
      let query = supabase
        .from('workflow_templates')
        .select('*')
        .eq('is_active', true);

      if (category) {
        query = query.eq('category', category);
      }

      const { data: templates, error } = await query.order('name');

      if (error) throw error;

      return templates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        trigger: t.trigger,
        actions: t.actions,
        conditions: t.conditions,
        isActive: t.is_active,
        createdAt: new Date(t.created_at),
        updatedAt: new Date(t.updated_at)
      }));
    } catch (error) {
      logger.error('Error getting workflow templates:', error);
      throw error;
    }
  }

  /**
   * Get user workflows
   */
  static async getUserWorkflows(userId: string): Promise<UserWorkflow[]> {
    try {
      const { data: workflows, error } = await supabase
        .from('user_workflows')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return workflows.map(w => ({
        id: w.id,
        userId: w.user_id,
        templateId: w.template_id,
        name: w.name,
        config: w.config,
        isActive: w.is_active,
        lastExecutedAt: w.last_executed_at ? new Date(w.last_executed_at) : undefined,
        nextExecutionAt: w.next_execution_at ? new Date(w.next_execution_at) : undefined,
        executionCount: w.execution_count,
        createdAt: new Date(w.created_at)
      }));
    } catch (error) {
      logger.error('Error getting user workflows:', error);
      throw error;
    }
  }

  /**
   * Get workflow execution history
   */
  static async getExecutionHistory(
    userId: string,
    workflowId?: string,
    limit: number = 50
  ): Promise<WorkflowExecution[]> {
    try {
      let query = supabase
        .from('workflow_executions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (workflowId) {
        query = query.eq('workflow_id', workflowId);
      }

      const { data: executions, error } = await query;

      if (error) throw error;

      return executions.map(e => ({
        id: e.id,
        workflowId: e.workflow_id,
        userId: e.user_id,
        status: e.status,
        startedAt: new Date(e.started_at),
        completedAt: e.completed_at ? new Date(e.completed_at) : undefined,
        results: e.results || [],
        error: e.error,
        metadata: e.metadata
      }));
    } catch (error) {
      logger.error('Error getting execution history:', error);
      throw error;
    }
  }

  /**
   * Create workflow from template
   */
  static async createFromTemplate(
    userId: string,
    templateId: string,
    customName?: string,
    customConfig?: any
  ): Promise<UserWorkflow> {
    try {
      const template = (await this.getTemplates()).find(t => t.id === templateId);
      
      if (!template) {
        throw new Error('Template not found');
      }

      const config = {
        trigger: customConfig?.trigger || template.trigger,
        actions: customConfig?.actions || template.actions,
        conditions: customConfig?.conditions || template.conditions
      };

      return this.createWorkflow(
        userId,
        customName || template.name,
        config.trigger,
        config.actions,
        config.conditions
      );
    } catch (error) {
      logger.error('Error creating workflow from template:', error);
      throw error;
    }
  }

  /**
   * Toggle workflow active status
   */
  static async toggleWorkflow(workflowId: string, userId: string): Promise<boolean> {
    try {
      const { data: workflow, error: getError } = await supabase
        .from('user_workflows')
        .select('is_active')
        .eq('id', workflowId)
        .eq('user_id', userId)
        .single();

      if (getError || !workflow) {
        throw new Error('Workflow not found');
      }

      const newStatus = !workflow.is_active;

      const { error: updateError } = await supabase
        .from('user_workflows')
        .update({ is_active: newStatus })
        .eq('id', workflowId);

      if (updateError) throw updateError;

      return newStatus;
    } catch (error) {
      logger.error('Error toggling workflow:', error);
      throw error;
    }
  }

  /**
   * Delete workflow
   */
  static async deleteWorkflow(workflowId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_workflows')
        .delete()
        .eq('id', workflowId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error deleting workflow:', error);
      throw error;
    }
  }

  /**
   * Get workflow analytics
   */
  static async getWorkflowAnalytics(userId: string): Promise<{
    totalWorkflows: number;
    activeWorkflows: number;
    totalExecutions: number;
    successRate: number;
    avgExecutionTime: number;
    topWorkflows: Array<{ id: string; name: string; executions: number }>;
  }> {
    try {
      const [workflows, executions] = await Promise.all([
        this.getUserWorkflows(userId),
        this.getExecutionHistory(userId, undefined, 1000)
      ]);

      const successfulExecutions = executions.filter(e => e.status === 'completed');
      const executionTimes = executions
        .filter(e => e.completedAt)
        .map(e => e.completedAt!.getTime() - e.startedAt.getTime());

      // Count executions per workflow
      const executionCounts = new Map<string, number>();
      executions.forEach(e => {
        executionCounts.set(e.workflowId, (executionCounts.get(e.workflowId) || 0) + 1);
      });

      const topWorkflows = Array.from(executionCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, count]) => ({
          id,
          name: workflows.find(w => w.id === id)?.name || 'Unknown',
          executions: count
        }));

      return {
        totalWorkflows: workflows.length,
        activeWorkflows: workflows.filter(w => w.isActive).length,
        totalExecutions: executions.length,
        successRate: executions.length > 0 ? (successfulExecutions.length / executions.length) * 100 : 0,
        avgExecutionTime: executionTimes.length > 0 
          ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length 
          : 0,
        topWorkflows
      };
    } catch (error) {
      logger.error('Error getting workflow analytics:', error);
      throw error;
    }
  }

  // Helper methods
  private static calculateNextExecution(trigger: WorkflowTrigger): Date | null {
    if (trigger.type !== 'time' || !trigger.config.schedule) {
      return null;
    }

    // Simple cron-like parsing (in production, use a proper cron library)
    const schedule = trigger.config.schedule;
    const now = new Date();

    if (schedule === 'daily') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      return tomorrow;
    } else if (schedule === 'weekly') {
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(9, 0, 0, 0);
      return nextWeek;
    } else if (schedule === 'monthly') {
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      nextMonth.setHours(9, 0, 0, 0);
      return nextMonth;
    }

    return null;
  }

  private static async evaluateConditions(
    conditions: WorkflowCondition[],
    userId: string,
    data?: any
  ): Promise<boolean> {
    let result = true;
    let currentLogic: 'and' | 'or' = 'and';

    for (const condition of conditions) {
      const conditionMet = await this.evaluateCondition(condition, userId, data);
      
      if (currentLogic === 'and') {
        result = result && conditionMet;
      } else {
        result = result || conditionMet;
      }

      if (condition.logic) {
        currentLogic = condition.logic;
      }
    }

    return result;
  }

  private static async evaluateCondition(
    condition: WorkflowCondition,
    userId: string,
    data?: any
  ): Promise<boolean> {
    const value = data?.[condition.field];

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'greater_than':
        return value > condition.value;
      case 'less_than':
        return value < condition.value;
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'exists':
        return value !== undefined && value !== null;
      default:
        return false;
    }
  }

  private static createSkippedExecution(
    workflowId: string,
    userId: string
  ): WorkflowExecution {
    return {
      id: `skipped_${Date.now()}`,
      workflowId,
      userId,
      status: 'completed',
      startedAt: new Date(),
      completedAt: new Date(),
      results: [{
        actionId: 'conditions_check',
        status: 'skipped',
        output: { reason: 'Conditions not met' },
        executedAt: new Date()
      }]
    };
  }
}