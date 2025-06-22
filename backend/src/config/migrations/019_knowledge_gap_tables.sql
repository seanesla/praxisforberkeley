-- Knowledge Gap Detection Tables

-- Knowledge topics table
CREATE TABLE IF NOT EXISTS knowledge_topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  topic_name VARCHAR(255) NOT NULL,
  parent_topic_id UUID REFERENCES knowledge_topics(id) ON DELETE SET NULL,
  
  description TEXT,
  complexity_level INTEGER DEFAULT 1, -- 1-5 scale
  
  -- Hierarchical path for efficient querying
  path TEXT[],
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge states table (user's understanding of topics)
CREATE TABLE IF NOT EXISTS knowledge_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES knowledge_topics(id) ON DELETE CASCADE,
  
  -- Understanding metrics
  mastery_level FLOAT DEFAULT 0, -- 0-1 scale
  confidence_score FLOAT DEFAULT 0, -- 0-1 scale
  
  -- Learning progress
  exposure_count INTEGER DEFAULT 0,
  successful_applications INTEGER DEFAULT 0,
  failed_applications INTEGER DEFAULT 0,
  
  -- Time-based metrics
  first_exposure_at TIMESTAMP WITH TIME ZONE,
  last_interaction_at TIMESTAMP WITH TIME ZONE,
  total_study_time INTEGER DEFAULT 0, -- seconds
  
  -- Prerequisite tracking
  prerequisites_met BOOLEAN DEFAULT FALSE,
  blocking_prerequisites UUID[], -- Topic IDs blocking progress
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, topic_id)
);

-- Knowledge gaps table
CREATE TABLE IF NOT EXISTS knowledge_gaps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  gap_type VARCHAR(50) NOT NULL, -- prerequisite, conceptual, application, retention
  severity VARCHAR(20) NOT NULL, -- critical, high, medium, low
  
  topic_id UUID REFERENCES knowledge_topics(id) ON DELETE CASCADE,
  related_topics UUID[], -- Array of related topic IDs
  
  description TEXT NOT NULL,
  
  -- Detection metadata
  detected_from JSONB NOT NULL, -- Source of detection (quiz results, study patterns, etc.)
  detection_confidence FLOAT NOT NULL, -- 0-1 scale
  
  -- Recommendation
  recommended_actions JSONB DEFAULT '[]',
  recommended_resources UUID[], -- Document/exercise IDs
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'open', -- open, in_progress, resolved
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Learning paths table (recommended sequences to fill gaps)
CREATE TABLE IF NOT EXISTS learning_paths (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gap_id UUID REFERENCES knowledge_gaps(id) ON DELETE CASCADE,
  
  path_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Path structure
  steps JSONB NOT NULL, -- Array of learning steps
  total_steps INTEGER NOT NULL,
  completed_steps INTEGER DEFAULT 0,
  
  estimated_duration INTEGER, -- minutes
  difficulty VARCHAR(20) DEFAULT 'medium',
  
  -- Progress tracking
  current_step INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  effectiveness_score FLOAT, -- Measured after completion
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gap detection events table (for tracking what triggered detection)
CREATE TABLE IF NOT EXISTS gap_detection_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  event_type VARCHAR(50) NOT NULL, -- quiz_failure, slow_progress, pattern_analysis, manual_review
  source_type VARCHAR(50) NOT NULL, -- exercise, flashcard, document, socratic
  source_id UUID, -- ID of the source item
  
  -- Analysis results
  topics_analyzed UUID[],
  gaps_detected INTEGER DEFAULT 0,
  
  analysis_data JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prerequisite relationships table
CREATE TABLE IF NOT EXISTS topic_prerequisites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID NOT NULL REFERENCES knowledge_topics(id) ON DELETE CASCADE,
  prerequisite_id UUID NOT NULL REFERENCES knowledge_topics(id) ON DELETE CASCADE,
  
  requirement_type VARCHAR(50) DEFAULT 'required', -- required, recommended, helpful
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(topic_id, prerequisite_id)
);

-- Create indexes
CREATE INDEX idx_knowledge_topics_user_id ON knowledge_topics(user_id);
CREATE INDEX idx_knowledge_topics_parent ON knowledge_topics(parent_topic_id);
CREATE INDEX idx_knowledge_states_user_id ON knowledge_states(user_id);
CREATE INDEX idx_knowledge_states_topic_id ON knowledge_states(topic_id);
CREATE INDEX idx_knowledge_gaps_user_id ON knowledge_gaps(user_id);
CREATE INDEX idx_knowledge_gaps_status ON knowledge_gaps(status);
CREATE INDEX idx_learning_paths_user_id ON learning_paths(user_id);
CREATE INDEX idx_gap_detection_events_user_id ON gap_detection_events(user_id);
CREATE INDEX idx_topic_prerequisites_topic ON topic_prerequisites(topic_id);

-- Enable RLS
ALTER TABLE knowledge_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE gap_detection_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_prerequisites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own knowledge topics" ON knowledge_topics
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own knowledge states" ON knowledge_states
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own knowledge gaps" ON knowledge_gaps
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own learning paths" ON learning_paths
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own gap detection events" ON gap_detection_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view topic prerequisites" ON topic_prerequisites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM knowledge_topics
      WHERE knowledge_topics.id = topic_prerequisites.topic_id
      AND knowledge_topics.user_id = auth.uid()
    )
  );

-- Update triggers
CREATE TRIGGER update_knowledge_topics_updated_at BEFORE UPDATE ON knowledge_topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_states_updated_at BEFORE UPDATE ON knowledge_states
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_gaps_updated_at BEFORE UPDATE ON knowledge_gaps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_paths_updated_at BEFORE UPDATE ON learning_paths
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();