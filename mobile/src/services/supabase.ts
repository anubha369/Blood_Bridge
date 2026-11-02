import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../constants/config';
import { storage } from '../utils/storage';

/**
 * Mobile Supabase Client configured exclusively with ANON key
 * Uses custom storage adapter with Expo SecureStore
 */
const customStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    return await storage.getToken();
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await storage.setToken(value);
  },
  removeItem: async (key: string): Promise<void> => {
    await storage.removeToken();
  }
};

export const supabase =
  CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY
    ? createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
        auth: {
          storage: customStorageAdapter,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false
        }
      })
    : null;

