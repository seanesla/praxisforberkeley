import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('Running notes schema migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/018_update_notes_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolons and filter out empty statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    // Execute each statement
    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      
      const { error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      });
      
      if (error) {
        console.error('Error executing statement:', error);
        throw error;
      }
    }
    
    console.log('Migration completed successfully!');
    
    // Verify the changes
    const { data: tableInfo, error: verifyError } = await supabase
      .rpc('get_table_columns', { table_name: 'notes' });
    
    if (!verifyError && tableInfo) {
      console.log('\nNotes table columns after migration:');
      tableInfo.forEach((col: any) => {
        console.log(`- ${col.column_name}: ${col.data_type}`);
      });
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();