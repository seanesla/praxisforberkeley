-- Smart Reports Generator and Enhanced Analytics Tables

-- Report templates table
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- academic, business, technical, summary, custom
  
  -- Template structure
  sections JSONB NOT NULL, -- Array of section definitions
  default_format VARCHAR(20) DEFAULT 'pdf', -- pdf, docx, html, markdown
  
  -- Customization options
  customizable_fields JSONB DEFAULT '[]',
  required_data_types TEXT[], -- documents, notes, flashcards, etc.
  
  -- Style settings
  style_config JSONB DEFAULT '{}',
  
  active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated reports table
CREATE TABLE IF NOT EXISTS generated_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
  
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Report configuration
  config JSONB NOT NULL, -- User customizations
  format VARCHAR(20) NOT NULL,
  
  -- Source data
  source_documents UUID[], -- Document IDs used
  source_notes UUID[], -- Note IDs used
  data_snapshot JSONB, -- Snapshot of data at generation time
  
  -- Output
  file_url TEXT,
  file_size INTEGER,
  page_count INTEGER,
  
  -- Generation metadata
  generation_time_ms INTEGER,
  ai_tokens_used INTEGER,
  
  status VARCHAR(50) DEFAULT 'pending', -- pending, generating, completed, failed
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document workspace configurations
CREATE TABLE IF NOT EXISTS document_workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Layout configuration
  layout_type VARCHAR(50) DEFAULT 'split', -- split, tabs, grid
  layout_config JSONB DEFAULT '{}',
  
  -- Workspace state
  open_documents JSONB DEFAULT '[]', -- Array of document IDs and positions
  active_document_id UUID,
  
  -- Sync settings
  sync_scrolling BOOLEAN DEFAULT TRUE,
  sync_selection BOOLEAN DEFAULT FALSE,
  
  -- Saved state
  scroll_positions JSONB DEFAULT '{}',
  zoom_levels JSONB DEFAULT '{}',
  
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  event_type VARCHAR(100) NOT NULL,
  event_category VARCHAR(50) NOT NULL, -- navigation, interaction, performance, error
  
  -- Event data
  properties JSONB DEFAULT '{}',
  
  -- Context
  session_id UUID,
  page_path TEXT,
  referrer TEXT,
  
  -- Performance metrics (if applicable)
  duration_ms INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User analytics summaries table
CREATE TABLE IF NOT EXISTS user_analytics_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Time period
  period_type VARCHAR(20) NOT NULL, -- daily, weekly, monthly
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Activity metrics
  total_sessions INTEGER DEFAULT 0,
  total_time_spent INTEGER DEFAULT 0, -- seconds
  
  -- Feature usage
  documents_created INTEGER DEFAULT 0,
  documents_viewed INTEGER DEFAULT 0,
  notes_created INTEGER DEFAULT 0,
  flashcards_studied INTEGER DEFAULT 0,
  exercises_completed INTEGER DEFAULT 0,
  
  -- Learning metrics
  study_streak_days INTEGER DEFAULT 0,
  knowledge_growth_score FLOAT,
  
  -- Productivity metrics
  workflows_executed INTEGER DEFAULT 0,
  reports_generated INTEGER DEFAULT 0,
  
  -- Detailed breakdowns
  feature_usage JSONB DEFAULT '{}',
  time_distribution JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, period_type, period_start)
);

-- Semantic search queries table (for search v2)
CREATE TABLE IF NOT EXISTS search_queries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  query_text TEXT NOT NULL,
  expanded_query TEXT, -- After query expansion
  
  -- Search configuration
  search_scope TEXT[], -- documents, notes, flashcards, etc.
  filters JSONB DEFAULT '{}',
  
  -- Results metadata
  result_count INTEGER DEFAULT 0,
  top_results JSONB DEFAULT '[]',
  
  -- Performance
  execution_time_ms INTEGER,
  
  -- User interaction
  clicked_results JSONB DEFAULT '[]',
  satisfaction_score INTEGER, -- 1-5 rating if provided
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_generated_reports_user_id ON generated_reports(user_id);
CREATE INDEX idx_generated_reports_status ON generated_reports(status);
CREATE INDEX idx_document_workspaces_user_id ON document_workspaces(user_id);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX idx_user_analytics_summaries_user_period ON user_analytics_summaries(user_id, period_type, period_start);
CREATE INDEX idx_search_queries_user_id ON search_queries(user_id);

-- Enable RLS
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All users can view report templates" ON report_templates
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can manage own generated reports" ON generated_reports
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own document workspaces" ON document_workspaces
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own analytics events" ON analytics_events
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own analytics summaries" ON user_analytics_summaries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own search queries" ON search_queries
  FOR ALL USING (auth.uid() = user_id);

-- Update triggers
CREATE TRIGGER update_report_templates_updated_at BEFORE UPDATE ON report_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_reports_updated_at BEFORE UPDATE ON generated_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_workspaces_updated_at BEFORE UPDATE ON document_workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();