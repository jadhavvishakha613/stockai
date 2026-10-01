// Supabase client configuration.
// Credentials are loaded exclusively from environment variables.
// Copy .env.example to .env and fill in your project's URL and anon key.
// Get these values from: https://supabase.com/dashboard → Project Settings → API
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string)?.trim();
const SUPABASE_PUBLISHABLE_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string)?.trim();

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error(
    '[StockAI] Missing Supabase credentials.\n' +
    'Copy .env.example to .env and set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.\n' +
    'Get these from: https://supabase.com/dashboard → your project → Settings → API'
  );
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(
  SUPABASE_URL  || 'https://placeholder.supabase.co',
  SUPABASE_PUBLISHABLE_KEY || 'placeholder-key'
);
