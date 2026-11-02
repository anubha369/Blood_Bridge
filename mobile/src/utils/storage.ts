import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'bloodbridge_token';
const USER_KEY = 'bloodbridge_user';

// In-memory fallback if platform does not support SecureStore (e.g., standard web preview)
const memoryStorage: Record<string, string> = {};

export const storage = {
  async setToken(token: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        memoryStorage[TOKEN_KEY] = token;
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(TOKEN_KEY, token);
        }
      } else {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      }
    } catch (e) {
      memoryStorage[TOKEN_KEY] = token;
    }
  },

  async getToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(TOKEN_KEY) || memoryStorage[TOKEN_KEY] || null;
        }
        return memoryStorage[TOKEN_KEY] || null;
      }
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (e) {
      return memoryStorage[TOKEN_KEY] || null;
    }
  },

  async removeToken(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        delete memoryStorage[TOKEN_KEY];
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(TOKEN_KEY);
        }
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch (e) {
      delete memoryStorage[TOKEN_KEY];
    }
  },

  async setUser(user: any): Promise<void> {
    const raw = JSON.stringify(user);
    try {
      if (Platform.OS === 'web') {
        memoryStorage[USER_KEY] = raw;
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(USER_KEY, raw);
        }
      } else {
        await SecureStore.setItemAsync(USER_KEY, raw);
      }
    } catch (e) {
      memoryStorage[USER_KEY] = raw;
    }
  },

  async getUser(): Promise<any | null> {
    try {
      let raw: string | null = null;
      if (Platform.OS === 'web') {
        raw = (typeof window !== 'undefined' && window.localStorage?.getItem(USER_KEY)) || memoryStorage[USER_KEY] || null;
      } else {
        raw = await SecureStore.getItemAsync(USER_KEY);
      }
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return memoryStorage[USER_KEY] ? JSON.parse(memoryStorage[USER_KEY]) : null;
    }
  },

  async removeUser(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        delete memoryStorage[USER_KEY];
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(USER_KEY);
        }
      } else {
        await SecureStore.deleteItemAsync(USER_KEY);
      }
    } catch (e) {
      delete memoryStorage[USER_KEY];
    }
  },

  async clearAll(): Promise<void> {
    await this.removeToken();
    await this.removeUser();
  }
};

