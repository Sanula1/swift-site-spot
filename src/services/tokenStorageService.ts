/**
 * Platform-Aware Token Storage Service
 * 
 * Handles authentication token storage differently based on platform:
 * 
 * WEB:
 * - Access token: localStorage (short-lived, for API calls)
 * - Refresh token: HTTP-only cookie (secure, server-managed)
 * - Enables SSO across browser tabs
 * 
 * MOBILE (Capacitor):
 * - All tokens: Capacitor Preferences (native secure storage)
 * - Device-specific storage (encrypted on Android/iOS)
 * - Refresh token stored locally (no cookie support in WebView)
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

// ============= PLATFORM DETECTION =============

export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const getPlatform = (): 'web' | 'android' | 'ios' => {
  if (!Capacitor.isNativePlatform()) return 'web';
  const platform = Capacitor.getPlatform();
  return platform === 'ios' ? 'ios' : 'android';
};

// ============= STORAGE KEYS =============

const KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token', // Only used on mobile
  USER_DATA: 'user_data',
  DEVICE_ID: 'device_id',
  TOKEN_EXPIRY: 'token_expiry',
} as const;

// ============= IN-MEMORY CACHE =============

let tokenCache: {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null; // Timestamp when token expires
} | null = null;

// ============= TOKEN STORAGE SERVICE =============

export const tokenStorageService = {
  // ============= ACCESS TOKEN =============
  
  /**
   * Store access token
   * - Web: localStorage
   * - Mobile: Capacitor Preferences
   * - Memory: Cached for fast access
   */
  async setAccessToken(token: string): Promise<void> {
    // Update memory cache immediately (expiry will be set by setTokenExpiry)
    if (!tokenCache) tokenCache = { accessToken: null, refreshToken: null, expiresAt: null };
    tokenCache.accessToken = token;
    
    if (isNativePlatform()) {
      await Preferences.set({ key: KEYS.ACCESS_TOKEN, value: token });
      console.log('📱 Access token stored in native storage + memory cache');
    } else {
      localStorage.setItem(KEYS.ACCESS_TOKEN, token);
      console.log('🌐 Access token stored in localStorage + memory cache');
    }
  },

  /**
   * Get access token (cached in memory for performance)
   * Cache is invalidated when token expires
   */
  async getAccessToken(): Promise<string | null> {
    // Check if cache is valid and not expired
    if (tokenCache?.accessToken !== undefined && tokenCache.expiresAt !== null) {
      const now = Date.now();
      if (now < tokenCache.expiresAt) {
        // Cache hit - token is valid and not expired
        return tokenCache.accessToken;
      } else {
        // Token expired - clear cache and re-read from storage
        console.log('⏰ Cached token expired, re-reading from storage...');
        tokenCache.accessToken = undefined;
      }
    }
    
    // Cache miss or expired - read from storage
    let token: string | null = null;
    if (isNativePlatform()) {
      const result = await Preferences.get({ key: KEYS.ACCESS_TOKEN });
      token = result.value;
    } else {
      token = localStorage.getItem(KEYS.ACCESS_TOKEN);
    }
    
    // Update cache with new token
    if (!tokenCache) tokenCache = { accessToken: null, refreshToken: null, expiresAt: null };
    tokenCache.accessToken = token;
    
    // Also load expiry if not cached
    if (tokenCache.expiresAt === null) {
      tokenCache.expiresAt = await this.getTokenExpiry();
    }
    
    return token;
  },

  /**
   * Remove access token
   */
  async removeAccessToken(): Promise<void> {
    // Clear memory cache
    if (tokenCache) tokenCache.accessToken = null;
    
    if (isNativePlatform()) {
      await Preferences.remove({ key: KEYS.ACCESS_TOKEN });
    } else {
      localStorage.removeItem(KEYS.ACCESS_TOKEN);
    }
  },

  // ============= REFRESH TOKEN (Mobile Only) =============
  
  /**
   * Store refresh token
   * - Web: Handled by HTTP-only cookie (server-side)
   * - Mobile: Capacitor Preferences (native secure storage)
   * - Memory: Cached for fast access
   */
  async setRefreshToken(token: string): Promise<void> {
    if (isNativePlatform()) {
      // Update memory cache
      if (!tokenCache) tokenCache = { accessToken: null, refreshToken: null, expiresAt: null };
      tokenCache.refreshToken = token;
      
      await Preferences.set({ key: KEYS.REFRESH_TOKEN, value: token });
      console.log('📱 Refresh token stored in native secure storage + memory cache');
    } else {
      // On web, refresh token is stored in HTTP-only cookie by server
      console.log('🌐 Refresh token handled by HTTP-only cookie (server)');
    }
  },

  /**
   * Get refresh token (mobile only, cached in memory)
   */
  async getRefreshToken(): Promise<string | null> {
    if (isNativePlatform()) {
      // Return from cache if available
      if (tokenCache?.refreshToken !== undefined) {
        return tokenCache.refreshToken;
      }
      
      // First time - read from storage and cache it
      const result = await Preferences.get({ key: KEYS.REFRESH_TOKEN });
      const token = result.value;
      
      // Cache for future calls
      if (!tokenCache) tokenCache = { accessToken: null, refreshToken: null, expiresAt: null };
      tokenCache.refreshToken = token;
      
      return token;
    }
    // On web, refresh token is in HTTP-only cookie (not accessible via JS)
    return null;
  },

  /**
   * Remove refresh token
   */
  async removeRefreshToken(): Promise<void> {
    // Clear memory cache
    if (tokenCache) tokenCache.refreshToken = null;
    
    if (isNativePlatform()) {
      await Preferences.remove({ key: KEYS.REFRESH_TOKEN });
    }
    // On web, HTTP-only cookie is cleared by server logout endpoint
  },

  // ============= USER DATA =============
  
  /**
   * Store user data
   */
  async setUserData(userData: object): Promise<void> {
    const dataString = JSON.stringify(userData);
    if (isNativePlatform()) {
      await Preferences.set({ key: KEYS.USER_DATA, value: dataString });
      console.log('📱 User data stored in native storage');
    } else {
      localStorage.setItem(KEYS.USER_DATA, dataString);
      console.log('🌐 User data stored in localStorage');
    }
  },

  /**
   * Get user data
   */
  async getUserData<T = any>(): Promise<T | null> {
    let dataString: string | null = null;
    
    if (isNativePlatform()) {
      const result = await Preferences.get({ key: KEYS.USER_DATA });
      dataString = result.value;
    } else {
      dataString = localStorage.getItem(KEYS.USER_DATA);
    }
    
    if (!dataString) return null;
    
    try {
      return JSON.parse(dataString) as T;
    } catch {
      console.warn('Failed to parse user data');
      return null;
    }
  },

  /**
   * Remove user data
   */
  async removeUserData(): Promise<void> {
    if (isNativePlatform()) {
      await Preferences.remove({ key: KEYS.USER_DATA });
    } else {
      localStorage.removeItem(KEYS.USER_DATA);
    }
  },

  // ============= TOKEN EXPIRY =============
  
  /**
   * Store token expiry timestamp
   */
  async setTokenExpiry(expiryTimestamp: number): Promise<void> {
    // Update memory cache
    if (!tokenCache) tokenCache = { accessToken: null, refreshToken: null, expiresAt: null };
    tokenCache.expiresAt = expiryTimestamp;
    
    const value = expiryTimestamp.toString();
    if (isNativePlatform()) {
      await Preferences.set({ key: KEYS.TOKEN_EXPIRY, value });
    } else {
      localStorage.setItem(KEYS.TOKEN_EXPIRY, value);
    }
    
    console.log(`⏱️ Token expiry set: ${new Date(expiryTimestamp).toLocaleTimeString()}`);
  },

  /**
   * Get token expiry timestamp
   */
  async getTokenExpiry(): Promise<number | null> {
    let value: string | null = null;
    
    if (isNativePlatform()) {
      const result = await Preferences.get({ key: KEYS.TOKEN_EXPIRY });
      value = result.value;
    } else {
      value = localStorage.getItem(KEYS.TOKEN_EXPIRY);
    }
    
    return value ? parseInt(value, 10) : null;
  },

  /**
   * Check if token is expired
   */
  async isTokenExpired(): Promise<boolean> {
    const expiry = await this.getTokenExpiry();
    if (!expiry) return true;
    return Date.now() >= expiry;
  },

  // ============= DEVICE ID (Mobile Only) =============
  
  /**
   * Get or generate device ID for mobile devices
   */
  async getDeviceId(): Promise<string | null> {
    if (!isNativePlatform()) return null;
    
    const result = await Preferences.get({ key: KEYS.DEVICE_ID });
    if (result.value) return result.value;
    
    // Generate a new device ID
    const deviceId = `${getPlatform()}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    await Preferences.set({ key: KEYS.DEVICE_ID, value: deviceId });
    console.log('📱 Generated new device ID:', deviceId);
    return deviceId;
  },

  // ============= CLEAR ALL =============
  
  /**
   * Clear all authentication data
   */
  async clearAll(): Promise<void> {
    console.log(`${isNativePlatform() ? '📱' : '🌐'} Clearing all auth data...`);
    
    // Clear memory cache first
    tokenCache = null;
    
    if (isNativePlatform()) {
      await Promise.all([
        Preferences.remove({ key: KEYS.ACCESS_TOKEN }),
        Preferences.remove({ key: KEYS.REFRESH_TOKEN }),
        Preferences.remove({ key: KEYS.USER_DATA }),
        Preferences.remove({ key: KEYS.TOKEN_EXPIRY }),
      ]);
      console.log('📱 All native auth data cleared + memory cache');
    } else {
      localStorage.removeItem(KEYS.ACCESS_TOKEN);
      localStorage.removeItem(KEYS.USER_DATA);
      localStorage.removeItem(KEYS.TOKEN_EXPIRY);
      // Also clear legacy keys
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('org_access_token');
      console.log('🌐 All localStorage auth data cleared + memory cache');
    }
  },

  // ============= AUTHENTICATION CHECK =============
  
  /**
   * Check if user has valid authentication
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    if (!token) return false;
    
    // Optionally check expiry
    const isExpired = await this.isTokenExpired();
    return !isExpired;
  },

  // ============= SYNC ACCESS TOKEN (for API headers) =============
  
  /**
   * Get access token synchronously (for API headers)
   * Falls back to localStorage on web, returns cached value on mobile
   * 
   * NOTE: On mobile, you should call getAccessToken() async and cache it
   * before using this sync method
   */
  getAccessTokenSync(): string | null {
    if (isNativePlatform()) {
      // On mobile we cannot read Preferences sync, but we CAN return the in-memory cache.
      // AuthContext initialization (getAccessTokenAsync) and loginUser() both populate this.
      const cached = tokenCache?.accessToken;
      if (cached) return cached;
      console.warn('⚠️ getAccessTokenSync called on mobile before token cache is ready');
      return null;
    }
    return localStorage.getItem(KEYS.ACCESS_TOKEN);
  },
};

// ============= AUTH API HELPER =============

/**
 * Get API headers with authorization token
 * Async version for cross-platform support
 */
export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = await tokenStorageService.getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

/**
 * Get API headers synchronously (web only, for backward compatibility)
 */
export const getAuthHeadersSync = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = tokenStorageService.getAccessTokenSync();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

export default tokenStorageService;
