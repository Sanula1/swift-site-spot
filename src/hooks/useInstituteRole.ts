import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/utils/permissions';

/**
 * CRITICAL: Hook that ALWAYS returns the institute-specific role
 * This ensures all components use instituteUserType, not login userType
 * 
 * Usage: Replace all instances of user?.role with this hook
 */
export const useInstituteRole = (): UserRole => {
  const { user, selectedInstitute, selectedOrganization } = useAuth();

  // Priority 1: Institute-specific role (from instituteUserType in API)
  const instituteUserType = selectedInstitute?.instituteUserType || selectedInstitute?.userRole;
  if (instituteUserType) {
    const mappedRole = mapInstituteUserType(instituteUserType);
    console.log('🔐 Using institute role:', instituteUserType, '→', mappedRole);
    return mappedRole;
  }

  // Priority 2: Organization role (only when no institute is selected)
  if (selectedOrganization?.userRole) {
    console.log('🔐 Using organization role: OrganizationManager');
    return 'OrganizationManager';
  }

  // Priority 3: Global user role (fallback)
  const globalRole = (user?.role || 'Student') as UserRole;
  console.log('🔐 Using global role:', globalRole);
  return globalRole;
};

/**
 * Map instituteUserType from API to application UserRole
 */
function mapInstituteUserType(instituteUserType: string): UserRole {
  switch (instituteUserType) {
    case 'INSTITUTE_ADMIN':
      return 'InstituteAdmin';
    case 'STUDENT':
      return 'Student';
    case 'TEACHER':
      return 'Teacher';
    case 'ATTENDANCE_MARKER':
      return 'AttendanceMarker';
    case 'PARENT':
      return 'Parent';
    default:
      console.warn('⚠️ Unknown instituteUserType:', instituteUserType);
      return 'Student';
  }
}
