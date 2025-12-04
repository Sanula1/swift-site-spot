# Remaining Components with Direct fetch() Calls

## Overview
After fixing InstituteSelector, there are still **11 unique components** using direct `fetch()` calls instead of the cached client. However, many of these are **mutation operations** (POST/PUT/DELETE) which should NOT be cached.

## Important Note: GET vs Mutations

### ✅ Should Use cachedApiClient (GET requests):
- Reading data that rarely changes
- List/index endpoints
- Detail/show endpoints
- Data that can be reused across page navigations

### ❌ Should NOT Use cachedApiClient (Mutations):
- POST requests (creating data)
- PUT/PATCH requests (updating data)
- DELETE requests (deleting data)
- Any operation that changes server state

## Components Analysis

### 1. ✅ HIGH PRIORITY - Should Be Cached (GET Requests)

#### `src/components/Teachers.tsx` (Line 148)
```typescript
// Reading teachers list
const response = await fetch(url, { method: 'GET' });
```
**Action Required:** Convert to cachedApiClient
**Priority:** HIGH
**Reason:** Teachers list doesn't change frequently

#### `src/components/Institutes.tsx` (Lines 85, 137)
```typescript
// Line 85: Fetching institutes list
const response = await fetch(`${baseUrl}/institutes?${queryParams}`, { method: 'GET' });

// Line 137: Fetching single institute details
const response = await fetch(`${baseUrl}/institutes/${id}`, { method: 'GET' });
```
**Action Required:** Convert to cachedApiClient
**Priority:** HIGH
**Reason:** Institute data rarely changes, benefits from caching

#### `src/components/EnrollClass.tsx` (Line 66)
```typescript
// Checking if student is already enrolled
const enrolledResponse = await fetch(
  `${getBaseUrl()}/institute-classes/${selectedInstitute.id}/student/${user.id}`,
  { method: 'GET' }
);
```
**Action Required:** Convert to cachedApiClient
**Priority:** MEDIUM
**Reason:** Enrollment status doesn't change frequently

#### `src/components/FreeLectures.tsx` (Line 112)
```typescript
// Fetching free lectures
const response = await fetch(url, { method: 'GET' });
```
**Action Required:** Convert to cachedApiClient
**Priority:** MEDIUM
**Reason:** Free lectures can be cached with shorter TTL

#### `src/components/InstituteUsers.tsx` (Line 125)
```typescript
// Fetching institute users
const response = await fetch(`/api/users`, { method: 'GET' });
```
**Action Required:** Convert to cachedApiClient
**Priority:** MEDIUM
**Reason:** User lists benefit from caching

### 2. ⚠️ LOW PRIORITY - Mutations (Should NOT Be Cached)

#### `src/components/forms/CreateSubjectForm.tsx` (Line 129)
```typescript
// POST - Creating new subject
const response = await fetch(`${baseUrl}/subjects`, {
  method: 'POST',
  body: JSON.stringify(formData)
});
```
**Action Required:** NONE (correct as-is)
**Priority:** N/A
**Reason:** POST operation should not be cached

#### `src/components/forms/CreateParentForm.tsx` (Line 129)
```typescript
// POST - Creating new parent
const response = await fetch(`${baseUrl}/parents`, {
  method: 'POST',
  body: JSON.stringify(formData)
});
```
**Action Required:** NONE (correct as-is)
**Priority:** N/A
**Reason:** POST operation should not be cached

#### `src/components/forms/CreateCourseForm.tsx` (Line 104)
```typescript
// POST - Creating course with image
const response = await fetch(`${baseUrl2}/organization/api/v1/causes/with-image`, {
  method: 'POST',
  body: formDataToSend
});
```
**Action Required:** NONE (correct as-is)
**Priority:** N/A
**Reason:** POST operation should not be cached

#### `src/components/forms/CreateOrganizationLectureForm.tsx` (Line 135)
```typescript
// POST - Creating lecture with documents
const response = await fetch(
  `${baseUrl2}/organization/api/v1/lectures/with-documents/${formData.causeId}`,
  { method: 'POST', body: formDataToSend }
);
```
**Action Required:** NONE (correct as-is)
**Priority:** N/A
**Reason:** POST operation should not be cached

#### `src/components/forms/UpdateOrganizationLectureForm.tsx` (Line 90)
```typescript
// PUT - Updating lecture
const response = await fetch(
  `${baseUrl2}/organization/api/v1/lectures/${lecture.lectureId}/with-documents`,
  { method: 'PUT', body: formDataToSend }
);
```
**Action Required:** NONE (correct as-is)
**Priority:** N/A
**Reason:** PUT operation should not be cached

#### `src/components/forms/UpdateHomeworkForm.tsx` (Line 50)
```typescript
// PUT - Updating homework
const response = await fetch(url, {
  method: 'PUT',
  body: JSON.stringify(updatedData)
});
```
**Action Required:** NONE (correct as-is)
**Priority:** N/A
**Reason:** PUT operation should not be cached

#### `src/components/forms/UpdateExamForm.tsx` (Line 98)
```typescript
// PUT - Updating exam
const response = await fetch(`${getBaseUrl()}/institute-class-subject-exams/${exam.id}`, {
  method: 'PUT',
  body: JSON.stringify(formData)
});
```
**Action Required:** NONE (correct as-is)
**Priority:** N/A
**Reason:** PUT operation should not be cached

#### `src/components/Institutes.tsx` (Lines 176, 241, 279)
```typescript
// Line 176: POST - Creating institute
const response = await fetch(`${baseUrl}/institutes`, {
  method: 'POST',
  body: JSON.stringify(formData)
});

// Line 241: PUT - Updating institute
const response = await fetch(`${baseUrl}/institutes/${selectedInstitute.id}`, {
  method: 'PUT',
  body: JSON.stringify(formData)
});

// Line 279: DELETE - Deleting institute
const response = await fetch(`${baseUrl}/institutes/${instituteId}`, {
  method: 'DELETE'
});
```
**Action Required:** NONE (correct as-is)
**Priority:** N/A
**Reason:** POST/PUT/DELETE operations should not be cached

### 3. 🤔 MEDIUM PRIORITY - Assignment/Relationship Operations

#### `src/components/forms/AssignSubjectToClassForm.tsx` (Lines 114, 158, 172, 268)
**Needs Investigation:** Determine if these are GET (fetch assignments) or POST (create assignments)

#### `src/components/forms/AssignSubjectStudentsDialog.tsx` (Lines 80, 137)
**Needs Investigation:** Determine if these are GET (fetch students) or POST (assign students)

#### `src/components/forms/AssignStudentsDialog.tsx` (Line 82)
**Needs Investigation:** Determine if GET or POST

**Action Required:** Read these files to determine operation type

## Summary Statistics

### Total Components with fetch(): 11 unique files

#### By Priority:
- **HIGH Priority (Should Cache):** 5 files (GET requests)
- **LOW Priority (Correct as-is):** 9 locations (POST/PUT/DELETE)
- **MEDIUM Priority (Needs Investigation):** 7 locations (Assignment operations)

#### By Operation Type:
- **GET requests:** 5-12 locations (need caching)
- **POST requests:** ~5 locations (correct as-is)
- **PUT requests:** ~4 locations (correct as-is)
- **DELETE requests:** ~1 location (correct as-is)
- **Unknown:** ~7 locations (need investigation)

## Implementation Plan

### Phase 1: High Priority GET Requests (2-3 hours)

1. **Teachers.tsx**
   ```typescript
   // Before:
   const response = await fetch(url, { method: 'GET' });
   
   // After:
   const data = await cachedApiClient.get('/teachers', params, {
     ttl: 15,
     userId: user?.id,
     role: userRole,
     instituteId: currentInstituteId
   });
   ```

2. **Institutes.tsx (GET operations only)**
   ```typescript
   // Fetching list:
   const data = await cachedApiClient.get('/institutes', { page, limit }, {
     ttl: 30,
     userId: user?.id,
     role: userRole
   });
   
   // Fetching single:
   const data = await cachedApiClient.get(`/institutes/${id}`, {}, {
     ttl: 30,
     userId: user?.id,
     role: userRole
   });
   ```

3. **EnrollClass.tsx**
   ```typescript
   const enrollmentData = await cachedApiClient.get(
     `/institute-classes/${selectedInstitute.id}/student/${user.id}`,
     {},
     {
       ttl: 10, // Short TTL since enrollment can change
       userId: user?.id,
       role: userRole,
       instituteId: selectedInstitute.id
     }
   );
   ```

4. **FreeLectures.tsx**
   ```typescript
   const lectures = await cachedApiClient.get('/lectures/free', params, {
     ttl: 5, // Short TTL for frequently updated content
     userId: user?.id,
     role: userRole
   });
   ```

5. **InstituteUsers.tsx**
   ```typescript
   const users = await cachedApiClient.get('/api/users', params, {
     ttl: 15,
     userId: user?.id,
     role: userRole,
     instituteId: currentInstituteId
   });
   ```

### Phase 2: Investigation (1 hour)

Read and analyze assignment-related components:
- AssignSubjectToClassForm.tsx
- AssignSubjectStudentsDialog.tsx
- AssignStudentsDialog.tsx

Determine which are GET (should cache) vs POST (should not cache).

### Phase 3: Testing (30 minutes)

For each converted component:
1. Test initial load (should make API call)
2. Navigate away and return (should use cache)
3. Force refresh (should bypass cache)
4. Check console logs for cache hits
5. Verify Network tab shows reduced calls

### Phase 4: Documentation (15 minutes)

Update this file with:
- Actual operation types for investigated components
- Performance metrics after conversion
- Final component count

## Expected Impact

### Before (Current State):
- **GET requests using direct fetch:** ~5-12 components
- **Unnecessary API calls:** ~50-100 per user session
- **Page load delays:** 200-500ms per navigation

### After (All GET requests cached):
- **GET requests using cachedApiClient:** ~5-12 components
- **API calls reduced by:** 80-95%
- **Page load improvement:** 20-50x faster (cached)

## Testing Checklist

For each converted component:
- [ ] Import cachedApiClient and useInstituteRole
- [ ] Replace fetch() with cachedApiClient.get()
- [ ] Add user context (userId, role, instituteId)
- [ ] Set appropriate TTL
- [ ] Test cache miss (first load)
- [ ] Test cache hit (second load)
- [ ] Verify console logs
- [ ] Check Network tab
- [ ] Test force refresh
- [ ] Verify TypeScript compiles
- [ ] No runtime errors

## Code Pattern Template

```typescript
// 1. Add imports
import { cachedApiClient } from '@/api/cachedClient';
import { useInstituteRole } from '@/hooks/useInstituteRole';

// 2. Add hooks
const Component = () => {
  const { user } = useAuth();
  const userRole = useInstituteRole();
  const currentInstituteId = useCurrentInstituteId(); // if applicable
  
  // 3. Replace fetch with cachedApiClient
  const loadData = async (forceRefresh = false) => {
    try {
      const data = await cachedApiClient.get(
        '/endpoint',
        { page: 1, limit: 10, ...otherParams },
        {
          ttl: 15, // Adjust based on data volatility
          forceRefresh,
          userId: user?.id,
          role: userRole || 'User',
          instituteId: currentInstituteId // if applicable
        }
      );
      
      setData(data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      });
    }
  };
  
  // 4. Add force refresh support (optional)
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData(true); // force refresh
    setIsRefreshing(false);
  };
}
```

## TTL Guidelines

Based on data volatility:

- **30 minutes:** Static data (institutes, teachers, courses)
- **15 minutes:** Semi-static data (classes, subjects, users)
- **10 minutes:** Frequently changing (enrollments, assignments)
- **5 minutes:** Real-time data (lectures, attendance)
- **1 minute:** Live data (notifications, messages)

## Next Steps

1. ✅ **DONE:** InstituteSelector.tsx (already fixed)
2. **TODO:** Teachers.tsx (HIGH priority)
3. **TODO:** Institutes.tsx GET operations (HIGH priority)
4. **TODO:** EnrollClass.tsx (MEDIUM priority)
5. **TODO:** FreeLectures.tsx (MEDIUM priority)
6. **TODO:** InstituteUsers.tsx (MEDIUM priority)
7. **TODO:** Investigate assignment forms
8. **TODO:** Test all conversions
9. **TODO:** Update documentation with final metrics

## Success Criteria

- [ ] All GET requests use cachedApiClient
- [ ] All POST/PUT/DELETE requests use direct fetch (correct)
- [ ] Console logs show cache hits/misses
- [ ] Network tab shows 80-95% reduction in API calls
- [ ] TypeScript: 0 errors
- [ ] No runtime errors
- [ ] User experience: Instant page navigation
- [ ] Documentation: Complete and accurate

---

**Status:** Phase 1 - InstituteSelector Complete ✅  
**Next:** Convert Teachers.tsx and Institutes.tsx GET operations  
**Estimated Time:** 2-4 hours total  
**Priority:** HIGH (significant performance impact)
