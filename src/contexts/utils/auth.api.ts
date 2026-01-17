import { LoginCredentials, ApiResponse, ApiUserResponse } from '../types/auth.types';

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

export const getApiHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  const token = localStorage.getItem('access_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

// ============= TOKEN REFRESH STATE (Singleton) =============

let isRefreshing = false;
let refreshPromise: Promise<ApiUserResponse> | null = null;

// ============= LOGIN =============

export const loginUser = async (credentials: LoginCredentials): Promise<ApiResponse> => {
  const baseUrl = getBaseUrl();

  console.log('🔐 Login attempt:', { email: credentials.email });

  const response = await fetch(`${baseUrl}/v2/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include', // CRITICAL: Include cookies for refresh token
    body: JSON.stringify(credentials)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Login failed: ${response.status}`);
  }

  const data = await response.json();

  // Store access token in memory/localStorage (short-lived)
  if (data.access_token) {
    localStorage.setItem('access_token', data.access_token);
    console.log('✅ Access token stored');
  }

  // Store minimal user data in localStorage
  if (data.user) {
    const minimalUserData = {
      id: data.user.id,
      email: data.user.email,
      nameWithInitials: data.user.nameWithInitials,
      userType: data.user.userType,
      imageUrl: data.user.imageUrl
    };
    localStorage.setItem('user_data', JSON.stringify(minimalUserData));
    console.log('✅ User data stored (nameWithInitials format)');
  }

  // Refresh token is automatically stored in httpOnly cookie by server
  console.log('✅ Login successful, refresh token in httpOnly cookie');

  return data;
};

// ============= TOKEN REFRESH (Singleton Pattern) =============

/**
 * Refresh access token using httpOnly cookie
 * Uses singleton pattern to prevent multiple concurrent refresh requests
 */
export const refreshAccessToken = async (): Promise<ApiUserResponse> => {
  const baseUrl = getBaseUrl();

  // If already refreshing, return the existing promise (prevent race conditions)
  if (isRefreshing && refreshPromise) {
    console.log('🔄 Token refresh already in progress, waiting...');
    return refreshPromise;
  }

  isRefreshing = true;
  console.log('🔄 Refreshing access token...');

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // CRITICAL: Send refresh token cookie
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('❌ Token refresh failed:', response.status);
        
        // Clear all auth data on refresh failure
        clearAuthData();
        
        // Dispatch auth failure event
        window.dispatchEvent(new CustomEvent('auth:refresh-failed'));
        
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      // Store new access token
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        console.log('✅ New access token stored');
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
        localStorage.setItem('user_data', JSON.stringify(minimalUserData));
        console.log('✅ User data updated (nameWithInitials format)');
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
  const token = localStorage.getItem('access_token');
  const cachedUserData = localStorage.getItem('user_data');

  // If no access token, try to refresh using httpOnly cookie
  if (!token) {
    console.log('⚠️ No access token, attempting refresh via cookie...');
    try {
      return await refreshAccessToken();
    } catch (error) {
      console.error('❌ Refresh failed, user must login');
      throw new Error('No authentication token found');
    }
  }

  // If user data exists in localStorage, return it (skip /auth/me call)
  if (cachedUserData) {
    try {
      const userData = JSON.parse(cachedUserData);
      console.log('✅ Using cached user data:', {
        userId: userData.id,
        email: userData.email,
        nameWithInitials: userData.nameWithInitials
      });
      return userData;
    } catch (error) {
      console.warn('⚠️ Failed to parse cached user data');
    }
  }

  // No cached user data, call /auth/me
  console.log('🔐 Fetching user data from /auth/me...');

  try {
    const response = await fetch(`${baseUrl}/auth/me`, {
      method: 'GET',
      headers: getApiHeaders(),
      credentials: 'include'
    });

    // If 401, try to refresh token
    if (response.status === 401) {
      console.log('⚠️ Access token expired, attempting refresh...');
      return await refreshAccessToken();
    }

    if (!response.ok) {
      clearAuthData();
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
    localStorage.setItem('user_data', JSON.stringify(minimalUserData));

    console.log('✅ User data fetched and cached:', {
      userId: userData.id,
      email: userData.email,
      nameWithInitials: userData.nameWithInitials
    });

    return userData;
  } catch (error) {
    console.error('❌ Token validation error:', error);
    clearAuthData();
    throw error;
  }
};

// ============= LOGOUT =============

export const logoutUser = async (): Promise<void> => {
  const baseUrl = getBaseUrl();

  console.log('🚪 Logging out...');

  try {
    // Call logout endpoint to revoke refresh token (stored in httpOnly cookie)
    await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      credentials: 'include', // CRITICAL: Send refresh token cookie to revoke
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Logout endpoint called, refresh token revoked');
  } catch (error) {
    console.warn('⚠️ Logout endpoint call failed:', error);
  }

  // Clear all auth data from localStorage
  clearAuthData();
  
  console.log('✅ All auth data cleared');
};

// ============= HELPER FUNCTIONS =============

/**
 * Clear all authentication data from localStorage
 */
const clearAuthData = (): void => {
  // Clear auth tokens
  localStorage.removeItem('access_token');
  localStorage.removeItem('user_data');
  localStorage.removeItem('token');
  localStorage.removeItem('authToken');
  localStorage.removeItem('org_access_token');

  // Clear context selections
  localStorage.removeItem('selectedInstitute');
  localStorage.removeItem('selectedClass');
  localStorage.removeItem('selectedSubject');
  localStorage.removeItem('selectedChild');
  localStorage.removeItem('selectedOrganization');
};

/**
 * Check if user is currently authenticated (has valid token)
 */
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('access_token');
};

/**
 * Get current access token
 */
export const getAccessToken = (): string | null => {
  return localStorage.getItem('access_token');
};
