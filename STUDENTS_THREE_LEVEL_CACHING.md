# Students Component - Three-Level Caching System

## Overview
The Students component implements a **three-level caching hierarchy** based on user selection:
1. **Institute Level** - All students in an institute
2. **Class Level** - Students in a specific class within an institute
3. **Subject Level** - Students in a specific subject within a class

## Problem Statement
The component was refreshing data even when cache existed because:
- The `contextKey` included all three IDs even when some were `undefined`
- This caused a mismatch with the cache context stored in the API
- Different selection levels have different cache contexts

## Solution: Dynamic Context Key

### Previous Implementation (Broken)
```typescript
// Always included all three IDs, even if undefined
const contextKey = `${selectedInstitute?.id}-${selectedClass?.id}-${selectedSubject?.id}`;

// Examples:
// Class level: "123-456-undefined" ❌
// Subject level: "123-456-789" ✅
```

### New Implementation (Fixed)
```typescript
// Build contextKey based on ACTUAL selection level
const contextKey = useMemo(() => {
  if (selectedSubject?.id && selectedClass?.id && selectedInstitute?.id) {
    // Subject level: institute + class + subject
    return `subject-${selectedInstitute.id}-${selectedClass.id}-${selectedSubject.id}`;
  } else if (selectedClass?.id && selectedInstitute?.id) {
    // Class level: institute + class only
    return `class-${selectedInstitute.id}-${selectedClass.id}`;
  } else if (selectedInstitute?.id) {
    // Institute level: institute only
    return `institute-${selectedInstitute.id}`;
  }
  return 'global'; // Global students (non-institute users)
}, [selectedInstitute?.id, selectedClass?.id, selectedSubject?.id]);
```

## Three Cache Contexts

### 1. Subject Level (Most Specific)
**When**: User selects Institute + Class + Subject

**Context Key**: `subject-{instituteId}-{classId}-{subjectId}`

**API Call**:
```typescript
enhancedCachedClient.get(
  `/institute-users/institute/${instituteId}/users/STUDENT/class/${classId}/subject/${subjectId}`,
  {},
  {
    ttl: CACHE_TTL.STUDENTS, // 60 minutes
    forceRefresh: false,
    userId: user?.id,
    role: userRole,
    instituteId: selectedInstitute.id,
    classId: selectedClass.id,
    subjectId: selectedSubject.id  // ← Three-part context
  }
);
```

**Cache Key Generated**:
- Includes: `instituteId`, `classId`, `subjectId`
- Example: `subject-123-456-789`

**Use Case**: Teacher viewing students enrolled in "Math" subject for "Grade 10-A"

---

### 2. Class Level (Medium Specificity)
**When**: User selects Institute + Class (no subject)

**Context Key**: `class-{instituteId}-{classId}`

**API Call**:
```typescript
enhancedCachedClient.get(
  `/institute-users/institute/${instituteId}/users/STUDENT/class/${classId}`,
  {},
  {
    ttl: CACHE_TTL.STUDENTS, // 60 minutes
    forceRefresh: false,
    userId: user?.id,
    role: userRole,
    instituteId: selectedInstitute.id,
    classId: selectedClass.id  // ← Two-part context (no subjectId)
  }
);
```

**Cache Key Generated**:
- Includes: `instituteId`, `classId`
- Example: `class-123-456`

**Use Case**: Admin viewing all students in "Grade 10-A" regardless of subject

---

### 3. Institute Level (Least Specific)
**When**: User selects Institute only (future feature)

**Context Key**: `institute-{instituteId}`

**API Call**: (Not yet implemented, but structure would be)
```typescript
enhancedCachedClient.get(
  `/institute-users/institute/${instituteId}/users/STUDENT`,
  {},
  {
    ttl: CACHE_TTL.STUDENTS,
    forceRefresh: false,
    userId: user?.id,
    role: userRole,
    instituteId: selectedInstitute.id  // ← One-part context
  }
);
```

**Cache Key Generated**:
- Includes: `instituteId` only
- Example: `institute-123`

**Use Case**: Principal viewing all students across all classes in the institute

---

### 4. Global Level (Non-Institute Users)
**When**: Student/Parent user (no institute selection)

**Context Key**: `global`

**API Call**:
```typescript
cachedApiClient.get('/students', { page, limit }, { ttl: 15 });
```

**Use Case**: Student viewing their own profile or parent viewing children

---

## Context Key Matching

### Why Matching Matters
The `contextKey` in the component **must match** the cache context in the API to prevent duplicate loads:

| Selection | Context Key | Cache Context in API | Match? |
|-----------|-------------|---------------------|--------|
| Inst + Class + Subject | `subject-123-456-789` | `{instituteId: 123, classId: 456, subjectId: 789}` | ✅ YES |
| Inst + Class | `class-123-456` | `{instituteId: 123, classId: 456}` | ✅ YES |
| Inst only | `institute-123` | `{instituteId: 123}` | ✅ YES |
| **OLD (Broken)** Inst + Class | `123-456-undefined` | `{instituteId: 123, classId: 456}` | ❌ NO |

## Auto-Load Logic

```typescript
useEffect(() => {
  if (shouldUseInstituteApi && contextKey !== lastLoadedContext) {
    setLastLoadedContext(contextKey);
    
    if (selectedSubject && selectedClass && selectedInstitute) {
      // SUBJECT LEVEL: Load subject students
      fetchInstituteSubjectStudents(false); // forceRefresh: false
    } else if (selectedClass && selectedInstitute) {
      // CLASS LEVEL: Load class students
      fetchInstituteClassStudents(false); // forceRefresh: false
    }
  }
}, [contextKey, shouldUseInstituteApi]);
```

### Flow Breakdown

#### First Visit (No Cache)
1. User selects: Institute → Class → Subject
2. `contextKey` = `subject-123-456-789`
3. `lastLoadedContext` = `''` (empty)
4. Condition: `contextKey !== lastLoadedContext` ✅ TRUE
5. Calls `fetchInstituteSubjectStudents(false)`
6. API check cache → Not found
7. Fetch from backend → Store in cache (60 min TTL)
8. Update `lastLoadedContext` = `subject-123-456-789`

#### Second Visit (Cache Exists)
1. User navigates: Students → Lectures → **Back to Students**
2. `contextKey` = `subject-123-456-789` (same as before)
3. `lastLoadedContext` = `subject-123-456-789`
4. Condition: `contextKey !== lastLoadedContext` ❌ FALSE
5. **Does NOT call fetch function** (already loaded for this context)
6. Component displays cached data from state

#### Context Change (Different Selection)
1. User changes: Subject A → Subject B
2. `contextKey` = `subject-123-456-999` (new subjectId)
3. `lastLoadedContext` = `subject-123-456-789` (old)
4. Condition: `contextKey !== lastLoadedContext` ✅ TRUE
5. Calls `fetchInstituteSubjectStudents(false)`
6. API checks cache with new context → May find cache if viewed before
7. If cache exists: Load from IndexedDB (instant)
8. If no cache: Fetch from backend
9. Update `lastLoadedContext` = `subject-123-456-999`

## Debug Logging

Console logs added to track caching behavior:

```typescript
// In useEffect
console.log('[Students] useEffect triggered:', {
  shouldUseInstituteApi,
  contextKey,
  lastLoadedContext,
  needsLoad: contextKey !== lastLoadedContext,
  selectedInstitute: selectedInstitute?.id,
  selectedClass: selectedClass?.id,
  selectedSubject: selectedSubject?.id
});

// In fetch functions
console.log('[Students] Fetching CLASS students:', {
  forceRefresh,
  instituteId,
  classId,
  contextKey
});

console.log('[Students] Fetching SUBJECT students:', {
  forceRefresh,
  instituteId,
  classId,
  subjectId,
  contextKey
});
```

### What to Look For

**Good behavior (cache working):**
```
[Students] useEffect triggered: { contextKey: "subject-123-456-789", needsLoad: false }
// No fetch function calls = using previous data
```

**Cache miss (needs to load):**
```
[Students] useEffect triggered: { contextKey: "subject-123-456-789", needsLoad: true }
[Students] Auto-loading SUBJECT students from cache...
[Students] Fetching SUBJECT students: { forceRefresh: false, contextKey: "subject-123-456-789" }
[enhancedCachedClient] Cache HIT for /institute-users/...
```

**Force refresh:**
```
[Students] Fetching SUBJECT students: { forceRefresh: true, contextKey: "subject-123-456-789" }
[enhancedCachedClient] Force refresh - bypassing cache
```

## Cache Storage

### IndexedDB Structure
```javascript
// Database: apiCache
// Store: requests
{
  key: "GET:/institute-users/institute/123/users/STUDENT/class/456/subject/789?userId=1&role=Teacher&instituteId=123&classId=456&subjectId=789",
  value: {
    data: [...students],
    meta: { total: 30, page: 1, limit: 50, totalPages: 1 },
    timestamp: 1699488000000,
    expiresAt: 1699491600000 // +60 minutes
  }
}
```

### Cache TTL
- **Students**: 60 minutes (`CACHE_TTL.STUDENTS`)
- Configured in `src/config/cacheTTL.ts`

## Testing Scenarios

### Test 1: Subject Level Caching
1. Select Institute → Class → Subject A
2. Wait for data to load (first API call)
3. Navigate to Lectures tab
4. Navigate back to Students tab
5. **Expected**: Instant load from cache, no API call
6. **Verify**: Console shows `needsLoad: false`

### Test 2: Class Level Caching
1. Select Institute → Class (no subject)
2. Wait for data to load
3. Navigate to Exams tab
4. Navigate back to Students tab
5. **Expected**: Instant load from cache
6. **Verify**: Console shows `needsLoad: false`

### Test 3: Context Switching
1. Load Subject A students (cache created)
2. Switch to Subject B (new context)
3. **Expected**: New API call (different cache context)
4. Return to Subject A
5. **Expected**: Instant load from Subject A cache
6. **Verify**: Console shows different `contextKey` values

### Test 4: Force Refresh
1. Load students (cache created)
2. Click "Refresh" button
3. **Expected**: API call with `forceRefresh: true`
4. **Verify**: Console shows `forceRefresh: true`

## Benefits

✅ **Proper cache isolation** - Each selection level has its own cache
✅ **No duplicate loads** - Same context uses cached data
✅ **Context-aware** - Switching subjects/classes correctly identifies new data
✅ **Debugging enabled** - Console logs show cache behavior
✅ **Efficient memory** - Only stores what's actually selected
✅ **Consistent pattern** - Matches Lectures/Exams/Homework components

## Implementation Date
November 8, 2025

## Status
✅ **IMPLEMENTED & TESTED**
