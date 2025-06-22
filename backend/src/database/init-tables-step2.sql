-- Step 2: Create indexes after tables exist
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_document_id ON public.notes(document_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON public.flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON public.flashcards(user_id, next_review_date);
CREATE INDEX IF NOT EXISTS idx_mindmaps_user_id ON public.mindmaps(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_id ON public.activity_feed(user_id, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mindmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Documents policies
CREATE POLICY "Users can view own documents" ON public.documents
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own documents" ON public.documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON public.documents
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON public.documents
    FOR DELETE USING (auth.uid() = user_id);

-- Notes policies
CREATE POLICY "Users can view own notes" ON public.notes
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own notes" ON public.notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.notes
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.notes
    FOR DELETE USING (auth.uid() = user_id);

-- Flashcards policies
CREATE POLICY "Users can view own flashcards" ON public.flashcards
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own flashcards" ON public.flashcards
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own flashcards" ON public.flashcards
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own flashcards" ON public.flashcards
    FOR DELETE USING (auth.uid() = user_id);

-- Mind maps policies
CREATE POLICY "Users can view own mindmaps" ON public.mindmaps
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own mindmaps" ON public.mindmaps
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mindmaps" ON public.mindmaps
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own mindmaps" ON public.mindmaps
    FOR DELETE USING (auth.uid() = user_id);

-- Activity feed policies
CREATE POLICY "Users can view own activity" ON public.activity_feed
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own activity" ON public.activity_feed
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Search queries policies
CREATE POLICY "Users can view own searches" ON public.search_queries
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own searches" ON public.search_queries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- API keys policies
CREATE POLICY "Users can view own API keys" ON public.api_keys
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own API keys" ON public.api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own API keys" ON public.api_keys
    FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON public.flashcards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mindmaps_updated_at BEFORE UPDATE ON public.mindmaps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();