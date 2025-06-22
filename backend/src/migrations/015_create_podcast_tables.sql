-- Create podcast sessions table
CREATE TABLE IF NOT EXISTS podcast_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- in milliseconds
  summary TEXT,
  current_command VARCHAR(50),
  command_parameters JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create podcast transcripts table
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

-- Create indexes
CREATE INDEX idx_podcast_sessions_user_id ON podcast_sessions(user_id);
CREATE INDEX idx_podcast_sessions_status ON podcast_sessions(status);
CREATE INDEX idx_podcast_sessions_started_at ON podcast_sessions(started_at DESC);
CREATE INDEX idx_podcast_transcripts_session_id ON podcast_transcripts(session_id);
CREATE INDEX idx_podcast_transcripts_timestamp ON podcast_transcripts(timestamp);

-- Create function for podcast analytics
CREATE OR REPLACE FUNCTION get_podcast_analytics(p_user_id UUID)
RETURNS TABLE (
  total_sessions BIGINT,
  total_duration BIGINT,
  average_duration FLOAT,
  topics JSONB,
  last_session TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_sessions,
    COALESCE(SUM(duration), 0)::BIGINT as total_duration,
    COALESCE(AVG(duration), 0)::FLOAT as average_duration,
    COALESCE(
      jsonb_agg(DISTINCT 
        jsonb_build_object(
          'document_id', document_id,
          'session_count', 1
        )
      ) FILTER (WHERE document_id IS NOT NULL), 
      '[]'::jsonb
    ) as topics,
    MAX(started_at) as last_session
  FROM podcast_sessions
  WHERE user_id = p_user_id
    AND status = 'completed';
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies
ALTER TABLE podcast_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_transcripts ENABLE ROW LEVEL SECURITY;

-- Podcast sessions policies
CREATE POLICY "Users can view own podcast sessions" ON podcast_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own podcast sessions" ON podcast_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own podcast sessions" ON podcast_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own podcast sessions" ON podcast_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Podcast transcripts policies
CREATE POLICY "Users can view own transcripts" ON podcast_transcripts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transcripts" ON podcast_transcripts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add trigger to update updated_at
CREATE TRIGGER update_podcast_sessions_updated_at
  BEFORE UPDATE ON podcast_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();