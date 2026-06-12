import { createClient } from '@supabase/supabase-js';

// Browser Supabase client for Game Master auth (Spec migration).
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const url = config.public.supabaseUrl as string;
  const anon = config.public.supabaseAnonKey as string;
  const supabase = createClient(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return { provide: { supabase } };
});
