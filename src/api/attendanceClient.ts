import { apiCache } from '@/utils/apiCache';
import { getAttendanceUrl, getApiHeaders, refreshAccessToken } from '@/contexts/utils/auth.api';

export interface CachedRequestOptions {
  ttl?: number;
  forceRefresh?: boolean;
  useStaleWhileRevalidate?: boolean;
}

class AttendanceApiClient {
  private baseUrl: string;
  private pendingRequests = new Map<string, Promise<any>>();
  private readonly PENDING_REQUEST_TTL = 30000; // 30 seconds
  private requestCooldown = new Map<string, number>();
  private readonly COOLDOWN_PERIOD = 1000; // 1 second between identical requests
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  constructor() {
    this.baseUrl = getAttendanceUrl();
  }

  /**
   * Handle 401 errors by refreshing token and redirecting to login if refresh fails
   */
  private async handle401Error(): Promise<boolean> {
    if (this.isRefreshing && this.refreshPromise) {
      try {
        await this.refreshPromise;
        return true;
      } catch {
        return false;
      }
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        console.log('🔄 401 Error (Attendance) - Attempting token refresh...');
        await refreshAccessToken();
        console.log('✅ Token refreshed successfully');
      } catch (error) {
        console.error('❌ Token refresh failed:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data');
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

  private generateRequestKey(endpoint: string, params?: Record<string, any>): string {
    return `attendance_${endpoint}_${JSON.stringify(params || {})}`;
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

  private getHeaders(): Record<string, string> {
    return getApiHeaders();
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

    const requestKey = this.generateRequestKey(endpoint, params);
    
    // Check cooldown period to prevent spam
    if (this.isInCooldown(requestKey) && !forceRefresh) {
      console.log('Attendance request is in cooldown period, skipping:', requestKey);
      throw new Error('Request in cooldown period');
    }

    // Try to get from cache first (unless forcing refresh)
    if (!forceRefresh) {
      try {
        const cachedData = await apiCache.getCache<T>(requestKey, params, { ttl, forceRefresh });
        if (cachedData !== null) {
          console.log('Cache hit for attendance:', endpoint);
          return cachedData;
        }
      } catch (error) {
        console.warn('Attendance cache retrieval failed:', error);
      }
    }

    // Check if there's already a pending request for the same data
    if (this.pendingRequests.has(requestKey)) {
      console.log('Reusing pending attendance request for:', requestKey);
      return this.pendingRequests.get(requestKey)!;
    }

    // Create new request
    const requestPromise = this.executeRequest<T>(endpoint, params, ttl);
    
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
    ttl: number = 30
  ): Promise<T> {
    // Refresh base URL in case it was updated
    this.baseUrl = getAttendanceUrl();
    
    if (!this.baseUrl) {
      throw new Error('Attendance backend URL not configured. Please set the attendance backend URL in Settings.');
    }
    
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    console.log('Making attendance API request to:', url.toString());

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include' // CRITICAL: Send httpOnly refresh token cookie
      });

      console.log('Attendance API Response Status:', response.status);
      console.log('Response Content-Type:', response.headers.get('Content-Type'));

      // Check if response is HTML (ngrok warning page)
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('text/html')) {
        const htmlContent = await response.text();
        
        // Check if it's an ngrok warning page
        if (htmlContent.includes('ngrok') && htmlContent.includes('You are about to visit')) {
          throw new Error('Ngrok tunnel is showing a browser warning. Please visit the ngrok URL in a browser first to accept the warning, or configure ngrok to skip browser warnings.');
        }
        
        throw new Error('API returned HTML instead of JSON. This might be a server configuration issue.');
      }

      if (!response.ok) {
        let errorText = '';
        try {
          if (contentType.includes('application/json')) {
            const errorData = await response.json();
            errorText = errorData.message || JSON.stringify(errorData);
          } else {
            errorText = await response.text();
          }
        } catch {
          errorText = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        console.error(`Attendance API Error ${response.status}:`, errorText);
        
        // Handle 401 - Try to refresh token
        if (response.status === 401) {
          const refreshed = await this.handle401Error();
          
          if (refreshed) {
            console.log('🔁 Retrying attendance request with new token...');
            const retryResponse = await fetch(url.toString(), {
              method: 'GET',
              headers: this.getHeaders(),
              credentials: 'include' // CRITICAL: Send httpOnly refresh token cookie
            });
            
            if (!retryResponse.ok) {
              throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
            }
            
            const retryContentType = retryResponse.headers.get('Content-Type') || '';
            let retryData: T;
            
            if (retryContentType.includes('application/json')) {
              retryData = await retryResponse.json();
            } else {
              retryData = {} as T;
            }
            
            const requestKey = this.generateRequestKey(endpoint, params);
            await apiCache.setCache(requestKey, retryData, params, ttl);
            console.log('✅ Retry successful after token refresh');
            return retryData;
          }
          
          throw new Error('Authentication failed');
        }
        
        throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`);
      }

      let data: T;
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error('Failed to parse JSON response:', jsonError);
          throw new Error('Invalid JSON response from server');
        }
      } else {
        // If not JSON, try to parse anyway but provide fallback
        try {
          data = await response.json();
        } catch {
          data = {} as T;
        }
      }

      // Cache the successful response with attendance prefix
      try {
        const requestKey = this.generateRequestKey(endpoint, params);
        await apiCache.setCache(requestKey, data, params, ttl);
      } catch (error) {
        console.warn('Failed to cache attendance response:', error);
      }

      console.log('Attendance API request successful for:', endpoint);
      return data;

    } catch (error) {
      console.error('Attendance API request failed for:', endpoint, error);
      throw error;
    }
  }

  clearPendingRequests(): void {
    console.log('Clearing all pending attendance requests');
    this.pendingRequests.clear();
    this.requestCooldown.clear();
  }

  async post<T = any>(
    endpoint: string, 
    body?: any
  ): Promise<T> {
    // Refresh base URL in case it was updated
    this.baseUrl = getAttendanceUrl();
    
    if (!this.baseUrl) {
      throw new Error('Attendance backend URL not configured. Please set the attendance backend URL in Settings.');
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    console.log('Making attendance POST request to:', url);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        credentials: 'include' // CRITICAL: Send httpOnly refresh token cookie
      });

      console.log('Attendance POST Response Status:', response.status);

      const contentType = response.headers.get('Content-Type') || '';
      
      if (!response.ok) {
        let errorText = '';
        try {
          if (contentType.includes('application/json')) {
            const errorData = await response.json();
            errorText = errorData.message || JSON.stringify(errorData);
          } else {
            errorText = await response.text();
          }
        } catch {
          errorText = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        console.error(`Attendance POST Error ${response.status}:`, errorText);
        
        // Handle 401 - Try to refresh token
        if (response.status === 401) {
          const refreshed = await this.handle401Error();
          
          if (refreshed) {
            console.log('🔁 Retrying attendance POST with new token...');
            const retryResponse = await fetch(url, {
              method: 'POST',
              headers: {
                ...this.getHeaders(),
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(body),
              credentials: 'include' // CRITICAL: Send httpOnly refresh token cookie
            });
            
            if (!retryResponse.ok) {
              throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
            }
            
            const retryContentType = retryResponse.headers.get('Content-Type') || '';
            let retryData: T;
            
            if (retryContentType.includes('application/json')) {
              retryData = await retryResponse.json();
            } else {
              retryData = {} as T;
            }
            
            console.log('✅ POST retry successful after token refresh');
            return retryData;
          }
          
          throw new Error('Authentication failed');
        }
        
        throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`);
      }

      let data: T;
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error('Failed to parse JSON response:', jsonError);
          throw new Error('Invalid JSON response from server');
        }
      } else {
        data = {} as T;
      }

      console.log('Attendance POST request successful for:', endpoint);
      return data;

    } catch (error) {
      console.error('Attendance POST request failed for:', endpoint, error);
      throw error;
    }
  }
}

export const attendanceApiClient = new AttendanceApiClient();