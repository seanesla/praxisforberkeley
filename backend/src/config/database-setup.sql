-- Run this in your Supabase SQL editor to set up all required tables
-- This combines all migration files into one comprehensive setup

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  file_url TEXT,
  file_type VARCHAR(50),
  file_size INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flashcard sets table
CREATE TABLE IF NOT EXISTS flashcard_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flashcards table
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id UUID NOT NULL REFERENCES flashcard_sets(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mind maps table
CREATE TABLE IF NOT EXISTS mind_maps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mind map nodes table
CREATE TABLE IF NOT EXISTS mind_map_nodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mind_map_id UUID NOT NULL REFERENCES mind_maps(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mind map edges table
CREATE TABLE IF NOT EXISTS mind_map_edges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mind_map_id UUID NOT NULL REFERENCES mind_maps(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES mind_map_nodes(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES mind_map_nodes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Podcast sessions table
CREATE TABLE IF NOT EXISTS podcast_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER,
  summary TEXT,
  current_command VARCHAR(50),
  command_parameters JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Podcast transcripts table
CREATE TABLE IF NOT EXISTS podcast_transcripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES podcast_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  speaker VARCHAR(20) NOT NULL CHECK (speaker IN ('user', 'ai')),
  text TEXT NOT NULL,
  audio_url TEXT,
  confidence FLOAT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Socratic sessions table
CREATE TABLE IF NOT EXISTS socratic_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  topic VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  summary TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Socratic questions table
CREATE TABLE IF NOT EXISTS socratic_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES socratic_sessions(id) ON DELETE CASCADE,
  question JSONB NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Socratic responses table
CREATE TABLE IF NOT EXISTS socratic_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES socratic_sessions(id) ON DELETE CASCADE,
  question_id VARCHAR(255) NOT NULL,
  answer TEXT NOT NULL,
  evaluation JSONB,
  correct BOOLEAN,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_flashcard_sets_user_id ON flashcard_sets(user_id);
CREATE INDEX idx_flashcards_set_id ON flashcards(set_id);
CREATE INDEX idx_mind_maps_user_id ON mind_maps(user_id);
CREATE INDEX idx_mind_map_nodes_map_id ON mind_map_nodes(mind_map_id);
CREATE INDEX idx_mind_map_edges_map_id ON mind_map_edges(mind_map_id);
CREATE INDEX idx_podcast_sessions_user_id ON podcast_sessions(user_id);
CREATE INDEX idx_podcast_transcripts_session_id ON podcast_transcripts(session_id);
CREATE INDEX idx_socratic_sessions_user_id ON socratic_sessions(user_id);
CREATE INDEX idx_socratic_questions_session_id ON socratic_questions(session_id);
CREATE INDEX idx_socratic_responses_session_id ON socratic_responses(session_id);

-- Add update triggers
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_flashcard_sets_updated_at BEFORE UPDATE ON flashcard_sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON flashcards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_mind_maps_updated_at BEFORE UPDATE ON mind_maps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_podcast_sessions_updated_at BEFORE UPDATE ON podcast_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_socratic_sessions_updated_at BEFORE UPDATE ON socratic_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_map_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_map_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE socratic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE socratic_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE socratic_responses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for documents
CREATE POLICY "Users can view own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON documents
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for notes
CREATE POLICY "Users can view own notes" ON notes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own notes" ON notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON notes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON notes
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for flashcard_sets
CREATE POLICY "Users can view own flashcard sets" ON flashcard_sets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own flashcard sets" ON flashcard_sets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own flashcard sets" ON flashcard_sets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own flashcard sets" ON flashcard_sets
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for flashcards
CREATE POLICY "Users can view flashcards in their sets" ON flashcards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM flashcard_sets
      WHERE flashcard_sets.id = flashcards.set_id
      AND flashcard_sets.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can create flashcards in their sets" ON flashcards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM flashcard_sets
      WHERE flashcard_sets.id = flashcards.set_id
      AND flashcard_sets.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update flashcards in their sets" ON flashcards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM flashcard_sets
      WHERE flashcard_sets.id = flashcards.set_id
      AND flashcard_sets.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete flashcards in their sets" ON flashcards
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM flashcard_sets
      WHERE flashcard_sets.id = flashcards.set_id
      AND flashcard_sets.user_id = auth.uid()
    )
  );

-- Create RLS policies for mind maps
CREATE POLICY "Users can view own mind maps" ON mind_maps
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own mind maps" ON mind_maps
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mind maps" ON mind_maps
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own mind maps" ON mind_maps
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for podcast sessions
CREATE POLICY "Users can view own podcast sessions" ON podcast_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own podcast sessions" ON podcast_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own podcast sessions" ON podcast_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for podcast transcripts
CREATE POLICY "Users can view own transcripts" ON podcast_transcripts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own transcripts" ON podcast_transcripts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for socratic sessions
CREATE POLICY "Users can view own Socratic sessions" ON socratic_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own Socratic sessions" ON socratic_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own Socratic sessions" ON socratic_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- =====================================================
-- SPACED REPETITION SYSTEM TABLES
-- =====================================================

-- Study cards table (extends flashcards with SM-2 data)
CREATE TABLE IF NOT EXISTS study_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- SM-2 Algorithm parameters
  repetitions INTEGER DEFAULT 0,
  ease_factor FLOAT DEFAULT 2.5,
  interval INTEGER DEFAULT 1, -- Days until next review
  next_review_date DATE DEFAULT CURRENT_DATE,
  
  -- Study statistics
  total_reviews INTEGER DEFAULT 0,
  successful_reviews INTEGER DEFAULT 0,
  failed_reviews INTEGER DEFAULT 0,
  average_response_time INTEGER DEFAULT 0, -- milliseconds
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Difficulty tracking
  difficulty_rating FLOAT DEFAULT 0.3, -- 0-1 scale
  stability FLOAT DEFAULT 1.0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(flashcard_id, user_id)
);

-- Study sessions table
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  set_id UUID REFERENCES flashcard_sets(id) ON DELETE SET NULL,
  
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- seconds
  
  cards_studied INTEGER DEFAULT 0,
  cards_mastered INTEGER DEFAULT 0,
  cards_learning INTEGER DEFAULT 0,
  cards_relearning INTEGER DEFAULT 0,
  
  accuracy_rate FLOAT,
  average_ease FLOAT,
  
  session_type VARCHAR(50) DEFAULT 'review', -- review, learn, cram
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Study reviews table (individual card reviews)
CREATE TABLE IF NOT EXISTS study_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  study_card_id UUID NOT NULL REFERENCES study_cards(id) ON DELETE CASCADE,
  
  quality INTEGER NOT NULL CHECK (quality >= 0 AND quality <= 5), -- SM-2 quality rating
  response_time INTEGER NOT NULL, -- milliseconds
  
  -- Before review state
  prev_ease_factor FLOAT NOT NULL,
  prev_interval INTEGER NOT NULL,
  prev_repetitions INTEGER NOT NULL,
  
  -- After review state
  new_ease_factor FLOAT NOT NULL,
  new_interval INTEGER NOT NULL,
  new_repetitions INTEGER NOT NULL,
  
  reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Study streaks table
CREATE TABLE IF NOT EXISTS study_streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_study_date DATE,
  
  total_days_studied INTEGER DEFAULT 0,
  total_cards_reviewed INTEGER DEFAULT 0,
  total_time_studied INTEGER DEFAULT 0, -- seconds
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Learning goals table
CREATE TABLE IF NOT EXISTS learning_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  goal_type VARCHAR(50) NOT NULL, -- daily_cards, weekly_time, mastery_target
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  
  start_date DATE NOT NULL,
  end_date DATE,
  
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_study_cards_user_id ON study_cards(user_id);
CREATE INDEX idx_study_cards_flashcard_id ON study_cards(flashcard_id);
CREATE INDEX idx_study_cards_next_review ON study_cards(next_review_date);
CREATE INDEX idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX idx_study_reviews_session_id ON study_reviews(session_id);
CREATE INDEX idx_study_streaks_user_id ON study_streaks(user_id);
CREATE INDEX idx_learning_goals_user_id ON learning_goals(user_id);

-- Enable RLS
ALTER TABLE study_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own study cards" ON study_cards
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own study sessions" ON study_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own study reviews" ON study_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM study_sessions
      WHERE study_sessions.id = study_reviews.session_id
      AND study_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own study streaks" ON study_streaks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own learning goals" ON learning_goals
  FOR ALL USING (auth.uid() = user_id);

-- Update triggers
CREATE TRIGGER update_study_cards_updated_at BEFORE UPDATE ON study_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_streaks_updated_at BEFORE UPDATE ON study_streaks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_goals_updated_at BEFORE UPDATE ON learning_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- EXERCISE ENGINE TABLES
-- =====================================================

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

-- =====================================================
-- KNOWLEDGE GAP DETECTION TABLES
-- =====================================================

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

-- =====================================================
-- CITATION NETWORK ANALYSIS TABLES
-- =====================================================

-- Citations table
CREATE TABLE IF NOT EXISTS citations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Citation details
  citation_text TEXT NOT NULL,
  citation_type VARCHAR(50), -- academic, web, book, article, etc.
  
  -- Extracted metadata
  authors TEXT[],
  title TEXT,
  publication_year INTEGER,
  publication_name TEXT,
  doi TEXT,
  url TEXT,
  
  -- Position in document
  page_number INTEGER,
  paragraph_index INTEGER,
  character_offset INTEGER,
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Citation relationships table
CREATE TABLE IF NOT EXISTS citation_relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  citing_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  cited_document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  citation_id UUID REFERENCES citations(id) ON DELETE CASCADE,
  
  relationship_type VARCHAR(50) DEFAULT 'cites', -- cites, extends, contradicts, supports
  strength FLOAT DEFAULT 1.0, -- Relationship strength 0-1
  
  context TEXT, -- Surrounding text for context
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(citing_document_id, cited_document_id, citation_id)
);

-- Citation clusters table (groups of related citations)
CREATE TABLE IF NOT EXISTS citation_clusters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  cluster_name VARCHAR(255),
  cluster_type VARCHAR(50), -- topic, author, timeline, methodology
  
  -- Cluster metrics
  document_count INTEGER DEFAULT 0,
  citation_count INTEGER DEFAULT 0,
  
  -- Central topics/themes
  main_topics TEXT[],
  keywords TEXT[],
  
  -- Visualization data
  layout_data JSONB, -- Positions for network visualization
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Citation cluster members
CREATE TABLE IF NOT EXISTS citation_cluster_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_id UUID NOT NULL REFERENCES citation_clusters(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Member metrics
  centrality_score FLOAT, -- How central this document is in the cluster
  connection_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(cluster_id, document_id)
);

-- Document similarity matrix (for citation network)
CREATE TABLE IF NOT EXISTS document_similarities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id_1 UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  document_id_2 UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Similarity metrics
  citation_similarity FLOAT, -- Based on shared citations
  content_similarity FLOAT, -- Based on content
  topic_similarity FLOAT, -- Based on topics
  overall_similarity FLOAT, -- Combined score
  
  -- Shared elements
  shared_citations INTEGER DEFAULT 0,
  shared_authors TEXT[],
  shared_topics TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT doc_order CHECK (document_id_1 < document_id_2),
  UNIQUE(document_id_1, document_id_2)
);

-- Create indexes
CREATE INDEX idx_citations_source_document ON citations(source_document_id);
CREATE INDEX idx_citations_doi ON citations(doi);
CREATE INDEX idx_citation_relationships_citing ON citation_relationships(citing_document_id);
CREATE INDEX idx_citation_relationships_cited ON citation_relationships(cited_document_id);
CREATE INDEX idx_citation_clusters_user_id ON citation_clusters(user_id);
CREATE INDEX idx_citation_cluster_members_cluster ON citation_cluster_members(cluster_id);
CREATE INDEX idx_document_similarities_doc1 ON document_similarities(document_id_1);
CREATE INDEX idx_document_similarities_doc2 ON document_similarities(document_id_2);

-- Enable RLS
ALTER TABLE citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE citation_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE citation_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE citation_cluster_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_similarities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view citations in their documents" ON citations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = citations.source_document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view citation relationships for their documents" ON citation_relationships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id IN (citing_document_id, cited_document_id)
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own citation clusters" ON citation_clusters
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view cluster members for their clusters" ON citation_cluster_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM citation_clusters
      WHERE citation_clusters.id = citation_cluster_members.cluster_id
      AND citation_clusters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view similarities for their documents" ON document_similarities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id IN (document_id_1, document_id_2)
      AND documents.user_id = auth.uid()
    )
  );

-- Update triggers
CREATE TRIGGER update_citation_clusters_updated_at BEFORE UPDATE ON citation_clusters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- WORKFLOW AUTOMATION TABLES
-- =====================================================

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

-- =====================================================
-- SMART REPORTS AND ANALYTICS TABLES
-- =====================================================

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

-- Final permission grants for all new tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;