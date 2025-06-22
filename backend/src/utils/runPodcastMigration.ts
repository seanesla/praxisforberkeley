import { supabase } from '../config/supabase';
import fs from 'fs/promises';
import path from 'path';
import logger from './logger';

async function runPodcastMigration() {
  try {
    logger.info('Running podcast table migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/015_create_podcast_tables.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');
    
    // Split by semicolons and filter out empty statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    // Execute each statement
    for (const statement of statements) {
      logger.info(`Executing: ${statement.substring(0, 50)}...`);
      
      const { error } = await supabase
        .from('_sql')
        .select('*')
        .eq('query', statement)
        .single();
      
      if (error) {
        // Use RPC to execute raw SQL
        const { error: rpcError } = await supabase.rpc('execute_sql', {
          query: statement
        });
        
        if (rpcError) {
          logger.error('Migration error:', rpcError);
          throw rpcError;
        }
      }
    }
    
    logger.info('Podcast migration completed successfully!');
  } catch (error) {
    logger.error('Failed to run podcast migration:', error);
    process.exit(1);
  }
}

// Alternative approach using Supabase dashboard
function printManualInstructions() {
  logger.info('\n=== Manual Migration Instructions ===');
  logger.info('1. Go to your Supabase dashboard');
  logger.info('2. Navigate to the SQL Editor');
  logger.info('3. Copy and paste the contents of:');
  logger.info('   backend/src/migrations/015_create_podcast_tables.sql');
  logger.info('4. Click "Run" to execute the migration');
  logger.info('=====================================\n');
}

// Run the migration
runPodcastMigration().catch(() => {
  printManualInstructions();
});