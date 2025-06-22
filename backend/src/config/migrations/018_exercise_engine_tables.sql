-- Interactive Exercise Engine Tables

-- Exercise sets table
CREATE TABLE IF NOT EXISTS exercise_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  difficulty_level VARCHAR(20) DEFAULT 'medium', -- easy, medium, hard, adaptive
  exercise_count INTEGER DEFAULT 0,
  estimated_duration INTEGER, -- minutes
  
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exercises table
CREATE TABLE IF NOT EXISTS exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id UUID NOT NULL REFERENCES exercise_sets(id) ON DELETE CASCADE,
  
  exercise_type VARCHAR(50) NOT NULL, -- multiple_choice, fill_blank, true_false, matching, ordering, short_answer, essay, code_completion
  question TEXT NOT NULL,
  
  -- Different answer formats based on type
  correct_answer JSONB NOT NULL, -- Flexible structure for different types
  options JSONB, -- For multiple choice, matching
  hints JSONB DEFAULT '[]',
  explanation TEXT,
  
  points INTEGER DEFAULT 1,
  time_limit INTEGER, -- seconds, optional
  difficulty FLOAT DEFAULT 0.5, -- 0-1 scale
  
  -- Learning objectives
  concepts TEXT[],
  skills TEXT[],
  
  order_index INTEGER,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exercise attempts table
CREATE TABLE IF NOT EXISTS exercise_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  session_id UUID REFERENCES exercise_sessions(id) ON DELETE SET NULL,
  
  user_answer JSONB NOT NULL,
  is_correct BOOLEAN NOT NULL,
  points_earned INTEGER DEFAULT 0,
  time_taken INTEGER, -- seconds
  
  hints_used INTEGER DEFAULT 0,
  attempt_number INTEGER DEFAULT 1,
  
  feedback TEXT,
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exercise sessions table
CREATE TABLE IF NOT EXISTS exercise_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  set_id UUID NOT NULL REFERENCES exercise_sets(id) ON DELETE CASCADE,
  
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- seconds
  
  total_exercises INTEGER DEFAULT 0,
  completed_exercises INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  
  score FLOAT,
  max_score FLOAT,
  percentage FLOAT,
  
  session_type VARCHAR(50) DEFAULT 'practice', -- practice, quiz, exam
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exercise templates table (for auto-generation)
CREATE TABLE IF NOT EXISTS exercise_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  template_type VARCHAR(50) NOT NULL,
  exercise_type VARCHAR(50) NOT NULL,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Template pattern for question generation
  question_pattern TEXT NOT NULL,
  answer_pattern JSONB NOT NULL,
  
  -- Constraints for generation
  min_difficulty FLOAT DEFAULT 0,
  max_difficulty FLOAT DEFAULT 1,
  
  applicable_concepts TEXT[],
  required_context_type VARCHAR(50), -- definition, example, explanation, etc.
  
  active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exercise performance analytics
CREATE TABLE IF NOT EXISTS exercise_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  total_attempts INTEGER DEFAULT 0,
  unique_exercises INTEGER DEFAULT 0,
  
  overall_accuracy FLOAT,
  average_time_per_question INTEGER, -- seconds
  
  strengths TEXT[], -- Concepts/skills with high performance
  weaknesses TEXT[], -- Concepts/skills needing improvement
  
  by_type_stats JSONB DEFAULT '{}', -- Stats per exercise type
  by_difficulty_stats JSONB DEFAULT '{}', -- Stats per difficulty level
  
  last_activity_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX idx_exercise_sets_user_id ON exercise_sets(user_id);
CREATE INDEX idx_exercise_sets_document_id ON exercise_sets(document_id);
CREATE INDEX idx_exercises_set_id ON exercises(set_id);
CREATE INDEX idx_exercise_attempts_user_id ON exercise_attempts(user_id);
CREATE INDEX idx_exercise_attempts_exercise_id ON exercise_attempts(exercise_id);
CREATE INDEX idx_exercise_sessions_user_id ON exercise_sessions(user_id);
CREATE INDEX idx_exercise_analytics_user_id ON exercise_analytics(user_id);

-- Enable RLS
ALTER TABLE exercise_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own exercise sets" ON exercise_sets
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view exercises in their sets" ON exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM exercise_sets
      WHERE exercise_sets.id = exercises.set_id
      AND exercise_sets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own exercise attempts" ON exercise_attempts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own exercise sessions" ON exercise_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view exercise templates" ON exercise_templates
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can manage own exercise analytics" ON exercise_analytics
  FOR ALL USING (auth.uid() = user_id);

-- Update triggers
CREATE TRIGGER update_exercise_sets_updated_at BEFORE UPDATE ON exercise_sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exercise_templates_updated_at BEFORE UPDATE ON exercise_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exercise_analytics_updated_at BEFORE UPDATE ON exercise_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();