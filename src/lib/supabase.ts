import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Only create the client if credentials are present — createClient throws on empty strings
export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as never;
