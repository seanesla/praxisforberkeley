-- Create flashcards and study tracking tables
-- This migration creates the core tables for the spaced repetition flashcard system

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Flashcards table
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'basic' CHECK (type IN ('basic', 'cloze', 'image', 'multi')),
  metadata JSONB DEFAULT '{}',
  auto_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Study progress table (tracks spaced repetition data per flashcard per user)
CREATE TABLE IF NOT EXISTS study_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  repetitions INTEGER DEFAULT 0,
  ease_factor FLOAT DEFAULT 2.5 CHECK (ease_factor >= 1.3 AND ease_factor <= 2.5),
  interval INTEGER DEFAULT 1, -- days until next review
  next_review TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_review TIMESTAMP WITH TIME ZONE,
  performance_history JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, flashcard_id)
);

-- Study sessions table (tracks study session performance)
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_ids UUID[] NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  performance JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_document_id ON flashcards(document_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_created_at ON flashcards(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flashcards_type ON flashcards(type);

CREATE INDEX IF NOT EXISTS idx_study_progress_user_id ON study_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_study_progress_flashcard_id ON study_progress(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_study_progress_next_review ON study_progress(next_review);
CREATE INDEX IF NOT EXISTS idx_study_progress_user_next_review ON study_progress(user_id, next_review);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_started_at ON study_sessions(started_at DESC);

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_flashcards_metadata_gin ON flashcards USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_study_progress_performance_gin ON study_progress USING GIN (performance_history);
CREATE INDEX IF NOT EXISTS idx_study_sessions_performance_gin ON study_sessions USING GIN (performance);

-- Full-text search index on flashcard content
CREATE INDEX IF NOT EXISTS idx_flashcards_question_fts ON flashcards USING GIN(to_tsvector('english', question));
CREATE INDEX IF NOT EXISTS idx_flashcards_answer_fts ON flashcards USING GIN(to_tsvector('english', answer));

-- Enable Row Level Security
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for flashcards
CREATE POLICY "Users can CRUD their own flashcards" ON flashcards
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for study_progress
CREATE POLICY "Users can CRUD their own study progress" ON study_progress
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for study_sessions
CREATE POLICY "Users can CRUD their own study sessions" ON study_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON flashcards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_progress_updated_at BEFORE UPDATE ON study_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE flashcards IS 'Stores flashcards for spaced repetition learning';
COMMENT ON TABLE study_progress IS 'Tracks individual progress for each flashcard using SM-2 algorithm';
COMMENT ON TABLE study_sessions IS 'Records study session data and performance metrics';

COMMENT ON COLUMN flashcards.type IS 'Type of flashcard: basic (Q&A), cloze (fill-in-blank), image, or multi (multiple choice)';
COMMENT ON COLUMN flashcards.metadata IS 'Additional data like difficulty, tags, source, image URLs, choices for multi type';
COMMENT ON COLUMN study_progress.ease_factor IS 'SM-2 algorithm ease factor (1.3-2.5), lower = harder';
COMMENT ON COLUMN study_progress.interval IS 'Days until next review based on SM-2 algorithm';
COMMENT ON COLUMN study_progress.performance_history IS 'Array of {date, quality (0-5), time_spent} objects';
COMMENT ON COLUMN study_sessions.performance IS 'Session metrics: totalCards, correctAnswers, averageTime, difficultyBreakdown';