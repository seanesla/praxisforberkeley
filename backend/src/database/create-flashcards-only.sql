-- Drop the table if it exists with wrong schema
DROP TABLE IF EXISTS public.flashcards CASCADE;

-- Create Flashcards table with all columns
CREATE TABLE public.flashcards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    document_id UUID,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    difficulty INTEGER DEFAULT 2,
    ease_factor FLOAT DEFAULT 2.5,
    interval INTEGER DEFAULT 0,
    repetitions INTEGER DEFAULT 0,
    next_review_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints after table is created
ALTER TABLE public.flashcards 
    ADD CONSTRAINT flashcards_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.users(id) 
    ON DELETE CASCADE;

ALTER TABLE public.flashcards 
    ADD CONSTRAINT flashcards_document_id_fkey 
    FOREIGN KEY (document_id) 
    REFERENCES public.documents(id) 
    ON DELETE SET NULL;