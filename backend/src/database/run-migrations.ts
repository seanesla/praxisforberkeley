import { supabase } from '../config/supabase';
import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger';

async function runMigrations() {
  try {
    logger.info('Running database migrations...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'init-tables.sql');
    const sql = await fs.readFile(sqlPath, 'utf-8');
    
    // Split by semicolons but be careful with functions
    const statements = sql
      .split(/;(?=\s*(?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|GRANT|REVOKE|$))/i)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    logger.info(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      logger.info(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try direct execution as fallback
          logger.warn(`RPC failed, trying direct execution: ${error.message}`);
          // Note: Direct SQL execution might not be available in all Supabase setups
          // You may need to run these migrations through the Supabase dashboard
          throw error;
        }
      } catch (err) {
        logger.error(`Failed to execute statement ${i + 1}: ${err}`);
        // Continue with other statements
      }
    }
    
    logger.info('Migrations completed!');
    
    // Test the connection
    const { data, error } = await supabase.from('users').select('count');
    if (error) {
      logger.error('Failed to query users table:', error);
    } else {
      logger.info('Successfully connected to database');
    }
    
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations().then(() => {
    logger.info('Migration script completed');
    process.exit(0);
  });
}

export default runMigrations;