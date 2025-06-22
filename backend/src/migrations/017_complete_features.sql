-- Complete Praxis Features Migration
-- This migration adds all remaining tables for the full feature set

-- Spaced Repetition Tables
CREATE TABLE IF NOT EXISTS study_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repetitions INTEGER DEFAULT 0,
  ease_factor FLOAT DEFAULT 2.5,
  interval INTEGER DEFAULT 1,
  next_review_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  total_reviews INTEGER DEFAULT 0,
  successful_reviews INTEGER DEFAULT 0,
  failed_reviews INTEGER DEFAULT 0,
  average_response_time INTEGER DEFAULT 0,
  average_quality FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(flashcard_id, user_id)
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_set_id UUID NOT NULL REFERENCES flashcard_sets(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL DEFAULT 'spaced_repetition',
  cards_studied INTEGER DEFAULT 0,
  cards_mastered INTEGER DEFAULT 0,
  cards_learning INTEGER DEFAULT 0,
  cards_relearning INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  performance_data JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS study_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_study_date DATE,
  total_study_days INTEGER DEFAULT 0,
  streak_data JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS study_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES study_sessions(id) ON DELETE CASCADE,
  study_card_id UUID NOT NULL REFERENCES study_cards(id) ON DELETE CASCADE,
  quality INTEGER NOT NULL CHECK (quality >= 0 AND quality <= 5),
  response_time INTEGER NOT NULL,
  prev_ease_factor FLOAT NOT NULL,
  prev_interval INTEGER NOT NULL,
  prev_repetitions INTEGER NOT NULL,
  new_ease_factor FLOAT NOT NULL,
  new_interval INTEGER NOT NULL,
  new_repetitions INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Exercise Engine Tables
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_type TEXT NOT NULL CHECK (exercise_type IN ('multiple_choice', 'fill_blank', 'true_false', 'matching', 'ordering', 'short_answer', 'essay', 'code_completion')),
  question TEXT NOT NULL,
  correct_answer JSONB NOT NULL,
  options JSONB,
  hints JSONB DEFAULT '[]',
  explanation TEXT,
  points INTEGER DEFAULT 1,
  time_limit INTEGER,
  difficulty FLOAT DEFAULT 0.5 CHECK (difficulty >= 0 AND difficulty <= 1),
  concepts TEXT[] DEFAULT '{}',
  skills TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exercise_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  exercises_completed INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  total_points_earned INTEGER DEFAULT 0,
  performance_by_type JSONB DEFAULT '{}',
  duration_seconds INTEGER,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS exercise_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES exercise_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_answer JSONB NOT NULL,
  is_correct BOOLEAN NOT NULL,
  points_earned INTEGER DEFAULT 0,
  time_taken INTEGER,
  hints_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge Gap Tables
CREATE TABLE IF NOT EXISTS knowledge_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  gap_type TEXT NOT NULL CHECK (gap_type IN ('missing_prerequisite', 'weak_understanding', 'misconception', 'not_practiced')),
  severity FLOAT NOT NULL CHECK (severity >= 0 AND severity <= 1),
  related_concepts TEXT[] DEFAULT '{}',
  recommended_resources JSONB DEFAULT '[]',
  detection_method TEXT CHECK (detection_method IN ('quiz_performance', 'ai_analysis', 'self_reported')),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_concepts TEXT[] NOT NULL,
  prerequisite_concepts TEXT[] DEFAULT '{}',
  steps JSONB NOT NULL,
  estimated_duration INTEGER,
  difficulty_level TEXT,
  completion_percentage FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS concept_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  mastery_level FLOAT DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 1),
  last_assessed TIMESTAMP WITH TIME ZONE,
  assessment_history JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, concept)
);

-- Document DNA Tables
CREATE TABLE IF NOT EXISTS document_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE UNIQUE,
  fingerprint JSONB NOT NULL,
  metrics JSONB NOT NULL,
  vocabulary_richness FLOAT,
  sentence_complexity FLOAT,
  topic_diversity FLOAT,
  structural_depth INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Citation Network Tables
CREATE TABLE IF NOT EXISTS citation_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  target_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  citation_text TEXT NOT NULL,
  citation_context TEXT,
  confidence_score FLOAT DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_document_id, target_document_id, citation_text)
);

CREATE TABLE IF NOT EXISTS citation_metrics (
  document_id UUID PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  in_degree INTEGER DEFAULT 0,
  out_degree INTEGER DEFAULT 0,
  betweenness_centrality FLOAT DEFAULT 0,
  eigenvector_centrality FLOAT DEFAULT 0,
  clustering_coefficient FLOAT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced Search Tables
CREATE TABLE IF NOT EXISTS search_indexes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  index_type TEXT NOT NULL CHECK (index_type IN ('title', 'content', 'semantic', 'entity')),
  index_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cross-Document Insights Tables
CREATE TABLE IF NOT EXISTS document_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('contradiction', 'agreement', 'pattern', 'gap', 'synthesis')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  document_ids UUID[] NOT NULL,
  evidence JSONB NOT NULL,
  confidence_score FLOAT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  tags TEXT[] DEFAULT '{}',
  dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document Workspace Tables
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  layout_config JSONB NOT NULL,
  document_states JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Report Templates and Generation
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('research', 'summary', 'analysis', 'custom')),
  structure JSONB NOT NULL,
  style_config JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  source_documents UUID[] NOT NULL,
  export_formats TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Workflow Automation Tables
CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  workflow_definition JSONB NOT NULL,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enhanced Analytics Tables
CREATE TABLE IF NOT EXISTS analytics_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  metric_value FLOAT NOT NULL,
  dimensions JSONB DEFAULT '{}',
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  widget_config JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create all indexes for performance
CREATE INDEX IF NOT EXISTS idx_study_cards_user_review ON study_cards(user_id, next_review_date);
CREATE INDEX IF NOT EXISTS idx_study_cards_flashcard ON study_cards(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_streaks_user ON study_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_study_reviews_session ON study_reviews(session_id);
CREATE INDEX IF NOT EXISTS idx_study_reviews_card ON study_reviews(study_card_id);
CREATE INDEX IF NOT EXISTS idx_exercises_document ON exercises(document_id);
CREATE INDEX IF NOT EXISTS idx_exercises_user ON exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sessions_user ON exercise_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_responses_session ON exercise_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_user_concept ON knowledge_gaps(user_id, concept);
CREATE INDEX IF NOT EXISTS idx_learning_paths_user ON learning_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_user ON concept_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_document_dna_document ON document_dna(document_id);
CREATE INDEX IF NOT EXISTS idx_citation_links_source ON citation_links(source_document_id);
CREATE INDEX IF NOT EXISTS idx_citation_links_target ON citation_links(target_document_id);
CREATE INDEX IF NOT EXISTS idx_citation_metrics_document ON citation_metrics(document_id);
CREATE INDEX IF NOT EXISTS idx_search_indexes_document ON search_indexes(document_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_document_insights_user ON document_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_user ON workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_user ON report_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_user ON generated_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_user ON analytics_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_dashboards_user ON analytics_dashboards(user_id);

-- Enable RLS on all new tables
ALTER TABLE study_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_dna ENABLE ROW LEVEL SECURITY;
ALTER TABLE citation_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE citation_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_indexes ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_dashboards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for all tables
CREATE POLICY "study_cards_policy" ON study_cards FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "study_sessions_policy" ON study_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "study_streaks_policy" ON study_streaks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "study_reviews_policy" ON study_reviews FOR ALL USING (auth.uid() = (SELECT user_id FROM study_sessions WHERE id = session_id));
CREATE POLICY "exercises_policy" ON exercises FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "exercise_sessions_policy" ON exercise_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "exercise_responses_policy" ON exercise_responses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "knowledge_gaps_policy" ON knowledge_gaps FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "learning_paths_policy" ON learning_paths FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "concept_mastery_policy" ON concept_mastery FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "document_dna_policy" ON document_dna FOR ALL USING (auth.uid() = (SELECT user_id FROM documents WHERE id = document_id));
CREATE POLICY "citation_links_read_policy" ON citation_links FOR SELECT USING (auth.uid() = (SELECT user_id FROM documents WHERE id = source_document_id));
CREATE POLICY "citation_links_write_policy" ON citation_links FOR INSERT USING (auth.uid() = (SELECT user_id FROM documents WHERE id = source_document_id));
CREATE POLICY "citation_metrics_policy" ON citation_metrics FOR ALL USING (auth.uid() = (SELECT user_id FROM documents WHERE id = document_id));
CREATE POLICY "search_indexes_policy" ON search_indexes FOR ALL USING (auth.uid() = (SELECT user_id FROM documents WHERE id = document_id));
CREATE POLICY "saved_searches_policy" ON saved_searches FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "document_insights_policy" ON document_insights FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "workspaces_policy" ON workspaces FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "report_templates_read_policy" ON report_templates FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "report_templates_write_policy" ON report_templates FOR INSERT USING (auth.uid() = user_id);
CREATE POLICY "report_templates_update_policy" ON report_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "report_templates_delete_policy" ON report_templates FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "generated_reports_policy" ON generated_reports FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "workflow_executions_policy" ON workflow_executions FOR ALL USING (auth.uid() = (SELECT user_id FROM workflows WHERE id = workflow_id));
CREATE POLICY "analytics_metrics_policy" ON analytics_metrics FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "analytics_dashboards_policy" ON analytics_dashboards FOR ALL USING (auth.uid() = user_id);

-- Create update timestamp triggers
CREATE TRIGGER update_study_cards_updated_at BEFORE UPDATE ON study_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_sessions_updated_at BEFORE UPDATE ON study_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_streaks_updated_at BEFORE UPDATE ON study_streaks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_gaps_updated_at BEFORE UPDATE ON knowledge_gaps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_paths_updated_at BEFORE UPDATE ON learning_paths
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_concept_mastery_updated_at BEFORE UPDATE ON concept_mastery
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_citation_metrics_updated_at BEFORE UPDATE ON citation_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_templates_updated_at BEFORE UPDATE ON report_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_dashboards_updated_at BEFORE UPDATE ON analytics_dashboards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();