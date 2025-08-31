import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://jamgmyljyydryxaonbgk.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphbWdteWxqeXlkcnl4YW9uYmdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxMzUwNTIsImV4cCI6MjA1NzcxMTA1Mn0.N3v4C2PtSuW_VZ9ngyyjEMC06brPchLL4r8bsMjwXic';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);