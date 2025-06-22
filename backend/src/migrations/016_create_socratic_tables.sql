-- Create Socratic dialogue sessions table
CREATE TABLE IF NOT EXISTS socratic_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  topic VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  summary TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Socratic questions table
CREATE TABLE IF NOT EXISTS socratic_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES socratic_sessions(id) ON DELETE CASCADE,
  question JSONB NOT NULL, -- Stores complete question object
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Socratic responses table
CREATE TABLE IF NOT EXISTS socratic_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES socratic_sessions(id) ON DELETE CASCADE,
  question_id VARCHAR(255) NOT NULL, -- Question ID from the question object
  answer TEXT NOT NULL,
  evaluation JSONB, -- Stores AI evaluation results
  correct BOOLEAN,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_socratic_sessions_user_id ON socratic_sessions(user_id);
CREATE INDEX idx_socratic_sessions_status ON socratic_sessions(status);
CREATE INDEX idx_socratic_sessions_topic ON socratic_sessions(topic);
CREATE INDEX idx_socratic_questions_session_id ON socratic_questions(session_id);
CREATE INDEX idx_socratic_responses_session_id ON socratic_responses(session_id);

-- Create function for Socratic analytics
CREATE OR REPLACE FUNCTION get_socratic_analytics(p_user_id UUID)
RETURNS TABLE (
  total_sessions BIGINT,
  completed_sessions BIGINT,
  average_accuracy FLOAT,
  topics_explored JSONB,
  concepts_mastered BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH session_stats AS (
    SELECT 
      s.id,
      s.topic,
      s.status,
      s.metadata->>'accuracy' as accuracy,
      s.metadata->'concepts' as concepts
    FROM socratic_sessions s
    WHERE s.user_id = p_user_id
  )
  SELECT 
    COUNT(*)::BIGINT as total_sessions,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_sessions,
    AVG((accuracy)::FLOAT) FILTER (WHERE accuracy IS NOT NULL) as average_accuracy,
    jsonb_agg(DISTINCT jsonb_build_object('topic', topic)) as topics_explored,
    COUNT(DISTINCT jsonb_array_elements_text(concepts))::BIGINT as concepts_mastered
  FROM session_stats;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies
ALTER TABLE socratic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE socratic_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE socratic_responses ENABLE ROW LEVEL SECURITY;

-- Socratic sessions policies
CREATE POLICY "Users can view own Socratic sessions" ON socratic_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own Socratic sessions" ON socratic_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Socratic sessions" ON socratic_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Socratic questions policies
CREATE POLICY "Users can view questions for their sessions" ON socratic_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM socratic_sessions s
      WHERE s.id = socratic_questions.session_id
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "System can create questions" ON socratic_questions
  FOR INSERT WITH CHECK (true);

-- Socratic responses policies
CREATE POLICY "Users can view their responses" ON socratic_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM socratic_sessions s
      WHERE s.id = socratic_responses.session_id
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create responses for their sessions" ON socratic_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM socratic_sessions s
      WHERE s.id = socratic_responses.session_id
      AND s.user_id = auth.uid()
    )
  );

-- Add trigger to update updated_at
CREATE TRIGGER update_socratic_sessions_updated_at
  BEFORE UPDATE ON socratic_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();