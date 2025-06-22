import { supabase } from '../config/supabase';
import logger from './logger';

/**
 * Instructions to manually create podcast tables in Supabase:
 * 
 * 1. Go to your Supabase dashboard
 * 2. Navigate to the SQL Editor
 * 3. Copy and run the following SQL:
 */

const podcastTableSQL = `
-- Create podcast sessions table if not exists
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

-- Create podcast transcripts table if not exists
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
CREATE INDEX IF NOT EXISTS idx_podcast_sessions_user_id ON podcast_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_podcast_sessions_status ON podcast_sessions(status);
CREATE INDEX IF NOT EXISTS idx_podcast_transcripts_session_id ON podcast_transcripts(session_id);

-- Enable RLS
ALTER TABLE podcast_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_transcripts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own podcast sessions" ON podcast_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own podcast sessions" ON podcast_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own podcast sessions" ON podcast_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transcripts" ON podcast_transcripts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own transcripts" ON podcast_transcripts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create update trigger
CREATE TRIGGER update_podcast_sessions_updated_at BEFORE UPDATE ON podcast_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON podcast_sessions TO postgres, anon, authenticated, service_role;
GRANT ALL ON podcast_transcripts TO postgres, anon, authenticated, service_role;
`;

async function checkPodcastTables() {
  try {
    logger.info('Checking if podcast tables exist...');
    
    // Try to query the podcast_sessions table
    const { error } = await supabase
      .from('podcast_sessions')
      .select('id')
      .limit(1);
    
    if (error) {
      logger.error('Podcast tables not found:', error);
      logger.info('\n=== MANUAL SETUP REQUIRED ===');
      logger.info('Please run the following SQL in your Supabase dashboard:');
      logger.info('-----------------------------');
      console.log(podcastTableSQL);
      logger.info('-----------------------------');
      logger.info('After creating tables, restart the backend server.');
      return false;
    }
    
    logger.info('Podcast tables exist and are accessible!');
    return true;
  } catch (error) {
    logger.error('Error checking podcast tables:', error);
    return false;
  }
}

// Run the check
checkPodcastTables().then(exists => {
  if (!exists) {
    process.exit(1);
  }
});

export { checkPodcastTables, podcastTableSQL };