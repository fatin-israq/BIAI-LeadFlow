import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isValidUrl = Boolean(
  supabaseUrl &&
  typeof supabaseUrl === 'string' &&
  (supabaseUrl.startsWith('https://') || supabaseUrl.startsWith('http://'))
);

if (supabaseUrl && !isValidUrl) {
  console.error(
    '⚠️ Invalid VITE_SUPABASE_URL: It must start with https:// (e.g. https://your-project.supabase.co). Found key instead of project URL.'
  );
}

export const supabase: SupabaseClient | null =
  typeof supabaseUrl === 'string' && isValidUrl && typeof supabaseAnonKey === 'string'
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;

export const isSupabaseConfigured = Boolean(isValidUrl && supabaseAnonKey);


