/**
 * Enhanced Cached API Client
 * Provides automatic caching with context awareness and cache invalidation
 */

import { secureCache } from '@/utils/secureCache';
import { getBaseUrl, getBaseUrl2, getApiHeaders, refreshAccessToken } from '@/contexts/utils/auth.api';

export interface EnhancedCacheOptions {
  ttl?: number; // Time to live in minutes
  forceRefresh?: boolean;
  useStaleWhileRevalidate?: boolean;
  userId?: string;
  instituteId?: string;
  classId?: string;
  subjectId?: string;
  role?: string;
}

class EnhancedCachedApiClient {
  private baseUrl: string;
  private useBaseUrl2: boolean = false;
  private pendingRequests = new Map<string, Promise<any>>();
  private readonly PENDING_REQUEST_TTL = 30000; // 30 seconds
  private requestCooldown = new Map<string, number>();
  private readonly COOLDOWN_PERIOD = 1000; // 1 second
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  constructor() {
    this.baseUrl = getBaseUrl();
  }

  /**
   * Handle 401 errors by refreshing token and redirecting to login if refresh fails
   */
  private async handle401Error(options?: EnhancedCacheOptions): Promise<boolean> {
    // If already refreshing, wait for the refresh to complete
    if (this.isRefreshing && this.refreshPromise) {
      try {
        await this.refreshPromise;
        return true; // Token refreshed successfully
      } catch {
        return false; // Refresh failed
      }
    }

    // Start token refresh
    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        console.log('🔄 401 Error - Attempting token refresh...');
        await refreshAccessToken();
        console.log('✅ Token refreshed successfully');
        
        // Clear user cache after refresh
        if (options?.userId) {
          await secureCache.clearUserCache(options.userId);
        }
      } catch (error) {
        console.error('❌ Token refresh failed:', error);
        
        // Clear all auth data
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data');
        if (this.useBaseUrl2) {
          localStorage.removeItem('org_access_token');
        }
        
        // Clear user cache
        if (options?.userId) {
          await secureCache.clearUserCache(options.userId);
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
      return true; // Token refreshed successfully
    } catch {
      return false; // Refresh failed, user will be redirected
    }
  }

  private generateRequestKey(endpoint: string, params?: Record<string, any>): string {
    return `${endpoint}_${JSON.stringify(params || {})}`;
  }

  private isInCooldown(requestKey: string): boolean {
    const lastRequestTime = this.requestCooldown.get(requestKey);
    if (!lastRequestTime) return false;
    
    const timeSinceLastRequest = Date.now() - lastRequestTime;
    return timeSinceLastRequest < this.COOLDOWN_PERIOD;
  }

  private setCooldown(requestKey: string): void {
    this.requestCooldown.set(requestKey, Date.now());
    // Auto-cleanup after cooldown
    setTimeout(() => {
      this.requestCooldown.delete(requestKey);
    }, this.COOLDOWN_PERIOD + 1000);
  }

  setUseBaseUrl2(use: boolean): void {
    this.useBaseUrl2 = use;
    this.baseUrl = use ? getBaseUrl2() : getBaseUrl();
    console.log(`📡 Switched to ${use ? 'baseUrl2' : 'baseUrl'}:`, this.baseUrl);
  }

  private getHeaders(): Record<string, string> {
    const headers = getApiHeaders();
    
    if (this.useBaseUrl2) {
      const orgToken = localStorage.getItem('org_access_token');
      if (orgToken) {
        headers['Authorization'] = `Bearer ${orgToken}`;
      }
    }

    return headers;
  }

  private extractContext(options: EnhancedCacheOptions): any {
    return {
      userId: options.userId,
      instituteId: options.instituteId,
      classId: options.classId,
      subjectId: options.subjectId,
      role: options.role
    };
  }

  /**
   * GET request with intelligent caching
   */
  async get<T = any>(
    endpoint: string, 
    params?: Record<string, any>, 
    options: EnhancedCacheOptions = {}
  ): Promise<T> {
    const { 
      forceRefresh = false, 
      ttl = 30, 
      useStaleWhileRevalidate = true 
    } = options;

    const requestKey = this.generateRequestKey(endpoint, params);
    
    // Try to get from cache first (unless forcing refresh)
    if (!forceRefresh) {
      try {
        const cachedData = await secureCache.getCache<T>(endpoint, params, {
          context: this.extractContext(options),
          ttl,
          forceRefresh
        });

        if (cachedData !== null) {
          // Stale-while-revalidate: return cache immediately, fetch in background
          if (useStaleWhileRevalidate) {
            this.revalidateInBackground(endpoint, params, options, ttl);
          }
          return cachedData;
        }
      } catch (error) {
        console.warn('⚠️ Cache retrieval failed:', error);
      }
    }

    // If there's already a pending request, reuse it
    if (this.pendingRequests.has(requestKey)) {
      console.log('♻️ Reusing pending request:', requestKey);
      return this.pendingRequests.get(requestKey)!;
    }

    // Check cooldown to prevent request spam (AFTER cache + pending request checks)
    if (!forceRefresh && this.isInCooldown(requestKey)) {
      console.log('⏸️ Request in cooldown period (no fresh cache):', requestKey);

      // Try returning slightly older cache during cooldown
      try {
        const staleCached = await secureCache.getCache<T>(endpoint, params, {
          context: this.extractContext(options),
          ttl: ttl * 2, // Accept older cache during cooldown
          forceRefresh: false
        });

        if (staleCached !== null) {
          return staleCached;
        }
      } catch (error) {
        console.warn('⚠️ No cached data available during cooldown');
      }

      // No cache and no pending request; proceed with request instead of throwing.
      console.log('⚠️ No cache during cooldown; proceeding with request:', requestKey);
    }


    // Create new request
    const requestPromise = this.executeRequest<T>(endpoint, params, options, ttl);
    
    // Store pending request
    this.pendingRequests.set(requestKey, requestPromise);
    
    // Set cooldown
    this.setCooldown(requestKey);
    
    // Clean up after completion
    requestPromise.finally(() => {
      this.pendingRequests.delete(requestKey);
    });

    return requestPromise;
  }

  /**
   * Background revalidation for stale-while-revalidate
   */
  private async revalidateInBackground<T>(
    endpoint: string,
    params: Record<string, any> | undefined,
    options: EnhancedCacheOptions,
    ttl: number
  ): Promise<void> {
    try {
      // Wait a bit to avoid immediate re-fetch
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const data = await this.executeRequest<T>(endpoint, params, options, ttl);
      console.log('🔄 Background revalidation complete:', endpoint);
    } catch (error) {
      console.warn('⚠️ Background revalidation failed:', error);
    }
  }

  /**
   * Execute the actual HTTP request
   */
  private async executeRequest<T>(
    endpoint: string, 
    params?: Record<string, any>, 
    options: EnhancedCacheOptions = {},
    ttl: number = 30
  ): Promise<T> {
    // Refresh base URL
    this.baseUrl = this.useBaseUrl2 ? getBaseUrl2() : getBaseUrl();
    
    if (!this.baseUrl) {
      throw new Error('Backend URL not configured. Please set the backend URL in settings.');
    }
    
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    console.log('📡 API Request:', {
      method: 'GET',
      url: url.toString(),
      context: this.extractContext(options)
    });

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include' // CRITICAL: Send httpOnly refresh token cookie
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error(`❌ API Error ${response.status}:`, errorText);
        
        // Handle 401 - Try to refresh token
        if (response.status === 401) {
          const refreshed = await this.handle401Error(options);
          
          if (refreshed) {
            // Retry the request with new token
            console.log('🔁 Retrying request with new token...');
            const retryResponse = await fetch(url.toString(), {
              method: 'GET',
              headers: this.getHeaders(),
              credentials: 'include' // CRITICAL: Send httpOnly refresh token cookie
            });
            
            if (!retryResponse.ok) {
              throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
            }
            
            const retryContentType = retryResponse.headers.get('Content-Type');
            const retryData: T = retryContentType && retryContentType.includes('application/json')
              ? await retryResponse.json()
              : {} as T;
            
            // Cache the successful retry
            await secureCache.setCache(endpoint, retryData, params, {
              ttl,
              context: this.extractContext(options)
            });
            
            console.log('✅ Retry successful after token refresh');
            return retryData;
          }
          
          // If we get here, user is being redirected to login
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
      let data: T;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = {} as T;
      }

      // Cache the successful response
      try {
        await secureCache.setCache(endpoint, data, params, {
          ttl,
          context: this.extractContext(options)
        });
      } catch (error) {
        console.warn('⚠️ Failed to cache response:', error);
      }

      console.log('✅ API request successful:', endpoint);
      return data;

    } catch (error) {
      console.error('❌ API request failed:', endpoint, error);
      throw error;
    }
  }

  /**
   * POST request with automatic cache invalidation
   */
  async post<T = any>(endpoint: string, data?: any, options: EnhancedCacheOptions = {}): Promise<T> {
    this.baseUrl = this.useBaseUrl2 ? getBaseUrl2() : getBaseUrl();
    
    if (!this.baseUrl) {
      throw new Error('Backend URL not configured');
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log('📡 POST Request:', { url, context: this.extractContext(options) });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include' // CRITICAL: Send httpOnly refresh token cookie
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`❌ POST Error ${response.status}:`, errorText);
      
      // Handle 401 - Try to refresh token
      if (response.status === 401) {
        const refreshed = await this.handle401Error(options);
        
        if (refreshed) {
          // Retry the request with new token
          console.log('🔁 Retrying POST request with new token...');
          const retryResponse = await fetch(url, {
            credentials: 'include',
            method: 'POST',
            headers: this.getHeaders(),
            body: data ? JSON.stringify(data) : undefined
          });
          
          if (!retryResponse.ok) {
            throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
          }
          
          const retryContentType = retryResponse.headers.get('Content-Type');
          const retryResult = retryContentType && retryContentType.includes('application/json')
            ? await retryResponse.json()
            : {} as T;
          
          await secureCache.invalidateOnMutation('POST', endpoint, this.extractContext(options));
          console.log('✅ POST retry successful after token refresh');
          return retryResult;
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
    const result = contentType && contentType.includes('application/json') 
      ? await response.json() 
      : {} as T;

    // Invalidate affected caches
    await secureCache.invalidateOnMutation('POST', endpoint, this.extractContext(options));
    
    console.log('✅ POST successful, cache invalidated:', endpoint);
    return result;
  }

  /**
   * PUT request with automatic cache invalidation
   */
  async put<T = any>(endpoint: string, data?: any, options: EnhancedCacheOptions = {}): Promise<T> {
    this.baseUrl = this.useBaseUrl2 ? getBaseUrl2() : getBaseUrl();
    
    if (!this.baseUrl) {
      throw new Error('Backend URL not configured');
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log('📡 PUT Request:', { url, context: this.extractContext(options) });
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include' // CRITICAL: Send httpOnly refresh token cookie
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`❌ PUT Error ${response.status}:`, errorText);
      
      // Handle 401 - Try to refresh token
      if (response.status === 401) {
        const refreshed = await this.handle401Error(options);
        
        if (refreshed) {
          console.log('🔁 Retrying PUT request with new token...');
          const retryResponse = await fetch(url, {
            credentials: 'include',
            method: 'PUT',
            headers: this.getHeaders(),
            body: data ? JSON.stringify(data) : undefined
          });
          
          if (!retryResponse.ok) {
            throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
          }
          
          const retryContentType = retryResponse.headers.get('Content-Type');
          const retryResult = retryContentType && retryContentType.includes('application/json')
            ? await retryResponse.json()
            : {} as T;
          
          await secureCache.invalidateOnMutation('PUT', endpoint, this.extractContext(options));
          console.log('✅ PUT retry successful after token refresh');
          return retryResult;
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
    const result = contentType && contentType.includes('application/json') 
      ? await response.json() 
      : {} as T;

    // Invalidate affected caches
    await secureCache.invalidateOnMutation('PUT', endpoint, this.extractContext(options));
    
    console.log('✅ PUT successful, cache invalidated:', endpoint);
    return result;
  }

  /**
   * PATCH request with automatic cache invalidation
   */
  async patch<T = any>(endpoint: string, data?: any, options: EnhancedCacheOptions = {}): Promise<T> {
    this.baseUrl = this.useBaseUrl2 ? getBaseUrl2() : getBaseUrl();
    
    if (!this.baseUrl) {
      throw new Error('Backend URL not configured');
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log('📡 PATCH Request:', { url, context: this.extractContext(options) });
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include' // CRITICAL: Send httpOnly refresh token cookie
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`❌ PATCH Error ${response.status}:`, errorText);
      
      // Handle 401 - Try to refresh token
      if (response.status === 401) {
        const refreshed = await this.handle401Error(options);
        
        if (refreshed) {
          console.log('🔁 Retrying PATCH request with new token...');
          const retryResponse = await fetch(url, {
            credentials: 'include',
            method: 'PATCH',
            headers: this.getHeaders(),
            body: data ? JSON.stringify(data) : undefined
          });
          
          if (!retryResponse.ok) {
            throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
          }
          
          const retryContentType = retryResponse.headers.get('Content-Type');
          const retryResult = retryContentType && retryContentType.includes('application/json')
            ? await retryResponse.json()
            : {} as T;
          
          await secureCache.invalidateOnMutation('PATCH', endpoint, this.extractContext(options));
          console.log('✅ PATCH retry successful after token refresh');
          return retryResult;
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
    const result = contentType && contentType.includes('application/json') 
      ? await response.json() 
      : {} as T;

    // Invalidate affected caches
    await secureCache.invalidateOnMutation('PATCH', endpoint, this.extractContext(options));
    
    console.log('✅ PATCH successful, cache invalidated:', endpoint);
    return result;
  }

  /**
   * DELETE request with automatic cache invalidation
   */
  async delete<T = any>(endpoint: string, options: EnhancedCacheOptions = {}): Promise<T> {
    this.baseUrl = this.useBaseUrl2 ? getBaseUrl2() : getBaseUrl();
    
    if (!this.baseUrl) {
      throw new Error('Backend URL not configured');
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log('📡 DELETE Request:', { url, context: this.extractContext(options) });
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
      credentials: 'include' // CRITICAL: Send httpOnly refresh token cookie
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`❌ DELETE Error ${response.status}:`, errorText);
      
      // Handle 401 - Try to refresh token
      if (response.status === 401) {
        const refreshed = await this.handle401Error(options);
        
        if (refreshed) {
          console.log('🔁 Retrying DELETE request with new token...');
          const retryResponse = await fetch(url, {
            credentials: 'include',
            method: 'DELETE',
            headers: this.getHeaders()
          });
          
          if (!retryResponse.ok) {
            throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
          }
          
          const retryContentType = retryResponse.headers.get('Content-Type');
          const retryResult = retryContentType && retryContentType.includes('application/json')
            ? await retryResponse.json()
            : {} as T;
          
          await secureCache.invalidateOnMutation('DELETE', endpoint, this.extractContext(options));
          console.log('✅ DELETE retry successful after token refresh');
          return retryResult;
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
    const result = contentType && contentType.includes('application/json') 
      ? await response.json() 
      : {} as T;

    // Invalidate affected caches
    await secureCache.invalidateOnMutation('DELETE', endpoint, this.extractContext(options));
    
    console.log('✅ DELETE successful, cache invalidated:', endpoint);
    return result;
  }

  /**
   * Check if data is cached
   */
  async hasCache(endpoint: string, params?: Record<string, any>, context?: any): Promise<boolean> {
    try {
      const cached = await secureCache.getCache(endpoint, params, { context, forceRefresh: false });
      return cached !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cached data only (no network request)
   */
  async getCachedOnly<T = any>(endpoint: string, params?: Record<string, any>, context?: any): Promise<T | null> {
    try {
      return await secureCache.getCache<T>(endpoint, params, { context, forceRefresh: false });
    } catch (error) {
      console.warn('⚠️ Cache-only retrieval failed:', error);
      return null;
    }
  }

  /**
   * Preload data into cache
   */
  async preload<T = any>(
    endpoint: string, 
    params?: Record<string, any>, 
    options: EnhancedCacheOptions = {}
  ): Promise<void> {
    try {
      await this.get<T>(endpoint, params, { ...options, forceRefresh: false });
      console.log('📥 Preloaded:', endpoint);
    } catch (error) {
      console.warn('⚠️ Preload failed:', endpoint, error);
    }
  }

  /**
   * Clear all pending requests
   */
  clearPendingRequests(): void {
    console.log('🗑️ Clearing all pending requests');
    this.pendingRequests.clear();
    this.requestCooldown.clear();
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return await secureCache.getCacheStats();
  }

  /**
   * Clear all cache
   */
  async clearAllCache(): Promise<void> {
    await secureCache.clearAllCache();
  }

  /**
   * Clear user-specific cache
   */
  async clearUserCache(userId: string): Promise<void> {
    await secureCache.clearUserCache(userId);
  }

  /**
   * Clear institute-specific cache
   */
  async clearInstituteCache(instituteId: string): Promise<void> {
    await secureCache.clearInstituteCache(instituteId);
  }
}

export const enhancedCachedClient = new EnhancedCachedApiClient();
