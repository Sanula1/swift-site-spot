
import { apiCache } from '@/utils/apiCache';
import { getBaseUrl, getBaseUrl2, getApiHeadersAsync, refreshAccessToken, getCredentialsMode, getOrgAccessTokenAsync, removeOrgAccessTokenAsync, isNativePlatform, tokenStorageService } from '@/contexts/utils/auth.api';

export interface CachedRequestOptions {
  ttl?: number;
  forceRefresh?: boolean;
  useStaleWhileRevalidate?: boolean;
  userId?: string;
  role?: string;
  instituteId?: string;
  classId?: string;
  subjectId?: string;
}

class CachedApiClient {
  private baseUrl: string;
  private useBaseUrl2: boolean = false;
  private pendingRequests = new Map<string, Promise<any>>();
  private readonly PENDING_REQUEST_TTL = 30000; // 30 seconds
  private requestCooldown = new Map<string, number>();
  private readonly COOLDOWN_PERIOD = 1000; // 1 second between identical requests
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;
  
  // Global rate limit tracking
  private rateLimitedUntil: number = 0;
  private readonly RATE_LIMIT_BACKOFF = 60000; // 60 seconds default backoff

  constructor() {
    this.baseUrl = getBaseUrl();
  }

  /**
   * Check if we're globally rate limited
   */
  private isRateLimited(): boolean {
    if (Date.now() < this.rateLimitedUntil) {
      return true;
    }
    if (this.rateLimitedUntil > 0) {
      this.rateLimitedUntil = 0;
    }
    return false;
  }

  /**
   * Set global rate limit (called when 429 error received)
   */
  private setRateLimited(retryAfterSeconds?: number): void {
    const backoffMs = (retryAfterSeconds || 60) * 1000;
    this.rateLimitedUntil = Date.now() + backoffMs;
    console.warn(`🛑 CachedClient: Rate limited! Pausing requests for ${backoffMs / 1000}s`);
  }

  /**
   * Handle 401 errors by refreshing token and redirecting to login if refresh fails
   */
  private async handle401Error(): Promise<boolean> {
    // If already refreshing, wait for the refresh to complete
    if (this.isRefreshing && this.refreshPromise) {
      try {
        await this.refreshPromise;
        return true;
      } catch {
        return false;
      }
    }

    // Start token refresh
    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        console.log('🔄 401 Error - Attempting token refresh...');
        await refreshAccessToken();
        console.log('✅ Token refreshed successfully');
      } catch (error) {
        console.error('❌ Token refresh failed:', error);
        
        // Clear all auth data using platform-aware storage
        await tokenStorageService.clearAll();
        
        if (!isNativePlatform()) {
          // Web: Also clear legacy localStorage keys
          localStorage.removeItem('token');
          localStorage.removeItem('authToken');
        }
        
        if (this.useBaseUrl2) {
          await removeOrgAccessTokenAsync();
        }
        
        // Redirect to login page
        console.log('🚪 Redirecting to login page...');
        window.location.href = '/login';
        
        throw error;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    try {
      await this.refreshPromise;
      return true;
    } catch {
      return false;
    }
  }

  private generateRequestKey(endpoint: string, params?: Record<string, any>, options?: CachedRequestOptions): string {
    // Include user context in the cache key for proper isolation
    const contextKey = {
      userId: options?.userId,
      role: options?.role,
      instituteId: options?.instituteId,
      classId: options?.classId,
      subjectId: options?.subjectId
    };
    return `${endpoint}_${JSON.stringify(params || {})}_${JSON.stringify(contextKey)}`;
  }

  private isInCooldown(requestKey: string): boolean {
    const lastRequestTime = this.requestCooldown.get(requestKey);
    if (!lastRequestTime) return false;
    
    const timeSinceLastRequest = Date.now() - lastRequestTime;
    return timeSinceLastRequest < this.COOLDOWN_PERIOD;
  }

  private setCooldown(requestKey: string): void {
    this.requestCooldown.set(requestKey, Date.now());
  }

  setUseBaseUrl2(use: boolean): void {
    this.useBaseUrl2 = use;
    this.baseUrl = use ? getBaseUrl2() : getBaseUrl();
    console.log(`Switched to ${use ? 'baseUrl2' : 'baseUrl'}:`, this.baseUrl);
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers = await getApiHeadersAsync();
    
    if (this.useBaseUrl2) {
      const orgToken = await getOrgAccessTokenAsync();
      if (orgToken) {
        headers['Authorization'] = `Bearer ${orgToken}`;
      }
    }

    return headers;
  }

  async get<T = any>(
    endpoint: string, 
    params?: Record<string, any>, 
    options: CachedRequestOptions = {}
  ): Promise<T> {
    const { 
      forceRefresh = false, 
      ttl = 30, 
      useStaleWhileRevalidate = true 
    } = options;

    const requestKey = this.generateRequestKey(endpoint, params, options);
    
    console.log('🔍 CachedClient.get() called:', { 
      endpoint, 
      params, 
      requestKey,
      userId: options.userId,
      role: options.role,
      forceRefresh 
    });
    
    // Check global rate limit FIRST
    if (this.isRateLimited()) {
      console.log('🛑 Rate limited - checking cache for:', endpoint);
      try {
        const cachedData = await apiCache.getCache<T>(endpoint, params, { 
          ttl: ttl * 10, // Accept older cache during rate limit
          forceRefresh: false, 
          ...options 
        });
        if (cachedData !== null) {
          console.log('✅ Returning cached data during rate limit:', endpoint);
          return cachedData;
        }
      } catch (e) {}
      throw new Error('Rate limited - please wait before making more requests');
    }
    
    // Try to get from cache first (unless forcing refresh)
    if (!forceRefresh) {
      try {
        const cachedData = await apiCache.getCache<T>(endpoint, params, { ttl, forceRefresh, ...options });
        if (cachedData !== null) {
          console.log('✅ Cache HIT for:', endpoint, 'User:', options.userId);
          return cachedData;
        }
        console.log('❌ Cache MISS for:', endpoint, 'User:', options.userId);
      } catch (error) {
        console.warn('Cache retrieval failed:', error);
      }
    } else {
      console.log('⚠️ Force refresh enabled, skipping cache for:', endpoint);
    }
    
    // Check if there's already a pending request for the same data
    if (this.pendingRequests.has(requestKey)) {
      console.log('♻️ Reusing pending request for:', requestKey);
      return this.pendingRequests.get(requestKey)!;
    }

    // Check cooldown period to prevent spam (AFTER checking cache and pending requests)
    if (this.isInCooldown(requestKey) && !forceRefresh) {
      console.log('⏱️ Request in cooldown, checking for stale cache:', requestKey);
      // Return cached data if available (even if expired)
      try {
        const staleCachedData = await apiCache.getCache<T>(endpoint, params, { 
          ttl: 999999, // Accept any cached data
          forceRefresh: false, 
          ...options 
        });
        if (staleCachedData !== null) {
          console.log('✅ Returning stale cache during cooldown:', endpoint);
          return staleCachedData;
        }
      } catch (error) {
        console.warn('No cached data available during cooldown');
      }
      // No cache available and in cooldown - allow the request to proceed anyway
      // This prevents the "Request in cooldown period and no cache available" error
      console.log('⚠️ No cache during cooldown, proceeding with request:', requestKey);
    }

    // Create new request
    const requestPromise = this.executeRequest<T>(endpoint, params, ttl, options);
    
    // Store the pending request
    this.pendingRequests.set(requestKey, requestPromise);
    
    // Set cooldown
    this.setCooldown(requestKey);
    
    // Clean up after request completes
    requestPromise.finally(() => {
      this.pendingRequests.delete(requestKey);
      // Clean up cooldown after TTL
      setTimeout(() => {
        this.requestCooldown.delete(requestKey);
      }, this.PENDING_REQUEST_TTL);
    });

    return requestPromise;
  }

  private async executeRequest<T>(
    endpoint: string, 
    params?: Record<string, any>, 
    ttl: number = 30,
    options?: CachedRequestOptions
  ): Promise<T> {
    // Refresh base URL in case it was updated
    this.baseUrl = this.useBaseUrl2 ? getBaseUrl2() : getBaseUrl();
    
    if (!this.baseUrl) {
      throw new Error('Backend URL not configured. Please set the backend URL in the login form.');
    }
    
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    console.log('🌐 API REQUEST (Cache Miss) to:', url.toString(), {
      userId: options?.userId,
      role: options?.role,
      instituteId: options?.instituteId
    });

    try {
      const headers = await this.getHeaders();
      const credentials = getCredentialsMode();
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        credentials // Platform-aware: 'include' for web, 'omit' for mobile
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error(`API Error ${response.status}:`, errorText);
        
        // Handle 429 - Rate Limited
        if (response.status === 429) {
          let retryAfter = 60;
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.details?.retryAfter) {
              const match = errorJson.details.retryAfter.match(/(\d+)/);
              if (match) retryAfter = parseInt(match[1], 10);
            }
          } catch {}
          this.setRateLimited(retryAfter);
          throw new Error('Too many requests. Please try again later.');
        }
        
        // Handle 401 - Try to refresh token
        if (response.status === 401) {
          const refreshed = await this.handle401Error();
          
          if (refreshed) {
            // Retry the request with new token
            console.log('🔁 Retrying request with new token...');
            const retryHeaders = await this.getHeaders();
            const retryResponse = await fetch(url.toString(), {
              method: 'GET',
              headers: retryHeaders,
              credentials // Platform-aware: 'include' for web, 'omit' for mobile
            });
            
            if (!retryResponse.ok) {
              throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
            }
            
            const retryContentType = retryResponse.headers.get('Content-Type');
            const retryData: T = retryContentType && retryContentType.includes('application/json')
              ? await retryResponse.json()
              : {} as T;
            
            // Cache the successful retry
            await apiCache.setCache(endpoint, retryData, params, ttl, options);
            console.log('✅ Retry successful after token refresh');
            return retryData;
          }
          
          throw new Error('Authentication failed');
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('Content-Type');
      let data: T;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = {} as T;
      }

      // Cache the successful response with user context
      try {
        await apiCache.setCache(endpoint, data, params, ttl, options);
      } catch (error) {
        console.warn('Failed to cache response:', error);
      }

      console.log('✅ API request successful, data cached for:', endpoint);
      return data;

    } catch (error) {
      console.error('API request failed for:', endpoint, error);
      throw error;
    }
  }

  async getCachedOnly<T = any>(endpoint: string, params?: Record<string, any>): Promise<T | null> {
    try {
      return await apiCache.getCache<T>(endpoint, params, { forceRefresh: false });
    } catch (error) {
      console.warn('Cache-only retrieval failed:', error);
      return null;
    }
  }

  async hasCache(endpoint: string, params?: Record<string, any>): Promise<boolean> {
    try {
      const cached = await apiCache.getCache(endpoint, params, { forceRefresh: false });
      return cached !== null;
    } catch (error) {
      console.warn('Cache check failed:', error);
      return false;
    }
  }

  async preload<T = any>(endpoint: string, params?: Record<string, any>, ttl?: number): Promise<void> {
    try {
      await this.get<T>(endpoint, params, { ttl, forceRefresh: false });
    } catch (error) {
      console.warn('Preload failed for:', endpoint, error);
    }
  }

  clearPendingRequests(): void {
    console.log('Clearing all pending requests');
    this.pendingRequests.clear();
    this.requestCooldown.clear();
  }

  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    // Refresh base URL in case it was updated
    this.baseUrl = this.useBaseUrl2 ? getBaseUrl2() : getBaseUrl();
    
    if (!this.baseUrl) {
      throw new Error('Backend URL not configured. Please set the backend URL in the login form.');
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log('POST Request:', url, data);
    
    const headers = await this.getHeaders();
    const credentials = getCredentialsMode();
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials // Platform-aware: 'include' for web, 'omit' for mobile
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`POST Error ${response.status}:`, errorText);
      
      // Handle 401 - Try to refresh token
      if (response.status === 401) {
        const refreshed = await this.handle401Error();
        
        if (refreshed) {
          console.log('🔁 Retrying POST request with new token...');
          const retryHeaders = await this.getHeaders();
          const retryResponse = await fetch(url, {
            method: 'POST',
            headers: retryHeaders,
            body: data ? JSON.stringify(data) : undefined,
            credentials // Platform-aware: 'include' for web, 'omit' for mobile
          });
          
          if (!retryResponse.ok) {
            throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
          }
          
          const retryContentType = retryResponse.headers.get('Content-Type');
          return retryContentType && retryContentType.includes('application/json')
            ? await retryResponse.json()
            : {} as T;
        }
        
        throw new Error('Authentication failed');
      }
      
      // Parse error message from JSON response
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          errorMessage = Array.isArray(errorJson.message) 
            ? errorJson.message.join(', ') 
            : errorJson.message;
        }
      } catch {
        // Keep default error message if JSON parsing fails
      }
      
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('Content-Type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return {} as T;
  }

  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    // Refresh base URL in case it was updated
    this.baseUrl = this.useBaseUrl2 ? getBaseUrl2() : getBaseUrl();
    
    if (!this.baseUrl) {
      throw new Error('Backend URL not configured. Please set the backend URL in the login form.');
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log('PUT Request:', url, data);
    
    const headers = await this.getHeaders();
    const credentials = getCredentialsMode();
    
    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials // Platform-aware: 'include' for web, 'omit' for mobile
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`PUT Error ${response.status}:`, errorText);
      
      // Handle 401 - Try to refresh token
      if (response.status === 401) {
        const refreshed = await this.handle401Error();
        
        if (refreshed) {
          console.log('🔁 Retrying PUT request with new token...');
          const retryHeaders = await this.getHeaders();
          const retryResponse = await fetch(url, {
            method: 'PUT',
            headers: retryHeaders,
            body: data ? JSON.stringify(data) : undefined,
            credentials // Platform-aware: 'include' for web, 'omit' for mobile
          });
          
          if (!retryResponse.ok) {
            throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
          }
          
          const retryContentType = retryResponse.headers.get('Content-Type');
          return retryContentType && retryContentType.includes('application/json')
            ? await retryResponse.json()
            : {} as T;
        }
        
        throw new Error('Authentication failed');
      }
      
      // Parse error message from JSON response
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          errorMessage = Array.isArray(errorJson.message) 
            ? errorJson.message.join(', ') 
            : errorJson.message;
        }
      } catch {
        // Keep default error message if JSON parsing fails
      }
      
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('Content-Type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return {} as T;
  }

  async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    // Refresh base URL in case it was updated
    this.baseUrl = this.useBaseUrl2 ? getBaseUrl2() : getBaseUrl();
    
    if (!this.baseUrl) {
      throw new Error('Backend URL not configured. Please set the backend URL in the login form.');
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log('PATCH Request:', url, data);
    
    const headers = await this.getHeaders();
    const credentials = getCredentialsMode();
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials // Platform-aware: 'include' for web, 'omit' for mobile
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`PATCH Error ${response.status}:`, errorText);
      
      // Handle 401 - Try to refresh token
      if (response.status === 401) {
        const refreshed = await this.handle401Error();
        
        if (refreshed) {
          console.log('🔁 Retrying PATCH request with new token...');
          const retryHeaders = await this.getHeaders();
          const retryResponse = await fetch(url, {
            method: 'PATCH',
            headers: retryHeaders,
            body: data ? JSON.stringify(data) : undefined,
            credentials // Platform-aware: 'include' for web, 'omit' for mobile
          });
          
          if (!retryResponse.ok) {
            throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
          }
          
          const retryContentType = retryResponse.headers.get('Content-Type');
          return retryContentType && retryContentType.includes('application/json')
            ? await retryResponse.json()
            : {} as T;
        }
        
        throw new Error('Authentication failed');
      }
      
      // Parse error message from JSON response
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          errorMessage = Array.isArray(errorJson.message) 
            ? errorJson.message.join(', ') 
            : errorJson.message;
        }
      } catch {
        // Keep default error message if JSON parsing fails
      }
      
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('Content-Type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return {} as T;
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    // Refresh base URL in case it was updated
    this.baseUrl = this.useBaseUrl2 ? getBaseUrl2() : getBaseUrl();
    
    if (!this.baseUrl) {
      throw new Error('Backend URL not configured. Please set the backend URL in the login form.');
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log('DELETE Request:', url);
    
    const headers = await this.getHeaders();
    const credentials = getCredentialsMode();
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers,
      credentials // Platform-aware: 'include' for web, 'omit' for mobile
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`DELETE Error ${response.status}:`, errorText);
      
      // Handle 401 - Try to refresh token
      if (response.status === 401) {
        const refreshed = await this.handle401Error();
        
        if (refreshed) {
          console.log('🔁 Retrying DELETE request with new token...');
          const retryHeaders = await this.getHeaders();
          const retryResponse = await fetch(url, {
            method: 'DELETE',
            headers: retryHeaders,
            credentials // Platform-aware: 'include' for web, 'omit' for mobile
          });
          
          if (!retryResponse.ok) {
            throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
          }
          
          const retryContentType = retryResponse.headers.get('Content-Type');
          return retryContentType && retryContentType.includes('application/json')
            ? await retryResponse.json()
            : {} as T;
        }
        
        throw new Error('Authentication failed');
      }
      
      // Parse error message from JSON response
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          errorMessage = Array.isArray(errorJson.message) 
            ? errorJson.message.join(', ') 
            : errorJson.message;
        }
      } catch {
        // Keep default error message if JSON parsing fails
      }
      
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('Content-Type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return {} as T;
  }
}

export const cachedApiClient = new CachedApiClient();
