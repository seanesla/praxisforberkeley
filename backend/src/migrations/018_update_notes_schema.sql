-- Migration: Update notes table to support multiple documents and smart notes
-- Date: 2024-01-22

-- First, drop the foreign key constraint on document_id
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_document_id_fkey;

-- Drop the old index
DROP INDEX IF EXISTS idx_notes_document_id;

-- Add new columns
ALTER TABLE notes 
  ADD COLUMN IF NOT EXISTS document_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_smart_note BOOLEAN DEFAULT FALSE;

-- Migrate existing document_id data to document_ids array
UPDATE notes 
SET document_ids = ARRAY[document_id]::UUID[] 
WHERE document_id IS NOT NULL;

-- Drop the old document_id column
ALTER TABLE notes DROP COLUMN IF EXISTS document_id;

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_notes_document_ids ON notes USING GIN(document_ids);
CREATE INDEX IF NOT EXISTS idx_notes_is_smart_note ON notes(is_smart_note) WHERE is_smart_note = TRUE;

-- Update RLS policies if needed
-- The existing policies should continue to work since they're based on user_id

-- Add comment for documentation
COMMENT ON COLUMN notes.document_ids IS 'Array of document IDs linked to this note';
COMMENT ON COLUMN notes.is_smart_note IS 'Whether this note was created with AI assistance';