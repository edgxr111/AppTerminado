import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cfjymjyeaobrglvybrwn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmanltanllYW9icmdsdnlicnduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MjczOTksImV4cCI6MjA1ODUwMzM5OX0.DiRv-MGLA9HCeFpafdG1vvIoPx7GA9T4cbdXinZ-32M';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
