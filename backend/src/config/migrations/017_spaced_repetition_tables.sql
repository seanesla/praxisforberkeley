-- Spaced Repetition System Tables

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