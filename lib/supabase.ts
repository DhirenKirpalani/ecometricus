
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rqhlhazvplpajzwwoncz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxaGxoYXp2cGxwYWp6d3dvbmN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MjE2NzAsImV4cCI6MjA4MjE5NzY3MH0.icubRfN-oJIA93CWY9gSgU1Qdx7cXguNbI85Gvjw9ZI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,       // Keep session across page reloads
    detectSessionInUrl: true,   // Pick up token from email confirmation link
  }
});
