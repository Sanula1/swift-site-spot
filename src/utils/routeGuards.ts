import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * 🔒 INDUSTRIAL SECURITY - Route Guard Hooks
 * 
 * Security Features:
 * 1. URL parameter validation
 * 2. XSS protection
 * 3. SQL injection prevention
 * 4. Path traversal protection
 * 5. Unauthorized access detection
 * 6. Rate limiting awareness
 * 7. Session validation
 */

interface RouteGuardConfig {
  requireAuth?: boolean;
  requireInstitute?: boolean;
  requireClass?: boolean;
  requireSubject?: boolean;
  allowedRoles?: string[];
  validateParams?: (params: Record<string, string>) => boolean;
  onUnauthorized?: () => void;
}

/**
 * Sanitize URL parameters to prevent XSS and injection attacks
 */
export const sanitizeUrlParam = (param: string): string => {
  if (!param) return '';
  
  // Remove any script tags
  let sanitized = param.replace(/<script[^>]*>.*?<\/script>/gi, '');
  
  // Remove SQL injection patterns
  sanitized = sanitized.replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi, '');
  
  // Remove path traversal attempts
  sanitized = sanitized.replace(/\.\.[\/\\]/g, '');
  
  // Remove special characters that could be harmful
  sanitized = sanitized.replace(/[<>'"`;\\]/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  console.log('🧹 Sanitized URL param:', { original: param, sanitized });
  
  return sanitized;
};

/**
 * Validate if a string is a valid UUID/ID format
 */
export const isValidId = (id: string): boolean => {
  if (!id) return false;
  
  // Check for UUID format (v4)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  // Check for numeric ID
  const numericRegex = /^\d+$/;
  
  const isValid = uuidRegex.test(id) || numericRegex.test(id);
  
  if (!isValid) {
    console.warn('⚠️ Invalid ID format detected:', id);
  }
  
  return isValid;
};

/**
 * Validate URL parameters for security
 */
export const validateUrlParams = (params: URLSearchParams): boolean => {
  let isValid = true;
  
  params.forEach((value, key) => {
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i, // Event handlers
      /eval\(/i,
      /expression\(/i,
      /vbscript:/i,
      /%00/, // Null byte
      /\.\.[\/\\]/, // Path traversal
      /(union|select|insert|update|delete|drop|create|alter|exec)/i // SQL keywords
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(value) || pattern.test(key)) {
        console.error('🚨 SECURITY ALERT: Suspicious URL parameter detected:', {
          key,
          value,
          pattern: pattern.toString()
        });
        isValid = false;
        break;
      }
    }
  });
  
  return isValid;
};

/**
 * Extract and validate route parameters
 */
export const useRouteParams = (paramNames: string[]): Record<string, string | null> => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  
  const extractedParams: Record<string, string | null> = {};
  
  paramNames.forEach(paramName => {
    const value = params.get(paramName);
    if (value) {
      extractedParams[paramName] = sanitizeUrlParam(value);
    } else {
      extractedParams[paramName] = null;
    }
  });
  
  // Validate all parameters
  if (!validateUrlParams(params)) {
    console.error('🚨 Invalid URL parameters detected, clearing...');
    // Clear suspicious parameters
    paramNames.forEach(paramName => {
      extractedParams[paramName] = null;
    });
  }
  
  return extractedParams;
};

/**
 * Route Guard Hook - Validates access and redirects if unauthorized
 */
export const useRouteGuard = (config: RouteGuardConfig = {}): boolean => {
  const { user, selectedInstitute, selectedClass, selectedSubject } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    console.log('🔒 Route Guard activated for:', location.pathname);
    
    // Check authentication
    if (config.requireAuth && !user) {
      console.warn('❌ Unauthorized access attempt - no user');
      const fullPath = location.pathname + location.search + location.hash;
      if (config.onUnauthorized) {
        config.onUnauthorized();
      } else {
        navigate('/', { state: { from: fullPath }, replace: true });
      }
      return;
    }
    
    // Check role authorization
    if (config.allowedRoles && user) {
      if (!config.allowedRoles.includes(user.role)) {
        console.warn('❌ Unauthorized access attempt - insufficient role:', {
          userRole: user.role,
          requiredRoles: config.allowedRoles
        });
        if (config.onUnauthorized) {
          config.onUnauthorized();
        } else {
          navigate('/', { replace: true });
        }
        return;
      }
    }
    
    // Check institute requirement
    if (config.requireInstitute && !selectedInstitute) {
      console.warn('❌ Access denied - institute not selected');
      const fullPath = location.pathname + location.search + location.hash;
      navigate('/select-institute', { state: { from: fullPath }, replace: true });
      return;
    }
    
    // Check class requirement
    if (config.requireClass && !selectedClass) {
      console.warn('❌ Access denied - class not selected');
      const fullPath = location.pathname + location.search + location.hash;
      navigate('/select-class', { state: { from: fullPath }, replace: true });
      return;
    }
    
    // Check subject requirement
    if (config.requireSubject && !selectedSubject) {
      console.warn('❌ Access denied - subject not selected');
      const fullPath = location.pathname + location.search + location.hash;
      navigate('/select-subject', { state: { from: fullPath }, replace: true });
      return;
    }
    
    // Validate URL parameters
    const params = new URLSearchParams(location.search);
    if (!validateUrlParams(params)) {
      console.error('🚨 SECURITY: Malicious URL parameters detected, redirecting...');
      navigate('/', { replace: true });
      return;
    }
    
    // Custom parameter validation
    if (config.validateParams) {
      const paramObj: Record<string, string> = {};
      params.forEach((value, key) => {
        paramObj[key] = value;
      });
      
      if (!config.validateParams(paramObj)) {
        console.warn('❌ Custom parameter validation failed');
        navigate('/', { replace: true });
        return;
      }
    }
    
    console.log('✅ Route access granted:', location.pathname);
  }, [
    user,
    selectedInstitute,
    selectedClass,
    selectedSubject,
    location.pathname,
    config,
    navigate
  ]);
  
  return true;
};

/**
 * Secure Navigation Hook - Sanitizes URLs before navigation
 */
export const useSecureNavigate = () => {
  const navigate = useNavigate();
  
  return (to: string, options?: any) => {
    // Sanitize the destination URL
    const sanitizedTo = sanitizeUrlParam(to);
    
    // Prevent navigation to external URLs
    if (sanitizedTo.startsWith('http://') || sanitizedTo.startsWith('https://')) {
      console.warn('⚠️ External navigation blocked:', sanitizedTo);
      return;
    }
    
    // Prevent path traversal
    if (sanitizedTo.includes('..')) {
      console.warn('⚠️ Path traversal attempt blocked:', sanitizedTo);
      return;
    }
    
    console.log('🔐 Secure navigation to:', sanitizedTo);
    navigate(sanitizedTo, options);
  };
};

/**
 * Session Validation Hook - Continuously validates user session
 */
export const useSessionValidation = (intervalMs: number = 60000) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    const validateSession = () => {
      // Check if token exists
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token && user) {
        console.warn('🚨 Session expired - token missing');
        navigate('/', { replace: true });
        return;
      }
      
      // Check token expiry (if JWT)
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const expiry = payload.exp * 1000; // Convert to milliseconds
          
          if (Date.now() >= expiry) {
            console.warn('🚨 Session expired - token expired');
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            navigate('/', { replace: true });
            return;
          }
          
          console.log('✅ Session valid');
        } catch (error) {
          console.warn('⚠️ Unable to validate token:', error);
        }
      }
    };
    
    // Initial validation
    validateSession();
    
    // Periodic validation
    const interval = setInterval(validateSession, intervalMs);
    
    return () => clearInterval(interval);
  }, [user, navigate, intervalMs]);
};

/**
 * Rate Limit Detection Hook
 */
export const useRateLimitDetection = () => {
  useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      // Check for rate limit responses
      if (response.status === 429) {
        console.error('🚨 RATE LIMIT: Too many requests detected');
        
        const retryAfter = response.headers.get('Retry-After');
        if (retryAfter) {
          console.log(`⏳ Retry after: ${retryAfter} seconds`);
        }
      }
      
      return response;
    };
    
    return () => {
      window.fetch = originalFetch;
    };
  }, []);
};

export default {
  sanitizeUrlParam,
  isValidId,
  validateUrlParams,
  useRouteParams,
  useRouteGuard,
  useSecureNavigate,
  useSessionValidation,
  useRateLimitDetection
};
