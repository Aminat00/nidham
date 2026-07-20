/**
 * Supabase client — the cloud (Postgres) backend, configured by env. If unset, the
 * app runs entirely local (AsyncStorage), so nothing breaks without a project.
 *
 *   EXPO_PUBLIC_SUPABASE_URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY
 *
 * Auth sessions persist via AsyncStorage. `detectSessionInUrl` is off (no web OAuth
 * redirect handling needed for the email flow).
 */

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Whether a real Supabase project is configured. */
export function isSupabaseConfigured(): boolean {
  return URL.trim().length > 0 && ANON.trim().length > 0;
}

/** The client, or null when unconfigured (callers fall back to local). */
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(URL, ANON, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
