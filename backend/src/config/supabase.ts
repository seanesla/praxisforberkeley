import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'] as const;

// Validate required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

// Create Supabase client with service key for backend operations
export const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'x-application-name': 'praxis-backend'
      }
    }
  }
);

// Health check function for Supabase connection
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('users').select('count').limit(1);
    return !error;
  } catch {
    return false;
  }
}

// Export config for use in other modules
export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: process.env.SUPABASE_ANON_KEY || '',
};