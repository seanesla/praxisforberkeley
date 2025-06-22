import { supabase } from '../config/supabase';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  console.log('Running api_keys migration...');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/013_create_api_keys_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Execute the migration using Supabase admin client
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      console.error('Migration failed:', error);
      
      // If RPC doesn't exist, try direct table creation
      console.log('Attempting direct table creation...');
      
      // Create api_keys table directly
      const { error: createError } = await supabase
        .from('api_keys')
        .select('id')
        .limit(1);
      
      if (createError && createError.code === '42P01') {
        console.log('Table does not exist. Please run the migration SQL directly in Supabase dashboard.');
        console.log('\nSQL file location:', migrationPath);
      }
    } else {
      console.log('✅ Migration completed successfully!');
    }
  } catch (error) {
    console.error('Error running migration:', error);
  }
}

// Run the migration
runMigration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));