import { supabase } from '../config/supabase';
import fs from 'fs';
import path from 'path';
import logger from './logger';

async function runMigration(sql: string, name: string) {
  try {
    logger.info(`Running migration: ${name}`);
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      const { error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      });
      
      if (error) {
        logger.error(`Error in migration ${name}:`, error);
        throw error;
      }
    }
    
    logger.info(`Migration ${name} completed successfully`);
  } catch (error) {
    logger.error(`Failed to run migration ${name}:`, error);
    throw error;
  }
}

async function setupDatabase() {
  try {
    logger.info('Starting database setup...');
    
    // Check connection
    const { error: connectionError } = await supabase.from('users').select('count').limit(1);
    if (connectionError && connectionError.message.includes('does not exist')) {
      logger.info('Users table does not exist, running migrations...');
      
      // Run auth tables migration
      const authMigrationPath = path.join(__dirname, '../migrations/001_auth_tables.sql');
      if (fs.existsSync(authMigrationPath)) {
        const authSql = fs.readFileSync(authMigrationPath, 'utf-8');
        await runMigration(authSql, '001_auth_tables');
      } else {
        logger.warn('Auth migration file not found');
      }
    } else if (connectionError) {
      logger.error('Database connection error:', connectionError);
      throw connectionError;
    } else {
      logger.info('Database tables already exist');
    }
    
    logger.info('Database setup completed successfully');
  } catch (error) {
    logger.error('Database setup failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  setupDatabase();
}

export default setupDatabase;