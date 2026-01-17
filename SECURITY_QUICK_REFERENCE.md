# 🔒 Security Quick Reference Guide

## Route Protection Usage

### Quick Import
```typescript
import ProtectedRoute, { 
  AdminRoute, 
  TeacherRoute, 
  StudentRoute, 
  ParentRoute 
} from '@/components/ProtectedRoute';
```

### Common Patterns

#### 1. Admin-Only Route
```typescript
<Route path="/admin-panel" element={
  <AdminRoute><AdminPanel /></AdminRoute>
} />
```

#### 2. Teacher Route (Institute + Class Required)
```typescript
<Route path="/grading" element={
  <TeacherRoute><GradingSystem /></TeacherRoute>
} />
```

#### 3. Student Route (Institute + Class Required)
```typescript
<Route path="/my-attendance" element={
  <StudentRoute><MyAttendance /></StudentRoute>
} />
```

#### 4. Parent Route (Child Required)
```typescript
<Route path="/child-dashboard" element={
  <ParentRoute><ChildDashboard /></ParentRoute>
} />
```

#### 5. Custom Protected Route
```typescript
<Route path="/custom" element={
  <ProtectedRoute
    allowedRoles={['Teacher', 'Admin']}
    requireInstitute={true}
    requireClass={true}
    requireSubject={false}
  >
    <CustomComponent />
  </ProtectedRoute>
} />
```

## URL Security Functions

### Sanitize User Input
```typescript
import { sanitizeUrlParam } from '@/utils/routeGuards';

const cleanInput = sanitizeUrlParam(userInput);
```

### Validate ID Format
```typescript
import { isValidId } from '@/utils/routeGuards';

if (isValidId(studentId)) {
  // Safe to use
}
```

### Extract URL Parameters Safely
```typescript
import { useRouteParams } from '@/utils/routeGuards';

const { studentId, classId } = useRouteParams(['studentId', 'classId']);
```

### Secure Navigation
```typescript
import { useSecureNavigate } from '@/utils/routeGuards';

const navigate = useSecureNavigate();
navigate('/safe-route'); // Sanitized automatically
```

## Security Hooks

### Route Guard Hook
```typescript
import { useRouteGuard } from '@/utils/routeGuards';

useRouteGuard({
  requireAuth: true,
  requireInstitute: true,
  allowedRoles: ['Teacher'],
  validateParams: (params) => isValidId(params.id)
});
```

### Session Validation Hook
```typescript
import { useSessionValidation } from '@/utils/routeGuards';

useSessionValidation(60000); // Check every 60 seconds
```

## Role Matrix

| Role | Access Level |
|------|-------------|
| SuperAdmin | All routes |
| InstituteAdmin | Institute routes + User management |
| Teacher | Institute + Class routes |
| Student | Limited routes (attendance, homework, results) |
| Parent | Child-related routes only |
| Driver | Transport routes only |

## Security Checklist

### Before Deploying New Route:
- [ ] Is route protected with ProtectedRoute?
- [ ] Are allowed roles specified?
- [ ] Is context validation set (institute, class, etc.)?
- [ ] Are URL parameters sanitized?
- [ ] Is custom validation needed?
- [ ] Are security logs enabled?

### Testing New Protected Route:
1. Test with correct role ✅
2. Test with wrong role ❌
3. Test without authentication ❌
4. Test with XSS in URL ❌
5. Test with SQL injection in URL ❌
6. Test with path traversal ❌

## Common Security Mistakes to Avoid

❌ **WRONG:**
```typescript
<Route path="/admin" element={<AdminPanel />} />
// No protection!
```

✅ **CORRECT:**
```typescript
<Route path="/admin" element={
  <AdminRoute><AdminPanel /></AdminRoute>
} />
```

❌ **WRONG:**
```typescript
const studentId = searchParams.get('id');
loadStudent(studentId); // Not sanitized!
```

✅ **CORRECT:**
```typescript
const { id } = useRouteParams(['id']);
if (id && isValidId(id)) {
  loadStudent(id);
}
```

## Emergency Response

### If Security Breach Detected:
1. Check console for 🚨 SECURITY ALERT messages
2. Identify affected route in logs
3. Verify user role and permissions
4. Check for suspicious URL parameters
5. Review recent navigation history
6. Clear user session if needed: `logout()`

### Suspicious Activity Indicators:
- 🚨 SECURITY ALERT in console
- ❌ Multiple access denied attempts
- ⚠️ Invalid ID format warnings
- 🔒 Repeated unauthorized access

## Performance Tips

- ✅ Use preset routes (AdminRoute, TeacherRoute, etc.) for common patterns
- ✅ Minimize custom validation functions
- ✅ Cache role checks in parent components
- ✅ Use `React.memo` for protected components
- ✅ Avoid nested ProtectedRoute components

## Quick Debugging

```typescript
// Check current user context
console.log({
  user: user?.email,
  role: user?.role,
  institute: selectedInstitute?.name,
  class: selectedClass?.name,
  subject: selectedSubject?.name
});

// Test URL sanitization
console.log(sanitizeUrlParam('<script>alert("test")</script>'));
// Output: scriptalerttest

// Validate ID
console.log(isValidId('123')); // true
console.log(isValidId('<script>')); // false
```

## Support & Maintenance

**Security Documentation:**
- Full guide: `ROUTING_SECURITY.md`
- Cache security: `INDEXEDDB_SECURITY_FIX.md`

**Key Files:**
- Protected Route: `src/components/ProtectedRoute.tsx`
- Route Guards: `src/utils/routeGuards.ts`
- App Routes: `src/App.tsx`
- Auth Context: `src/contexts/AuthContext.tsx`

**Need Help?**
Check console logs with these emojis:
- 🔒 Security operations
- ✅ Success
- ❌ Access denied
- 🚨 Security alert
- 🔐 Secure navigation
- 🔄 Redirect
- ⚠️ Warning

---

**Security Level:** 🔒 INDUSTRIAL GRADE  
**Status:** ✅ PRODUCTION READY  
**Last Updated:** October 14, 2025
