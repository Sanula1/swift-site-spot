import { LoginCredentials, ApiResponse, ApiUserResponse } from '../types/auth.types';
import { tokenStorageService, isNativePlatform, getAuthHeadersSync } from '@/services/tokenStorageService';

// ============= BASE URL CONFIGURATION =============

export const getBaseUrl = (): string => {
  return import.meta.env.VITE_LMS_BASE_URL || 'https://lmsapi.suraksha.lk';
};

export const getBaseUrl2 = (): string => {
  const storedUrl = localStorage.getItem('baseUrl2');
  if (storedUrl) return storedUrl;
  
  const envUrl = import.meta.env.VITE_API_BASE_URL_2;
  if (envUrl) return envUrl;
  
  return '';
};

export const getAttendanceUrl = (): string => {
  return import.meta.env.VITE_ATTENDANCE_BASE_URL || 'https://lmsapi.suraksha.lk';
};

// ============= API HEADERS =============

/**
 * Get API headers synchronously (backward compatibility)
 * For new code, prefer getApiHeadersAsync()
 * @deprecated Use getApiHeadersAsync() for cross-platform support
 */
export const getApiHeaders = (): Record<string, string> => {
  return getAuthHeadersSync();
};

/**
 * Get API headers async (cross-platform support)
 */
export const getApiHeadersAsync = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  const token = await tokenStorageService.getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

/**
 * Get credentials mode for fetch requests
 * - Web: 'include' to send/receive cookies
 * - Mobile: 'omit' since WebView doesn't support cookies properly
 */
export const getCredentialsMode = (): RequestCredentials => {
  return isNativePlatform() ? 'omit' : 'include';
};

/**
 * Get organization-specific token (async, cross-platform)
 * Used for baseUrl2 API calls
 */
export const getOrgAccessTokenAsync = async (): Promise<string | null> => {
  if (isNativePlatform()) {
    // On mobile, org token is stored with a specific key
    const { Preferences } = await import('@capacitor/preferences');
    const result = await Preferences.get({ key: 'org_access_token' });
    return result.value;
  }
  return localStorage.getItem('org_access_token');
};

/**
 * Set organization-specific token (async, cross-platform)
 */
export const setOrgAccessTokenAsync = async (token: string): Promise<void> => {
  if (isNativePlatform()) {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: 'org_access_token', value: token });
    console.log('📱 Org access token stored in native storage');
  } else {
    localStorage.setItem('org_access_token', token);
    console.log('🌐 Org access token stored in localStorage');
  }
};

/**
 * Remove organization-specific token (async, cross-platform)
 */
export const removeOrgAccessTokenAsync = async (): Promise<void> => {
  if (isNativePlatform()) {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.remove({ key: 'org_access_token' });
  } else {
    localStorage.removeItem('org_access_token');
  }
};

// ============= TOKEN REFRESH STATE (Singleton) =============

let isRefreshing = false;
let refreshPromise: Promise<ApiUserResponse> | null = null;

// ============= LOGIN =============

export const loginUser = async (credentials: LoginCredentials): Promise<ApiResponse> => {
  const baseUrl = getBaseUrl();
  const isMobile = isNativePlatform();
  const platform = isMobile ? '📱' : '🌐';

  console.log(`${platform} Login attempt:`, { identifier: credentials.identifier });

  // Mobile uses different endpoint that returns refresh_token in response body
  // Web uses endpoint that sets refresh_token as HTTP-only cookie
  const loginEndpoint = isMobile ? '/v2/auth/login/mobile' : '/v2/auth/login';

  const response = await fetch(`${baseUrl}${loginEndpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: isMobile ? 'omit' : 'include', // Web: Include cookies for refresh token; Mobile: No cookies
    body: JSON.stringify({
      identifier: credentials.identifier,
      password: credentials.password,
      // Backend should use this to set a persistent refresh token (SSO) when enabled.
      // We send both keys for backward/variant compatibility.
      rememberMe: !!credentials.rememberMe,
      remember_me: !!credentials.rememberMe,
      ...(isMobile && { deviceId: await tokenStorageService.getDeviceId() })
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Login failed: ${response.status}`);
  }

  const data = await response.json();

  // Store access token using platform-aware storage
  if (data.access_token) {
    await tokenStorageService.setAccessToken(data.access_token);
    console.log(`${platform} Access token stored`);
  }

  // Store refresh token (mobile only - web uses HTTP-only cookie)
  if (isMobile && data.refresh_token) {
    await tokenStorageService.setRefreshToken(data.refresh_token);
    console.log('📱 Refresh token stored in native secure storage');
  }

  // Store token expiry if provided
  if (data.expires_in) {
    const expiryTimestamp = Date.now() + (data.expires_in * 1000);
    await tokenStorageService.setTokenExpiry(expiryTimestamp);
  }

  // Store minimal user data
  if (data.user) {
    const minimalUserData = {
      id: data.user.id,
      email: data.user.email,
      nameWithInitials: data.user.nameWithInitials,
      userType: data.user.userType,
      imageUrl: data.user.imageUrl
    };
    await tokenStorageService.setUserData(minimalUserData);
    console.log(`${platform} User data stored (nameWithInitials format)`);
  }

  if (!isMobile) {
    // Refresh token is automatically stored in httpOnly cookie by server (web only)
    console.log('🌐 Login successful, refresh token in httpOnly cookie (SSO enabled)');
  } else {
    console.log('📱 Login successful, tokens stored in native secure storage');
  }

  return data;
};

// ============= TOKEN REFRESH (Singleton Pattern) =============

/**
 * Refresh access token
 * - Web: Uses httpOnly cookie (server-managed)
 * - Mobile: Uses refresh token from native secure storage
 * Uses singleton pattern to prevent multiple concurrent refresh requests
 */
export const refreshAccessToken = async (): Promise<ApiUserResponse> => {
  const baseUrl = getBaseUrl();
  const isMobile = isNativePlatform();
  const platform = isMobile ? '📱' : '🌐';

  // If already refreshing, return the existing promise (prevent race conditions)
  if (isRefreshing && refreshPromise) {
    console.log('🔄 Token refresh already in progress, waiting...');
    return refreshPromise;
  }

  isRefreshing = true;
  console.log(`${platform} Refreshing access token...`);

  refreshPromise = (async () => {
    try {
      let response: Response;

      if (isMobile) {
        // Mobile: Send refresh token in request body
        const refreshToken = await tokenStorageService.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        response = await fetch(`${baseUrl}/auth/refresh/mobile`, {
          method: 'POST',
          credentials: 'omit', // No cookies on mobile
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            refresh_token: refreshToken,
            deviceId: await tokenStorageService.getDeviceId()
          })
        });
      } else {
        // Web: Use HTTP-only cookie
        response = await fetch(`${baseUrl}/auth/refresh`, {
          method: 'POST',
          credentials: 'include', // CRITICAL: Send refresh token cookie
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }

      if (!response.ok) {
        console.error('❌ Token refresh failed:', response.status);
        
        // Clear all auth data on refresh failure
        await clearAuthData();
        
        // Dispatch auth failure event
        window.dispatchEvent(new CustomEvent('auth:refresh-failed'));
        
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      // Store new access token using platform-aware storage
      if (data.access_token) {
        await tokenStorageService.setAccessToken(data.access_token);
        console.log(`${platform} New access token stored`);
      }

      // Store new refresh token (mobile only)
      if (isMobile && data.refresh_token) {
        await tokenStorageService.setRefreshToken(data.refresh_token);
        console.log('📱 New refresh token stored');
      }

      // Update token expiry if provided
      if (data.expires_in) {
        const expiryTimestamp = Date.now() + (data.expires_in * 1000);
        await tokenStorageService.setTokenExpiry(expiryTimestamp);
      }

      // Update user data with new format
      if (data.user) {
        const minimalUserData = {
          id: data.user.id,
          email: data.user.email,
          nameWithInitials: data.user.nameWithInitials,
          userType: data.user.userType,
          imageUrl: data.user.imageUrl
        };
        await tokenStorageService.setUserData(minimalUserData);
        console.log(`${platform} User data updated (nameWithInitials format)`);
      }

      // Dispatch success event to notify AuthContext
      window.dispatchEvent(new CustomEvent('auth:refresh-success', {
        detail: { user: data.user }
      }));

      return data.user;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// ============= TOKEN VALIDATION =============

/**
 * Validate token and get user data
 * Uses cached user data when available, falls back to /auth/me
 */
export const validateToken = async (): Promise<ApiUserResponse> => {
  const baseUrl = getBaseUrl();
  const isMobile = isNativePlatform();
  const platform = isMobile ? '📱' : '🌐';
  
  const token = await tokenStorageService.getAccessToken();
  const cachedUserData = await tokenStorageService.getUserData();

  // If we have an expiry timestamp and the token is expired/near-expiry, refresh first.
  // (Prevents “works for a few hours then logs out” when the app is idle.)
  const expiry = await tokenStorageService.getTokenExpiry();
  if (token && expiry && Date.now() >= (expiry - 60_000)) {
    console.log(`${platform} Access token expired/near-expiry, refreshing...`);
    return await refreshAccessToken();
  }

  // If no access token, try to refresh
  if (!token) {
    console.log(`${platform} No access token, attempting refresh...`);
    try {
      return await refreshAccessToken();
    } catch (error) {
      console.error('❌ Refresh failed, user must login');
      throw new Error('No authentication token found');
    }
  }

  // If user data exists in storage, return it (skip /auth/me call)
  if (cachedUserData) {
    console.log(`${platform} Using cached user data:`, {
      userId: cachedUserData.id,
      email: cachedUserData.email,
      nameWithInitials: cachedUserData.nameWithInitials
    });
    return cachedUserData;
  }

  // No cached user data, call /auth/me
  console.log(`${platform} Fetching user data from /auth/me...`);

  try {
    const headers = await getApiHeadersAsync();
    const response = await fetch(`${baseUrl}/auth/me`, {
      method: 'GET',
      headers,
      credentials: isMobile ? 'omit' : 'include'
    });

    // If 401, try to refresh token
    if (response.status === 401) {
      console.log(`${platform} Access token expired, attempting refresh...`);
      return await refreshAccessToken();
    }

    if (!response.ok) {
      await clearAuthData();
      throw new Error(`Token validation failed: ${response.status}`);
    }

    const responseData = await response.json();

    // Handle both wrapped ({ success, data }) and unwrapped responses
    const userData = responseData.data || responseData;

    // Cache user data with new format
    const minimalUserData = {
      id: userData.id,
      email: userData.email,
      nameWithInitials: userData.nameWithInitials,
      userType: userData.userType,
      imageUrl: userData.imageUrl
    };
    await tokenStorageService.setUserData(minimalUserData);

    console.log(`${platform} User data fetched and cached:`, {
      userId: userData.id,
      email: userData.email,
      nameWithInitials: userData.nameWithInitials
    });

    return userData;
  } catch (error) {
    console.error('❌ Token validation error:', error);
    await clearAuthData();
    throw error;
  }
};

// ============= LOGOUT =============

export const logoutUser = async (): Promise<void> => {
  const baseUrl = getBaseUrl();
  const isMobile = isNativePlatform();
  const platform = isMobile ? '📱' : '🌐';

  console.log(`${platform} Logging out...`);

  try {
    if (isMobile) {
      // Mobile: Send refresh token in body to revoke on server
      const refreshToken = await tokenStorageService.getRefreshToken();
      if (refreshToken) {
        await fetch(`${baseUrl}/auth/logout/mobile`, {
          method: 'POST',
          credentials: 'omit',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            refresh_token: refreshToken,
            deviceId: await tokenStorageService.getDeviceId()
          })
        });
        console.log('📱 Mobile logout endpoint called, refresh token revoked');
      }
    } else {
      // Web: Call logout endpoint to revoke refresh token (stored in httpOnly cookie)
      await fetch(`${baseUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include', // CRITICAL: Send refresh token cookie to revoke
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('🌐 Web logout endpoint called, refresh token cookie cleared');
    }
  } catch (error) {
    console.warn('⚠️ Logout endpoint call failed:', error);
  }

  // Clear all auth data using platform-aware storage
  await clearAuthData();
  
  console.log(`${platform} All auth data cleared`);
};

// ============= HELPER FUNCTIONS =============

/**
 * Clear all authentication data (platform-aware)
 */
const clearAuthData = async (): Promise<void> => {
  const isMobile = isNativePlatform();
  
  // Clear tokens using platform-aware storage
  await tokenStorageService.clearAll();
  
  if (!isMobile) {
    // Web: Also clear legacy localStorage keys
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('org_access_token');
    
    // Clear context selections from localStorage
    localStorage.removeItem('selectedInstitute');
    localStorage.removeItem('selectedClass');
    localStorage.removeItem('selectedSubject');
    localStorage.removeItem('selectedChild');
    localStorage.removeItem('selectedOrganization');
  }
};

/**
 * Check if user is currently authenticated (has valid token)
 * Async version for cross-platform support
 */
export const isAuthenticatedAsync = async (): Promise<boolean> => {
  return await tokenStorageService.isAuthenticated();
};

/**
 * Check if user is currently authenticated (sync, web-only)
 * @deprecated Use isAuthenticatedAsync() for cross-platform support
 */
export const isAuthenticated = (): boolean => {
  if (isNativePlatform()) {
    console.warn('⚠️ isAuthenticated() called on mobile - use isAuthenticatedAsync() instead');
    return false;
  }
  return !!localStorage.getItem('access_token');
};

/**
 * Get current access token (async for cross-platform)
 */
export const getAccessTokenAsync = async (): Promise<string | null> => {
  return await tokenStorageService.getAccessToken();
};

/**
 * Get current access token (sync, web-only)
 * @deprecated Use getAccessTokenAsync() for cross-platform support
 */
export const getAccessToken = (): string | null => {
  if (isNativePlatform()) {
    console.warn('⚠️ getAccessToken() called on mobile - use getAccessTokenAsync() instead');
    return null;
  }
  return localStorage.getItem('access_token');
};

// Re-export platform detection
export { isNativePlatform, tokenStorageService };