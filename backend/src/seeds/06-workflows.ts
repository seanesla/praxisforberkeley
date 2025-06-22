import { SeedConfig } from './index';
import { v4 as uuidv4 } from 'uuid';

export async function seedWorkflows(supabase: any, config: SeedConfig) {
  console.log('  Creating workflows data...');

  // Get demo user
  const { data: demoUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'demo@praxis.edu')
    .single();

  if (!demoUser) {
    console.error('Demo user not found!');
    return;
  }

  // Create workflow templates
  const templates = await createWorkflowTemplates(supabase);
  
  // Create user workflows
  const workflows = await createUserWorkflows(supabase, demoUser.id, templates);
  
  // Create execution history
  await createExecutionHistory(supabase, demoUser.id, workflows);
}

async function createWorkflowTemplates(supabase: any) {
  console.log('    Creating workflow templates...');
  
  const templates = [
    {
      id: uuidv4(),
      name: 'Daily Document Review',
      description: 'Automatically review and summarize new documents added each day',
      category: 'document_processing',
      is_public: true,
      workflow_definition: {
        nodes: [
          {
            id: 'trigger',
            type: 'schedule',
            config: { cron: '0 9 * * *', timezone: 'America/Los_Angeles' },
            position: { x: 100, y: 100 },
          },
          {
            id: 'fetch_docs',
            type: 'fetch_documents',
            config: { filter: 'created_today', limit: 10 },
            position: { x: 300, y: 100 },
          },
          {
            id: 'summarize',
            type: 'ai_summarize',
            config: { model: 'claude-3', max_tokens: 500 },
            position: { x: 500, y: 100 },
          },
          {
            id: 'create_note',
            type: 'create_note',
            config: { title: 'Daily Review - {{date}}', tags: ['daily-review'] },
            position: { x: 700, y: 100 },
          },
          {
            id: 'notify',
            type: 'email_notification',
            config: { subject: 'Daily Document Review Complete' },
            position: { x: 900, y: 100 },
          },
        ],
        edges: [
          { source: 'trigger', target: 'fetch_docs' },
          { source: 'fetch_docs', target: 'summarize' },
          { source: 'summarize', target: 'create_note' },
          { source: 'create_note', target: 'notify' },
        ],
      },
      created_at: getRandomDate(60),
    },
    {
      id: uuidv4(),
      name: 'Research Paper Analysis Pipeline',
      description: 'Process research papers through citation extraction, concept mapping, and flashcard generation',
      category: 'research',
      is_public: true,
      workflow_definition: {
        nodes: [
          {
            id: 'trigger',
            type: 'document_upload',
            config: { file_types: ['pdf'], tags: ['research'] },
            position: { x: 100, y: 200 },
          },
          {
            id: 'extract_text',
            type: 'text_extraction',
            config: { preserve_formatting: true },
            position: { x: 300, y: 200 },
          },
          {
            id: 'extract_citations',
            type: 'citation_extraction',
            config: { style: 'auto_detect' },
            position: { x: 500, y: 100 },
          },
          {
            id: 'concept_extraction',
            type: 'concept_extraction',
            config: { min_frequency: 2, max_concepts: 20 },
            position: { x: 500, y: 300 },
          },
          {
            id: 'generate_flashcards',
            type: 'flashcard_generation',
            config: { cards_per_section: 5, difficulty: 'adaptive' },
            position: { x: 700, y: 200 },
          },
          {
            id: 'create_mindmap',
            type: 'mindmap_generation',
            config: { layout: 'hierarchical', max_depth: 4 },
            position: { x: 900, y: 200 },
          },
        ],
        edges: [
          { source: 'trigger', target: 'extract_text' },
          { source: 'extract_text', target: 'extract_citations' },
          { source: 'extract_text', target: 'concept_extraction' },
          { source: 'concept_extraction', target: 'generate_flashcards' },
          { source: 'concept_extraction', target: 'create_mindmap' },
        ],
      },
      created_at: getRandomDate(45),
    },
    {
      id: uuidv4(),
      name: 'Knowledge Synthesis Workflow',
      description: 'Synthesize knowledge from multiple documents into comprehensive summaries',
      category: 'synthesis',
      is_public: true,
      workflow_definition: {
        nodes: [
          {
            id: 'trigger',
            type: 'manual',
            config: {},
            position: { x: 100, y: 150 },
          },
          {
            id: 'select_docs',
            type: 'document_selector',
            config: { selection_mode: 'tags', tags: ['important'] },
            position: { x: 300, y: 150 },
          },
          {
            id: 'cross_reference',
            type: 'cross_reference_analysis',
            config: { min_similarity: 0.7 },
            position: { x: 500, y: 150 },
          },
          {
            id: 'synthesize',
            type: 'ai_synthesis',
            config: { mode: 'comprehensive', include_citations: true },
            position: { x: 700, y: 150 },
          },
          {
            id: 'generate_report',
            type: 'report_generation',
            config: { template: 'research_synthesis', format: 'markdown' },
            position: { x: 900, y: 150 },
          },
        ],
        edges: [
          { source: 'trigger', target: 'select_docs' },
          { source: 'select_docs', target: 'cross_reference' },
          { source: 'cross_reference', target: 'synthesize' },
          { source: 'synthesize', target: 'generate_report' },
        ],
      },
      created_at: getRandomDate(30),
    },
    {
      id: uuidv4(),
      name: 'Spaced Repetition Optimizer',
      description: 'Automatically adjust flashcard difficulty based on performance',
      category: 'learning',
      is_public: true,
      workflow_definition: {
        nodes: [
          {
            id: 'trigger',
            type: 'schedule',
            config: { cron: '0 0 * * 0', timezone: 'UTC' }, // Weekly
            position: { x: 100, y: 100 },
          },
          {
            id: 'analyze_performance',
            type: 'performance_analysis',
            config: { period_days: 7, min_reviews: 10 },
            position: { x: 300, y: 100 },
          },
          {
            id: 'identify_difficult',
            type: 'difficulty_detection',
            config: { failure_threshold: 0.4, review_threshold: 5 },
            position: { x: 500, y: 100 },
          },
          {
            id: 'adjust_cards',
            type: 'flashcard_adjustment',
            config: { difficulty_change: 'adaptive', add_hints: true },
            position: { x: 700, y: 100 },
          },
          {
            id: 'generate_report',
            type: 'performance_report',
            config: { include_recommendations: true },
            position: { x: 900, y: 100 },
          },
        ],
        edges: [
          { source: 'trigger', target: 'analyze_performance' },
          { source: 'analyze_performance', target: 'identify_difficult' },
          { source: 'identify_difficult', target: 'adjust_cards' },
          { source: 'adjust_cards', target: 'generate_report' },
        ],
      },
      created_at: getRandomDate(20),
    },
  ];

  const createdTemplates: any[] = [];
  for (const template of templates) {
    const { data, error } = await supabase
      .from('workflow_templates')
      .insert(template)
      .select()
      .single();
    
    if (!error && data) {
      createdTemplates.push(data);
    }
  }

  console.log(`      ✓ Created ${createdTemplates.length} workflow templates`);
  return createdTemplates;
}

async function createUserWorkflows(supabase: any, userId: string, templates: any[]) {
  console.log('    Creating user workflows...');
  
  const userWorkflows = [];
  
  // Create workflows from templates
  for (const template of templates) {
    const workflow = {
      id: uuidv4(),
      user_id: userId,
      template_id: template.id,
      name: `My ${template.name}`,
      description: template.description,
      workflow_definition: {
        ...template.workflow_definition,
        // Add some customizations
        nodes: template.workflow_definition.nodes.map((node: any) => ({
          ...node,
          config: {
            ...node.config,
            user_customized: true,
          },
        })),
      },
      is_active: Math.random() < 0.7,
      last_run: Math.random() < 0.5 ? getRandomDate(7) : null,
      run_count: Math.floor(Math.random() * 50),
      created_at: getRandomDate(30),
      updated_at: getRandomDate(10),
    };
    
    userWorkflows.push(workflow);
  }
  
  // Create a custom workflow
  const customWorkflow = {
    id: uuidv4(),
    user_id: userId,
    template_id: null,
    name: 'Custom Research Workflow',
    description: 'My personalized workflow for processing physics papers',
    workflow_definition: {
      nodes: [
        {
          id: 'upload',
          type: 'document_upload',
          config: { tags: ['physics', 'quantum'] },
          position: { x: 100, y: 100 },
        },
        {
          id: 'extract',
          type: 'text_extraction',
          config: {},
          position: { x: 300, y: 100 },
        },
        {
          id: 'equations',
          type: 'equation_extraction',
          config: { format: 'latex' },
          position: { x: 500, y: 100 },
        },
        {
          id: 'flashcards',
          type: 'flashcard_generation',
          config: { focus: 'equations', difficulty: 'hard' },
          position: { x: 700, y: 100 },
        },
      ],
      edges: [
        { source: 'upload', target: 'extract' },
        { source: 'extract', target: 'equations' },
        { source: 'equations', target: 'flashcards' },
      ],
    },
    is_active: true,
    last_run: getRandomDate(2),
    run_count: 15,
    created_at: getRandomDate(15),
    updated_at: getRandomDate(2),
  };
  
  userWorkflows.push(customWorkflow);
  
  const createdWorkflows: any[] = [];
  for (const workflow of userWorkflows) {
    const { data, error } = await supabase
      .from('workflows')
      .insert(workflow)
      .select()
      .single();
    
    if (!error && data) {
      createdWorkflows.push(data);
    }
  }
  
  console.log(`      ✓ Created ${createdWorkflows.length} user workflows`);
  return createdWorkflows;
}

async function createExecutionHistory(supabase: any, userId: string, workflows: any[]) {
  console.log('    Creating workflow execution history...');
  
  let totalExecutions = 0;
  
  for (const workflow of workflows) {
    if (workflow.run_count > 0) {
      // Create executions based on run count
      const executionCount = Math.min(workflow.run_count, 20); // Limit history
      
      for (let i = 0; i < executionCount; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const executionTime = new Date();
        executionTime.setDate(executionTime.getDate() - daysAgo);
        
        const status = Math.random() < 0.85 ? 'completed' : Math.random() < 0.5 ? 'failed' : 'cancelled';
        const duration = status === 'completed' 
          ? Math.floor(Math.random() * 300) + 30 
          : Math.floor(Math.random() * 60) + 10;
        
        const execution = {
          id: uuidv4(),
          workflow_id: workflow.id,
          user_id: userId,
          status,
          started_at: executionTime.toISOString(),
          completed_at: status !== 'running' 
            ? new Date(executionTime.getTime() + duration * 1000).toISOString() 
            : null,
          duration_seconds: status !== 'running' ? duration : null,
          trigger_type: getTriggerType(workflow),
          execution_log: generateExecutionLog(workflow, status),
          error_message: status === 'failed' ? generateErrorMessage() : null,
          created_at: executionTime.toISOString(),
        };
        
        const { error } = await supabase
          .from('workflow_executions')
          .insert(execution);
        
        if (!error) {
          totalExecutions++;
          
          // Create node execution details
          await createNodeExecutions(supabase, execution, workflow, status);
        }
      }
    }
  }
  
  console.log(`      ✓ Created ${totalExecutions} workflow executions`);
}

async function createNodeExecutions(
  supabase: any,
  execution: any,
  workflow: any,
  overallStatus: string
) {
  const nodes = workflow.workflow_definition.nodes;
  const nodeExecutions = [];
  
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    
    // Determine if this node was reached
    const wasReached = overallStatus === 'completed' || 
      (overallStatus === 'failed' && i <= Math.floor(nodes.length * Math.random()));
    
    if (wasReached) {
      const nodeStatus = overallStatus === 'completed' || i < nodes.length - 1 
        ? 'completed' 
        : 'failed';
      
      const nodeExecution = {
        id: uuidv4(),
        execution_id: execution.id,
        node_id: node.id,
        node_type: node.type,
        status: nodeStatus,
        started_at: new Date(execution.started_at).toISOString(),
        completed_at: new Date(
          new Date(execution.started_at).getTime() + (i + 1) * 10000
        ).toISOString(),
        input_data: generateNodeInput(node),
        output_data: nodeStatus === 'completed' ? generateNodeOutput(node) : null,
        error_message: nodeStatus === 'failed' ? 'Node execution failed' : null,
      };
      
      nodeExecutions.push(nodeExecution);
    }
  }
  
  if (nodeExecutions.length > 0) {
    await supabase.from('workflow_node_executions').insert(nodeExecutions);
  }
}

// Helper functions
function getTriggerType(workflow: any): string {
  const triggerNode = workflow.workflow_definition.nodes.find(
    (n: any) => n.type === 'schedule' || n.type === 'manual' || n.type === 'document_upload'
  );
  
  if (triggerNode?.type === 'schedule') return 'scheduled';
  if (triggerNode?.type === 'document_upload') return 'document_trigger';
  return 'manual';
}

function generateExecutionLog(workflow: any, status: string): any {
  const log = {
    workflow_name: workflow.name,
    nodes_executed: status === 'completed' ? workflow.workflow_definition.nodes.length : Math.floor(workflow.workflow_definition.nodes.length * Math.random()),
    status,
    messages: [],
  };
  
  if (status === 'completed') {
    log.messages = [
      'Workflow started successfully',
      'All nodes executed without errors',
      'Workflow completed successfully',
    ];
  } else if (status === 'failed') {
    log.messages = [
      'Workflow started',
      'Processing nodes...',
      'Error encountered during execution',
    ];
  }
  
  return log;
}

function generateErrorMessage(): string {
  const errors = [
    'Failed to connect to AI service',
    'Document processing timeout',
    'Insufficient permissions',
    'Rate limit exceeded',
    'Invalid configuration',
  ];
  return errors[Math.floor(Math.random() * errors.length)];
}

function generateNodeInput(node: any): any {
  switch (node.type) {
    case 'fetch_documents':
      return { filter: node.config.filter, limit: node.config.limit };
    case 'ai_summarize':
      return { text: 'Sample document text...', model: node.config.model };
    case 'document_selector':
      return { tags: node.config.tags };
    default:
      return { config: node.config };
  }
}

function generateNodeOutput(node: any): any {
  switch (node.type) {
    case 'fetch_documents':
      return { documents: ['doc1.pdf', 'doc2.pdf'], count: 2 };
    case 'ai_summarize':
      return { summary: 'This document discusses quantum mechanics...', tokens_used: 450 };
    case 'flashcard_generation':
      return { flashcards_created: 15, set_id: uuidv4() };
    case 'performance_analysis':
      return { accuracy: 0.75, cards_reviewed: 120, weak_areas: ['quantum mechanics'] };
    default:
      return { success: true, timestamp: new Date().toISOString() };
  }
}

function getRandomDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date.toISOString();
}

export async function cleanupWorkflows(supabase: any) {
  await supabase.from('workflow_node_executions').delete().gte('created_at', '2020-01-01');
  await supabase.from('workflow_executions').delete().gte('created_at', '2020-01-01');
  await supabase.from('workflows').delete().gte('created_at', '2020-01-01');
  await supabase.from('workflow_templates').delete().gte('created_at', '2020-01-01');
}