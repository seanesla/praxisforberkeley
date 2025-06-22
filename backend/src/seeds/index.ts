import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { seedUsers } from './01-users';
import { seedDocuments } from './02-documents';
import { seedStudyData } from './03-study-data';
import { seedKnowledgeGaps } from './04-knowledge-gaps';
import { seedExercises } from './05-exercises';
import { seedWorkflows } from './06-workflows';
import { seedAnalytics } from './07-analytics';
import { seedAdditionalFeatures } from './08-features';

// Load environment variables
config();

export interface SeedConfig {
  cleanFirst: boolean;
  modules: string[];
  verbose: boolean;
  isDemoMode?: boolean;
}

export interface SeedModule {
  name: string;
  run: (supabase: any, config: SeedConfig) => Promise<void>;
  cleanup?: (supabase: any) => Promise<void>;
}

const seedModules: SeedModule[] = [
  { name: 'users', run: seedUsers },
  { name: 'documents', run: seedDocuments },
  { name: 'study-data', run: seedStudyData },
  { name: 'knowledge-gaps', run: seedKnowledgeGaps },
  { name: 'exercises', run: seedExercises },
  { name: 'workflows', run: seedWorkflows },
  { name: 'analytics', run: seedAnalytics },
  { name: 'features', run: seedAdditionalFeatures },
];

async function runSeeds() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const config: SeedConfig = {
    cleanFirst: args.includes('--clean'),
    modules: [],
    verbose: args.includes('--verbose'),
    isDemoMode: args.includes('--demo'),
  };

  // Parse specific modules
  const modulesIndex = args.indexOf('--modules');
  if (modulesIndex !== -1 && args[modulesIndex + 1]) {
    config.modules = args[modulesIndex + 1].split(',');
  }

  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('🌱 Starting seed process...');
  
  if (config.cleanFirst) {
    console.log('🧹 Cleaning existing data...');
    // Clean in reverse order to handle foreign key constraints
    for (let i = seedModules.length - 1; i >= 0; i--) {
      const module = seedModules[i];
      if (module.cleanup) {
        try {
          await module.cleanup(supabase);
          console.log(`  ✓ Cleaned ${module.name}`);
        } catch (error) {
          console.error(`  ✗ Error cleaning ${module.name}:`, error);
        }
      }
    }
  }

  // Run selected modules or all modules
  const modulesToRun = config.modules.length > 0
    ? seedModules.filter(m => config.modules.includes(m.name))
    : seedModules;

  for (const module of modulesToRun) {
    try {
      console.log(`\n📦 Running ${module.name} seed...`);
      const startTime = Date.now();
      await module.run(supabase, config);
      const duration = Date.now() - startTime;
      console.log(`  ✓ Completed ${module.name} in ${duration}ms`);
    } catch (error) {
      console.error(`  ✗ Error in ${module.name}:`, error);
      // Continue with other modules even if one fails
    }
  }

  console.log('\n✅ Seed process completed!');
  
  if (config.isDemoMode) {
    console.log('\n🎯 Demo mode enabled:');
    console.log('  Email: demo@praxis.edu');
    console.log('  Password: demo123456');
    console.log('  API endpoint: http://localhost:5001');
  }
}

// Run the seeds
runSeeds().catch(console.error);