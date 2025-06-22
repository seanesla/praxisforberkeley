# Notes Table Migration Guide

## Overview
This migration updates the `notes` table to support:
1. Multiple linked documents (array of document IDs)
2. Smart note flag to identify AI-assisted notes

## Steps to Apply Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `018_update_notes_schema.sql`
4. Paste and run the migration
5. Verify the changes in the Table Editor

### Option 2: Using Supabase CLI

```bash
# Make sure you're in the backend directory
cd backend

# Login to Supabase (if not already)
npx supabase login

# Link to your project
npx supabase link --project-ref <your-project-ref>

# Run the migration
npx supabase db push
```

### Option 3: Manual SQL Execution

If the above options don't work, execute these statements one by one in the SQL editor:

```sql
-- 1. Drop the foreign key constraint
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_document_id_fkey;

-- 2. Drop the old index
DROP INDEX IF EXISTS idx_notes_document_id;

-- 3. Add new columns
ALTER TABLE notes 
  ADD COLUMN document_ids UUID[] DEFAULT '{}',
  ADD COLUMN is_smart_note BOOLEAN DEFAULT FALSE;

-- 4. Migrate existing data
UPDATE notes 
SET document_ids = ARRAY[document_id]::UUID[] 
WHERE document_id IS NOT NULL;

-- 5. Drop the old column
ALTER TABLE notes DROP COLUMN document_id;

-- 6. Create new indexes
CREATE INDEX idx_notes_document_ids ON notes USING GIN(document_ids);
CREATE INDEX idx_notes_is_smart_note ON notes(is_smart_note) WHERE is_smart_note = TRUE;
```

## Verification

After running the migration, verify that:
1. The `document_id` column has been removed
2. The `document_ids` column exists and is of type `UUID[]`
3. The `is_smart_note` column exists and is of type `BOOLEAN`
4. Any existing notes have their document references preserved in the array

## Rollback (if needed)

To rollback this migration, use the rollback script in `018_rollback_notes_schema.sql`