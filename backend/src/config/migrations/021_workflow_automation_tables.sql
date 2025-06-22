-- Workflow Automation Tables

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Workflow configuration
  trigger_type VARCHAR(50) NOT NULL, -- manual, schedule, event, webhook
  trigger_config JSONB NOT NULL,
  
  -- Visual builder data
  flow_data JSONB NOT NULL, -- Nodes and edges for visual representation
  
  -- Execution settings
  enabled BOOLEAN DEFAULT TRUE,
  max_retries INTEGER DEFAULT 3,
  timeout_seconds INTEGER DEFAULT 300,
  
  -- Statistics
  execution_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow actions table
CREATE TABLE IF NOT EXISTS workflow_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  action_type VARCHAR(100) NOT NULL, -- document_process, ai_generate, export, notify, etc.
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Input/Output schema
  input_schema JSONB NOT NULL,
  output_schema JSONB NOT NULL,
  
  -- Configuration template
  config_template JSONB NOT NULL,
  
  -- Action metadata
  category VARCHAR(50) NOT NULL, -- document, ai, export, transform, notify
  icon VARCHAR(50),
  
  active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow executions table
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  
  -- Execution details
  status VARCHAR(50) NOT NULL, -- pending, running, completed, failed, cancelled
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Execution data
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  
  -- Step tracking
  total_steps INTEGER,
  completed_steps INTEGER DEFAULT 0,
  current_step VARCHAR(255),
  
  -- Performance metrics
  execution_time_ms INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow execution steps
CREATE TABLE IF NOT EXISTS workflow_execution_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  
  step_name VARCHAR(255) NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  
  status VARCHAR(50) NOT NULL, -- pending, running, completed, failed, skipped
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow templates table
CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- research, study, productivity, analysis
  
  -- Template definition
  flow_data JSONB NOT NULL,
  default_config JSONB DEFAULT '{}',
  
  -- Usage stats
  usage_count INTEGER DEFAULT 0,
  
  -- Metadata
  tags TEXT[],
  difficulty VARCHAR(20) DEFAULT 'beginner', -- beginner, intermediate, advanced
  
  active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_workflows_user_id ON workflows(user_id);
CREATE INDEX idx_workflows_enabled ON workflows(enabled);
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_execution_steps_execution_id ON workflow_execution_steps(execution_id);
CREATE INDEX idx_workflow_templates_category ON workflow_templates(category);

-- Enable RLS
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_execution_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own workflows" ON workflows
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "All users can view workflow actions" ON workflow_actions
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can view own workflow executions" ON workflow_executions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workflows
      WHERE workflows.id = workflow_executions.workflow_id
      AND workflows.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own execution steps" ON workflow_execution_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workflow_executions
      JOIN workflows ON workflows.id = workflow_executions.workflow_id
      WHERE workflow_executions.id = workflow_execution_steps.execution_id
      AND workflows.user_id = auth.uid()
    )
  );

CREATE POLICY "All users can view workflow templates" ON workflow_templates
  FOR SELECT USING (TRUE);

-- Update triggers
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_templates_updated_at BEFORE UPDATE ON workflow_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();