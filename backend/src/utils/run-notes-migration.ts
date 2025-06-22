import { supabase } from '../config/supabase';
import logger from '../utils/logger';

async function runNotesMigration() {
  try {
    logger.info('Starting notes table migration...');

    // Add missing columns to notes table
    const migrationSQL = `
      -- Add missing columns to notes table if they don't exist
      ALTER TABLE notes 
        ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS document_ids UUID[] DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS is_smart_note BOOLEAN DEFAULT false;

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes USING GIN(tags);
      CREATE INDEX IF NOT EXISTS idx_notes_document_ids ON notes USING GIN(document_ids);
      CREATE INDEX IF NOT EXISTS idx_notes_is_smart_note ON notes(is_smart_note) WHERE is_smart_note = TRUE;

      -- Add comments for documentation
      COMMENT ON COLUMN notes.tags IS 'Array of tags associated with this note';
      COMMENT ON COLUMN notes.document_ids IS 'Array of document IDs linked to this note';
      COMMENT ON COLUMN notes.is_smart_note IS 'Whether this note was created with AI assistance';
    `;

    const { error } = await supabase.rpc('execute_sql', {
      query: migrationSQL
    });

    if (error) {
      // If RPC doesn't exist, try direct approach
      logger.warn('RPC approach failed, trying direct SQL execution...');
      
      // Execute migrations one by one
      const alterTableResult = await supabase.from('notes').select('id').limit(1);
      
      if (alterTableResult.error?.message?.includes('column "tags" does not exist')) {
        logger.info('Columns are missing, migration is needed');
        logger.error('Cannot execute direct SQL. Please run the following SQL in Supabase dashboard:');
        console.log(migrationSQL);
        return;
      } else {
        logger.info('Columns already exist, migration may not be needed');
      }
    } else {
      logger.info('Migration completed successfully!');
    }

    // Test the schema
    const { error: testError } = await supabase
      .from('notes')
      .select('id, tags, document_ids, is_smart_note')
      .limit(1);

    if (testError) {
      logger.error('Schema test failed:', testError);
      logger.info('\nPlease run this SQL in your Supabase SQL editor:\n');
      console.log(migrationSQL);
    } else {
      logger.info('Schema test passed! Notes table has all required columns.');
    }

  } catch (error) {
    logger.error('Migration error:', error);
    logger.info('\nPlease run this SQL in your Supabase SQL editor:\n');
    console.log(`
      -- Add missing columns to notes table if they don't exist
      ALTER TABLE notes 
        ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS document_ids UUID[] DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS is_smart_note BOOLEAN DEFAULT false;

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes USING GIN(tags);
      CREATE INDEX IF NOT EXISTS idx_notes_document_ids ON notes USING GIN(document_ids);
      CREATE INDEX IF NOT EXISTS idx_notes_is_smart_note ON notes(is_smart_note) WHERE is_smart_note = TRUE;
    `);
  }
}

// Run the migration
runNotesMigration()
  .then(() => {
    logger.info('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Migration script failed:', error);
    process.exit(1);
  });