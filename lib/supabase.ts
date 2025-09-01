import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Some features may not work.');
  // Create a dummy client to prevent crashes
  export const supabase = createClient('https://dummy.supabase.co', 'dummy-key');
} else {
  export const supabase = createClient(supabaseUrl, supabaseAnonKey);
}