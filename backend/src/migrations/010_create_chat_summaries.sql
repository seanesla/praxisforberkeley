-- Create chat_summaries table for storing conversation summaries
CREATE TABLE IF NOT EXISTS chat_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  message_count INTEGER NOT NULL, -- Number of messages summarized
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(chat_id)
);

-- Create index for chat_id lookups
CREATE INDEX idx_chat_summaries_chat_id ON chat_summaries(chat_id);

-- Enable RLS
ALTER TABLE chat_summaries ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - summaries inherit chat permissions
CREATE POLICY "Users can view their chat summaries" ON chat_summaries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_summaries.chat_id
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create summaries for their chats" ON chat_summaries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_summaries.chat_id
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update summaries for their chats" ON chat_summaries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_summaries.chat_id
      AND chats.user_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_chat_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_summaries_updated_at
  BEFORE UPDATE ON chat_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_summaries_updated_at();