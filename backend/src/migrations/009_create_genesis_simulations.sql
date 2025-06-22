-- Create genesis_simulations table
CREATE TABLE IF NOT EXISTS genesis_simulations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  domain VARCHAR(50) NOT NULL CHECK (domain IN ('physics', 'chemistry', 'mathematics', 'biology')),
  prompt TEXT NOT NULL,
  scene_graph JSONB NOT NULL,
  state JSONB NOT NULL,
  interactions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_genesis_simulations_user_id ON genesis_simulations(user_id);
CREATE INDEX idx_genesis_simulations_domain ON genesis_simulations(domain);
CREATE INDEX idx_genesis_simulations_created_at ON genesis_simulations(created_at DESC);

-- Enable RLS
ALTER TABLE genesis_simulations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own simulations" ON genesis_simulations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own simulations" ON genesis_simulations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own simulations" ON genesis_simulations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own simulations" ON genesis_simulations
  FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_genesis_simulations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_genesis_simulations_updated_at
  BEFORE UPDATE ON genesis_simulations
  FOR EACH ROW
  EXECUTE FUNCTION update_genesis_simulations_updated_at();