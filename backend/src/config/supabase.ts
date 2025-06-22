import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

// For testing, use default values if environment variables are not set
const supabaseUrl = process.env.SUPABASE_URL || 'https://cukhgpjkwjhcsmokepb.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1a2hncHlrand5aGNzbW9rZXBiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDIxMjU2OSwiZXhwIjoyMDY1Nzg4NTY5fQ.OTHux-57FTnxuk783RHQoUWLuPsSjDbE7hkiy29IGfw';

// Only validate if we're in production
if (process.env.NODE_ENV === 'production') {
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'] as const;
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}

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