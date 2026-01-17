import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import React from 'react';

/**
 * 🔗 Page-Based Context Navigation Manager
 * 
 * Manages URL updates when context (institute/class/subject) changes
 * Works with existing page-based navigation system
 */

export const useContextUrlSync = (currentPage: string) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    selectedInstitute, 
    selectedClass, 
    selectedSubject,
    selectedChild,
    selectedOrganization,
    selectedTransport
  } = useAuth();

  // Track if this is initial mount to avoid redirect loops
  const isInitialMount = React.useRef(true);

  useEffect(() => {
    // Skip on initial mount if URL already has context - let useRouteContext handle it
    if (isInitialMount.current) {
      isInitialMount.current = false;
      const hasContext = location.pathname.includes('/institute/') || 
                         location.pathname.includes('/child/') || 
                         location.pathname.includes('/organization/') ||
                         location.pathname.includes('/transport/');
      if (hasContext) {
        console.log('⏭️ [PageNav] Skipping initial URL sync - URL has context, letting useRouteContext load it');
        return;
      }
    }

    // Build context from current selections
    const context = {
      instituteId: selectedInstitute?.id,
      classId: selectedClass?.id,
      subjectId: selectedSubject?.id,
      childId: selectedChild?.id,
      organizationId: selectedOrganization?.id,
      transportId: selectedTransport?.id
    };
    
    // Derive effective page from URL if needed
    const derivedPage = extractPageFromUrl(location.pathname);
    const effectivePage = (!currentPage || currentPage.includes('/')) ? derivedPage : currentPage;
    
    // Build context-aware URL
    const contextUrl = buildSidebarUrl(effectivePage, context);
    
    // Parse current URL context
    const currentContext = parseContextIds(location.pathname);
    
    // Check if we need to update URL
    const needsUpdate = 
      currentContext.instituteId !== context.instituteId?.toString() ||
      currentContext.classId !== context.classId?.toString() ||
      currentContext.subjectId !== context.subjectId?.toString() ||
      currentContext.childId !== context.childId?.toString() ||
      currentContext.organizationId !== context.organizationId?.toString() ||
      currentContext.transportId !== context.transportId?.toString();
    
    // Only update if context changed and URLs are different
    if (needsUpdate && location.pathname !== contextUrl) {
      // CRITICAL: Preserve ALL query params
      const searchParams = new URLSearchParams(location.search);
      const queryString = searchParams.toString();
      const fullUrl = contextUrl + (queryString ? `?${queryString}` : '');
      
      console.log('🔗 [PageNav] Updating URL with context:', {
        from: location.pathname,
        to: fullUrl,
        queryParams: Object.fromEntries(searchParams.entries()),
        reason: 'Context changed',
        context: {
          institute: selectedInstitute?.name,
          class: selectedClass?.name,
          subject: selectedSubject?.name
        }
      });
      
      navigate(fullUrl, { replace: true });
    }
  }, [
    currentPage,
    selectedInstitute?.id,
    selectedClass?.id,
    selectedSubject?.id,
    selectedChild?.id,
    selectedOrganization?.id,
    selectedTransport?.id,
    navigate,
    location.pathname
  ]);
};

/**
 * Extract page name from context URL (for component rendering)
 */
export const extractPageFromUrl = (pathname: string): string => {
  // Remove leading slash
  let path = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  
  // Remove context segments
  path = path
    .replace(/^institute\/[^\/]+\/?/, '')
    .replace(/^class\/[^\/]+\/?/, '')
    .replace(/^subject\/[^\/]+\/?/, '')
    .replace(/^child\/[^\/]+\/?/, '')
    .replace(/^organization\/[^\/]+\/?/, '')
    .replace(/^transport\/[^\/]+\/?/, '');
  
  // Handle nested hierarchical routes with IDs
  // These routes should highlight their parent menu item in sidebar
  // homework/:id/submissions -> homework (for sidebar) but return actual page for rendering
  const homeworkSubmissionsMatch = path.match(/^homework\/([^\/]+)\/submissions$/);
  if (homeworkSubmissionsMatch) {
    return 'homework'; // Map to parent for sidebar highlighting
  }
  
  // exam/:id/results -> exams (for sidebar)
  const examResultsMatch = path.match(/^exam\/([^\/]+)\/results$/);
  if (examResultsMatch) {
    return 'exams'; // Map to parent for sidebar highlighting
  }
  
  // exam/:id/create-results -> exams (for sidebar)
  const examCreateResultsMatch = path.match(/^exam\/([^\/]+)\/create-results$/);
  if (examCreateResultsMatch) {
    return 'exams'; // Map to parent for sidebar highlighting
  }
  
  // Map sub-routes to their parent pages (for sidebar highlighting only - NOT for component rendering)
  const subRouteMap: Record<string, string> = {
    'system-payments/create': 'system-payment',
  };
  
  // Check if path matches any sub-route pattern
  if (subRouteMap[path]) {
    return subRouteMap[path];
  }
  
  // Convert URL paths to page IDs
  const urlToPageMap: Record<string, string> = {
    'institutes/users': 'institute-users',
    'institutes/classes': 'institute-classes',
  };
  
  // Check if path matches any special URL pattern
  if (urlToPageMap[path]) {
    return urlToPageMap[path];
  }
  
  // If empty (just subject context with no page), return dashboard
  return path || 'dashboard';
};

/**
 * Get sidebar highlight page (maps sub-pages to their parent menu items)
 */
export const getSidebarHighlightPage = (pathname: string): string => {
  const basePage = extractPageFromUrl(pathname);
  
  // Map pages to their sidebar parent for highlighting
  const sidebarParentMap: Record<string, string> = {
    'rfid-attendance': 'qr-attendance',
    'institute-mark-attendance': 'qr-attendance',
    'select-institute': 'dashboard', // Highlight 'Select Institutes' (dashboard) when on select-institute page
  };
  
  return sidebarParentMap[basePage] || basePage;
};

/**
 * Parse context IDs from URL
 */
export const parseContextIds = (pathname: string): {
  instituteId?: string;
  classId?: string;
  subjectId?: string;
  childId?: string;
  organizationId?: string;
  transportId?: string;
} => {
  const parts = pathname.split('/').filter(Boolean);
  const context: any = {};
  
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const value = parts[i + 1];
    
    if (key === 'institute') context.instituteId = value;
    else if (key === 'class') context.classId = value;
    else if (key === 'subject') context.subjectId = value;
    else if (key === 'child') context.childId = value;
    else if (key === 'organization') context.organizationId = value;
    else if (key === 'transport') context.transportId = value;
  }
  
  return context;
};

/**
 * Build URL for sidebar navigation
 */
export const buildSidebarUrl = (
  page: string,
  context: {
    instituteId?: string | number;
    classId?: string | number;
    subjectId?: string | number;
    childId?: string | number;
    organizationId?: string | number;
    transportId?: string | number;
  }
): string => {
  // Convert page IDs to URL paths
  const pageToUrlMap: Record<string, string> = {
    'institute-users': 'institutes/users',
    'institute-classes': 'institutes/classes',
  };

  // Get the actual URL path for the page
  const pagePath = pageToUrlMap[page] || page;

  // Pages that must ALWAYS be global (no institute/class/subject prefix)
  // These are dedicated top-level routes like "/id-cards".
  const globalPages = new Set(['id-cards', 'card-demo']);
  if (globalPages.has(page)) {
    return `/${pagePath}`;
  }

  let url = '';

  // Handle special dashboard case
  if (page === 'dashboard' && !context.childId && !context.organizationId && !context.transportId && !context.instituteId) {
    return '/dashboard';
  }
  
  if (context.childId) {
    url = `/child/${context.childId}`;
    if (page !== 'dashboard') url += `/${pagePath}`;
  } else if (context.organizationId) {
    url = `/organization/${context.organizationId}`;
    if (page !== 'dashboard') url += `/${pagePath}`;
  } else if (context.transportId) {
    url = `/transport/${context.transportId}`;
    if (page !== 'dashboard') url += `/${pagePath}`;
  } else if (context.instituteId) {
    // Special handling for selection flows
    if (page === 'select-class') {
      // Stay at institute level: /institute/:id/select-class
      url = `/institute/${context.instituteId}/select-class`;
    } else if (page === 'select-subject') {
      // Use institute + class, but no subject yet: /institute/:id/class/:classId/select-subject
      url = `/institute/${context.instituteId}`;
      if (context.classId) {
        url += `/class/${context.classId}/select-subject`;
      } else {
        // Fallback: if no class yet, stay at institute level
        url += '/select-class';
      }
    } else {
      url = `/institute/${context.instituteId}`;
      
      if (context.classId) {
        url += `/class/${context.classId}`;
        
        // Some pages are class-scoped (must NOT include subject in the URL)
        const classScopedPages = new Set(['parents']);

        if (context.subjectId && !classScopedPages.has(page)) {
          url += `/subject/${context.subjectId}`;
        }
      }
      
      // Always append /dashboard for dashboard page when context is present
      if (page === 'dashboard') {
        url += '/dashboard';
      } else {
        url += `/${pagePath}`;
      }
    }
  } else {
    url = `/${pagePath}`;
  }
  
  return url;
};

export default {
  useContextUrlSync,
  extractPageFromUrl,
  getSidebarHighlightPage,
  parseContextIds,
  buildSidebarUrl
};
