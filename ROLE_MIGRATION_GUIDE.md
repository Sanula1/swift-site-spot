# CRITICAL: Institute Role Migration Guide

## Problem
The application was using `user?.role` (from login) instead of `instituteUserType` (from selected institute API).

## Solution
Created `useInstituteRole()` hook that ALWAYS uses the institute-specific role.

## Migration Steps

### 1. Import the hook
```tsx
import { useInstituteRole } from '@/hooks/useInstituteRole';
```

### 2. Replace all instances
```tsx
// ❌ WRONG - Uses login role
const userRole = user?.role;

// ✅ CORRECT - Uses instituteUserType
const userRole = useInstituteRole();
```

### 3. Files that MUST be updated
- ✅ src/components/Dashboard.tsx (partially done)
- ❌ src/components/AppContent.tsx
- ❌ src/components/Classes.tsx  
- ❌ src/components/Students.tsx
- ❌ src/components/Teachers.tsx
- ❌ src/components/Subjects.tsx
- ❌ src/components/Attendance.tsx
- ❌ src/components/AttendanceMarkers.tsx
- ❌ src/components/ClassSelector.tsx
- ❌ src/components/Homework.tsx
- ❌ src/components/Exams.tsx
- ❌ src/components/Results.tsx
- ❌ src/components/Lectures.tsx
- ❌ src/components/Grading.tsx
- ❌ src/components/Parents.tsx
- ❌ src/components/QRAttendance.tsx
- ❌ src/components/QRCodeScanner.tsx
- And ~30 more component files

### 4. Exception: Global checks
Some checks should still use `user?.role` (not institute role):
- SystemAdmin checks
- OrganizationManager checks (when not in institute context)

```tsx
// Global role check (correct usage)
if (user?.role === 'SystemAdmin') {
  // System admin features
}

// Institute role check (use hook)
const userRole = useInstituteRole();
if (userRole === 'InstituteAdmin') {
  // Institute admin features
}
```

## API Response Mapping
```json
{
  "instituteUserType": "STUDENT" → mapped to → "Student"
  "instituteUserType": "TEACHER" → mapped to → "Teacher"  
  "instituteUserType": "INSTITUTE_ADMIN" → mapped to → "InstituteAdmin"
  "instituteUserType": "ATTENDANCE_MARKER" → mapped to → "AttendanceMarker"
}
```

## Testing
After each component update:
1. Login as user with different roles in different institutes
2. Select institute
3. Verify permissions match `instituteUserType`
4. Check console for: "🔐 Using institute role: [TYPE] → [MAPPED]"
