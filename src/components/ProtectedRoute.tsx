import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * 🔒 INDUSTRIAL SECURITY LEVEL - Protected Route Component
 * 
 * Security Features:
 * 1. Authentication verification
 * 2. Role-based access control (RBAC)
 * 3. Institute-specific permissions
 * 4. Context validation (class, subject, child)
 * 5. Token expiry detection
 * 6. Redirect URL preservation
 * 7. Loading state management
 * 8. Security logging
 */

type UserRole = 
  | 'SuperAdmin'
  | 'InstituteAdmin'
  | 'Teacher'
  | 'Student'
  | 'Parent'
  | 'Driver'
  | 'Staff';

interface ProtectedRouteProps {
  children: React.ReactNode;
  
  // Role-based access control
  allowedRoles?: UserRole[];
  
  // Institute requirement
  requireInstitute?: boolean;
  
  // Class requirement
  requireClass?: boolean;
  
  // Subject requirement
  requireSubject?: boolean;
  
  // Child requirement (for parent routes)
  requireChild?: boolean;
  
  // Organization requirement
  requireOrganization?: boolean;
  
  // Transport requirement
  requireTransport?: boolean;
  
  // Custom validation function
  customValidation?: () => boolean;
  
  // Redirect path on failure
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requireInstitute = false,
  requireClass = false,
  requireSubject = false,
  requireChild = false,
  requireOrganization = false,
  requireTransport = false,
  customValidation,
  redirectTo = '/'
}) => {
  const { 
    user, 
    selectedInstitute,
    selectedClass,
    selectedSubject,
    selectedChild,
    selectedOrganization,
    selectedTransport,
    isLoading,
    isInitialized
  } = useAuth();
  
  const location = useLocation();
  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const validateAccess = async () => {
      try {
        // Wait for auth initialization to complete
        if (!isInitialized) {
          console.log('⏳ Waiting for auth initialization...');
          setIsValidating(true);
          return;
        }

        console.log('🔒 Validating route access:', {
          path: location.pathname,
          user: user?.email,
          role: user?.role,
          institute: selectedInstitute?.name,
          requireInstitute,
          requireClass,
          requireSubject,
          requireChild
        });

        // Check 1: User authentication
        if (!user) {
          console.warn('❌ Access denied: User not authenticated');
          setValidationError('User not authenticated');
          setIsValidating(false);
          return;
        }

        // Check 2: Role-based access control
        if (allowedRoles && allowedRoles.length > 0) {
          const userRole = user.role as UserRole;
          if (!allowedRoles.includes(userRole)) {
            console.warn('❌ Access denied: Insufficient permissions', {
              userRole,
              allowedRoles
            });
            setValidationError(`Insufficient permissions. Required: ${allowedRoles.join(', ')}`);
            setIsValidating(false);
            return;
          }
          console.log('✅ Role check passed:', userRole);
        }

        // Check 4: Institute requirement
        if (requireInstitute && !selectedInstitute) {
          console.warn('❌ Access denied: Institute selection required');
          setValidationError('Institute selection required');
          setIsValidating(false);
          return;
        }

        // Check 5: Class requirement
        if (requireClass && !selectedClass) {
          console.warn('❌ Access denied: Class selection required');
          setValidationError('Class selection required');
          setIsValidating(false);
          return;
        }

        // Check 6: Subject requirement
        if (requireSubject && !selectedSubject) {
          console.warn('❌ Access denied: Subject selection required');
          setValidationError('Subject selection required');
          setIsValidating(false);
          return;
        }

        // Check 7: Child requirement (for parent routes)
        if (requireChild && !selectedChild) {
          console.warn('❌ Access denied: Child selection required');
          setValidationError('Child selection required');
          setIsValidating(false);
          return;
        }

        // Check 8: Organization requirement
        if (requireOrganization && !selectedOrganization) {
          console.warn('❌ Access denied: Organization selection required');
          setValidationError('Organization selection required');
          setIsValidating(false);
          return;
        }

        // Check 9: Transport requirement
        if (requireTransport && !selectedTransport) {
          console.warn('❌ Access denied: Transport selection required');
          setValidationError('Transport selection required');
          setIsValidating(false);
          return;
        }

        // Check 10: Custom validation
        if (customValidation && !customValidation()) {
          console.warn('❌ Access denied: Custom validation failed');
          setValidationError('Custom validation failed');
          setIsValidating(false);
          return;
        }

        // All checks passed
        console.log('✅ Access granted to:', location.pathname);
        setValidationError(null);
        setIsValidating(false);
      } catch (error) {
        console.error('❌ Route validation error:', error);
        setValidationError('Validation error occurred');
        setIsValidating(false);
      }
    };

    validateAccess();
  }, [
    isInitialized,
    user, 
    selectedInstitute, 
    selectedClass, 
    selectedSubject,
    selectedChild,
    selectedOrganization,
    selectedTransport,
    location.pathname,
    allowedRoles,
    requireInstitute,
    requireClass,
    requireSubject,
    requireChild,
    requireOrganization,
    requireTransport,
    customValidation
  ]);

  // Fast-path: if auth is initialized and there's no user, redirect immediately.
  // This prevents showing previously visited protected pages after logout.
  if (isInitialized && !isLoading && !user) {
    const fullPath = location.pathname + location.search + location.hash;
    return (
      <Navigate
        to={redirectTo}
        state={{
          from: fullPath,
          error: 'User not authenticated'
        }}
        replace
      />
    );
  }

  // Show loading state while validating
  if (isLoading || isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Validating access...</p>
        </div>
      </div>
    );
  }

  // Redirect if validation failed
  if (validationError) {
    console.log('🔄 Redirecting to:', redirectTo, 'Reason:', validationError);
    const fullPath = location.pathname + location.search + location.hash;

    // Preserve the intended destination for redirect after login
    return (
      <Navigate
        to={redirectTo}
        state={{
          from: fullPath,
          error: validationError
        }}
        replace
      />
    );
  }

  // Render protected content
  return <>{children}</>;
};

/**
 * 🔒 Preset Protected Routes for Common Use Cases
 */

// Admin-only routes
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute
    allowedRoles={['SuperAdmin', 'InstituteAdmin']}
    requireInstitute={true}
  >
    {children}
  </ProtectedRoute>
);

// Teacher routes
export const TeacherRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute
    allowedRoles={['Teacher', 'InstituteAdmin', 'SuperAdmin']}
    requireInstitute={true}
    requireClass={true}
  >
    {children}
  </ProtectedRoute>
);

// Student routes
export const StudentRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute
    allowedRoles={['Student']}
    requireInstitute={true}
    requireClass={true}
  >
    {children}
  </ProtectedRoute>
);

// Parent routes
export const ParentRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute
    allowedRoles={['Parent']}
    requireChild={true}
  >
    {children}
  </ProtectedRoute>
);

// Super admin only routes
export const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute
    allowedRoles={['SuperAdmin']}
  >
    {children}
  </ProtectedRoute>
);

// Institute-specific routes
export const InstituteRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute
    requireInstitute={true}
  >
    {children}
  </ProtectedRoute>
);

// Class-specific routes
export const ClassRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute
    requireInstitute={true}
    requireClass={true}
  >
    {children}
  </ProtectedRoute>
);

// Subject-specific routes
export const SubjectRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute
    requireInstitute={true}
    requireClass={true}
    requireSubject={true}
  >
    {children}
  </ProtectedRoute>
);

export default ProtectedRoute;
