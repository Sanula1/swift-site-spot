
import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useAppNavigation = () => {
  const { currentChildId, selectedChild } = useAuth();

  // Router-agnostic navigation that works even before Router is ready
  const navigateToPage = useCallback((page: string) => {
    console.log('Navigating to page:', page);
    
    const routeMap: Record<string, string> = {
      'dashboard': '/',
      'institutes': '/institutes',
      'institute-users': '/institutes/users', 
      'institute-classes': '/institutes/classes',
      'organizations': '/organizations',
      'profile': '/profile',
      'users': '/users',
      'students': '/students',
      'teachers': '/teachers',
      'parents': '/parents',
      'classes': '/classes',
      'subjects': '/subjects',
      'grades': '/grades',
      'grading': '/grading',
      'attendance': '/attendance',
      'my-attendance': '/my-attendance',
      'daily-attendance': '/daily-attendance',
      
      'attendance-markers': '/attendance-markers',
      'qr-attendance': '/qr-attendance',
      'institute-mark-attendance': '/institute-mark-attendance',
      'lectures': '/lectures',
      'live-lectures': '/live-lectures',
      'homework': '/homework',
      'homework-submissions': '/homework-submissions',
      'exams': '/exams',
      'results': '/results',
      'select-institute': '/select-institute',
      'select-class': '/select-class',
      'select-subject': '/select-subject',
      'parent-children': '/parent-children',
      'teacher-students': '/teacher-students',
      'teacher-homework': '/teacher-homework',
      'teacher-exams': '/teacher-exams',
      'teacher-lectures': '/teacher-lectures',
      'institute-lectures': '/institute-lectures',
      'settings': '/settings',
      'appearance': '/appearance',
      'institute-details': '/institute-details',
      'gallery': '/gallery',
      'institute-payments': '/institute-payments',
      'subject-payments': '/subject-payments',
      'subject-pay-submission': '/subject-pay-submission',
      'unverified-students': '/unverified-students',
      'verify-image': '/verify-image',
      'enroll-class': '/enroll-class',
      'enroll-subject': '/enroll-subject',
      'free-lectures': '/free-lectures',
      'institute-profile': '/institute-profile',
      'sms': '/sms',
      'sms-history': '/sms-history',
      'system-payment': '/payments',
      'payments': '/payments',
      'transport': '/transport',
      'transport-attendance': '/transport/:transportId/attendance',
      'my-children': '/my-children',
      // Child routes (support both legacy and new keys)
      'child-dashboard': '/child/:childId/dashboard',
      'child-results-page': '/child/:childId/results',
      'child-attendance-page': '/child/:childId/attendance',
      'child-transport': '/child/:childId/transport',
      // Sidebar keys
      'child-results': '/child/:childId/results',
      'child-attendance': '/child/:childId/attendance'
    };
    
    let route = routeMap[page] || `/${page}`;

    // Replace dynamic params
    if (route.includes(':childId')) {
      const cid = (currentChildId ?? selectedChild?.id) as string | undefined;
      route = cid ? route.replace(':childId', String(cid)) : '/my-children';
    }

    try {
      // Prefer history API without reload
      window.history.pushState({}, '', route);
      // Notify listeners that rely on pathname
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (e) {
      // Fallback
      window.location.assign(route);
    }
  }, [currentChildId, selectedChild?.id]);

  const getPageFromPath = useCallback((pathname: string): string => {
    if (pathname === '/') return 'dashboard';
    if (pathname === '/institutes/users') return 'institute-users';
    if (pathname === '/institutes/classes') return 'institute-classes';
    if (pathname === '/subject-pay-submission') return 'subject-pay-submission';
    return pathname.replace(/^\//, '');
  }, []);

  return {
    navigateToPage,
    getPageFromPath
  };
};
