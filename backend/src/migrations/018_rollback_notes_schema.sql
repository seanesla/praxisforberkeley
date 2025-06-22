-- Rollback migration: Revert notes table to single document_id
-- Date: 2024-01-22

-- Add back the document_id column
ALTER TABLE notes 
  ADD COLUMN IF NOT EXISTS document_id UUID;

-- Migrate the first document from array back to single column
UPDATE notes 
SET document_id = document_ids[1]
WHERE array_length(document_ids, 1) > 0;

-- Drop the new columns
ALTER TABLE notes 
  DROP COLUMN IF EXISTS document_ids,
  DROP COLUMN IF EXISTS is_smart_note;

-- Recreate the foreign key constraint
ALTER TABLE notes 
  ADD CONSTRAINT notes_document_id_fkey 
  FOREIGN KEY (document_id) 
  REFERENCES documents(id) 
  ON DELETE CASCADE;

-- Recreate the old index
CREATE INDEX IF NOT EXISTS idx_notes_document_id ON notes(document_id);

-- Remove the new indexes
DROP INDEX IF EXISTS idx_notes_document_ids;
DROP INDEX IF EXISTS idx_notes_is_smart_note;