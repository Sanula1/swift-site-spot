# 📋 Caching Migration Checklist

Use this checklist when converting any component to use caching with enhancedCachedClient.

---

## 🎯 Quick Start Checklist

### ✅ Phase 1: Preparation (2 minutes)

- [ ] Identify all `fetch()` calls in the component
- [ ] Determine appropriate `CACHE_TTL` value based on data volatility
- [ ] Identify required context (userId, role, instituteId, classId, subjectId)
- [ ] Check if component has user authentication (`useAuth` hook)

### ✅ Phase 2: Import Updates (1 minute)

- [ ] Remove: `import { getBaseUrl } from '@/contexts/utils/auth.api';`
- [ ] Add: `import { enhancedCachedClient } from '@/api/enhancedCachedClient';`
- [ ] Add: `import { CACHE_TTL } from '@/config/cacheTTL';`
- [ ] Add: `import { useInstituteRole } from '@/hooks/useInstituteRole';` (if not present)
- [ ] Add: `import { useAuth } from '@/contexts/AuthContext';` (if not present)

### ✅ Phase 3: Context Setup (1 minute)

Add at top of component function:
```typescript
- [ ] const { user } = useAuth();
- [ ] const userRole = useInstituteRole();
```

### ✅ Phase 4: Function Transformation (3-5 minutes per function)

For each fetch function:

#### Step 1: Add forceRefresh parameter
- [ ] Change: `const fetchData = async () => {`
- [ ] To: `const fetchData = async (forceRefresh = false) => {`

#### Step 2: Remove old fetch logic
- [ ] Remove: `const token = localStorage.getItem('access_token');`
- [ ] Remove: `const baseUrl = getBaseUrl();`
- [ ] Remove: `getApiHeaders()` helper function calls
- [ ] Remove: Manual header construction
- [ ] Remove: `const response = await fetch(...)`
- [ ] Remove: `if (!response.ok)` checks
- [ ] Remove: `const data = await response.json()`

#### Step 3: Add cached API call
```typescript
- [ ] const data = await enhancedCachedClient.get(
- [ ]   `/endpoint/path`,  // Remove getBaseUrl(), keep leading /
- [ ]   {},                 // Query params (usually empty)
- [ ]   {
- [ ]     ttl: CACHE_TTL.APPROPRIATE_TYPE,
- [ ]     forceRefresh,
- [ ]     userId: user?.id,
- [ ]     role: userRole,
- [ ]     // Add context as needed:
- [ ]     // instituteId: selectedInstitute?.id,
- [ ]     // classId: selectedClass?.id,
- [ ]     // subjectId: selectedSubject?.id
- [ ]   }
- [ ] );
```

#### Step 4: Update data handling
- [ ] Keep existing `setData(data)` or `setData(data.data)` logic
- [ ] Keep existing error handling in catch block
- [ ] Keep existing loading state management

### ✅ Phase 5: Update Function Calls (2 minutes)

#### In useEffect hooks
- [ ] Change: `fetchData();`
- [ ] To: `fetchData(false);`

#### In refresh handlers
```typescript
- [ ] const handleRefresh = () => {
- [ ]   fetchData(true);  // Force fresh data
- [ ] };
```

### ✅ Phase 6: Testing (5 minutes)

#### Network Testing
- [ ] Open DevTools → Network tab
- [ ] Navigate to component
- [ ] Verify API request appears
- [ ] Refresh page
- [ ] Verify NO new API request (cache hit)
- [ ] Click refresh button
- [ ] Verify new API request appears (forceRefresh)

#### Cache Verification
- [ ] Open DevTools → Application tab
- [ ] Navigate to IndexedDB → cached
- [ ] Verify data is stored
- [ ] Check cache key includes proper context

#### Context Isolation Testing
- [ ] Switch between institutes/classes/subjects
- [ ] Verify separate cache entries for each context
- [ ] Verify no data leakage between contexts

#### Cooldown Testing
- [ ] Click refresh button rapidly (5+ times quickly)
- [ ] Verify only ONE request fires
- [ ] Verify cooldown toast notification appears

---

## 🎨 Code Templates

### Template 1: Simple GET Request
```typescript
// Before
const fetchData = async () => {
  setLoading(true);
  try {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${getBaseUrl()}/endpoint`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) throw new Error('Failed');
    const data = await response.json();
    setData(data);
  } catch (error) {
    console.error('Error:', error);
    toast({ title: "Error", variant: "destructive" });
  } finally {
    setLoading(false);
  }
};

// After
const fetchData = async (forceRefresh = false) => {
  setLoading(true);
  try {
    const data = await enhancedCachedClient.get(
      `/endpoint`,
      {},
      {
        ttl: CACHE_TTL.APPROPRIATE_TYPE,
        forceRefresh,
        userId: user?.id,
        role: userRole
      }
    );
    setData(data);
  } catch (error) {
    console.error('Error:', error);
    toast({ title: "Error", variant: "destructive" });
  } finally {
    setLoading(false);
  }
};
```

### Template 2: GET with Dynamic Parameters
```typescript
// Before
const fetchData = async (id: string) => {
  setLoading(true);
  try {
    const response = await fetch(
      `${getBaseUrl()}/endpoint/${id}`,
      { headers: getApiHeaders() }
    );
    
    if (!response.ok) throw new Error('Failed');
    const data = await response.json();
    setData(data);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    setLoading(false);
  }
};

// After
const fetchData = async (id: string, forceRefresh = false) => {
  setLoading(true);
  try {
    const data = await enhancedCachedClient.get(
      `/endpoint/${id}`,
      {},
      {
        ttl: CACHE_TTL.APPROPRIATE_TYPE,
        forceRefresh,
        userId: user?.id,
        role: userRole,
        instituteId: selectedInstitute?.id
      }
    );
    setData(data);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    setLoading(false);
  }
};
```

### Template 3: GET with Query Parameters
```typescript
// Before
const fetchData = async (page: number, limit: number) => {
  setLoading(true);
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    const response = await fetch(
      `${getBaseUrl()}/endpoint?${params}`,
      { headers: getApiHeaders() }
    );
    
    if (!response.ok) throw new Error('Failed');
    const data = await response.json();
    setData(data);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    setLoading(false);
  }
};

// After
const fetchData = async (page: number, limit: number, forceRefresh = false) => {
  setLoading(true);
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    const data = await enhancedCachedClient.get(
      `/endpoint?${params}`,
      {},
      {
        ttl: CACHE_TTL.APPROPRIATE_TYPE,
        forceRefresh,
        userId: user?.id,
        role: userRole,
        instituteId: selectedInstitute?.id,
        classId: selectedClass?.id
      }
    );
    setData(data);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    setLoading(false);
  }
};
```

### Template 4: Conditional Endpoints
```typescript
// Before
const fetchData = async () => {
  setLoading(true);
  try {
    let endpoint = '';
    
    if (condition) {
      endpoint = `${getBaseUrl()}/endpoint-a`;
    } else {
      endpoint = `${getBaseUrl()}/endpoint-b`;
    }
    
    const response = await fetch(endpoint, { headers: getApiHeaders() });
    if (!response.ok) throw new Error('Failed');
    const data = await response.json();
    setData(data);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    setLoading(false);
  }
};

// After
const fetchData = async (forceRefresh = false) => {
  setLoading(true);
  try {
    let endpoint = '';
    
    if (condition) {
      endpoint = `/endpoint-a`;
    } else {
      endpoint = `/endpoint-b`;
    }
    
    const data = await enhancedCachedClient.get(
      endpoint,
      {},
      {
        ttl: CACHE_TTL.APPROPRIATE_TYPE,
        forceRefresh,
        userId: user?.id,
        role: userRole,
        instituteId: selectedInstitute?.id,
        ...(optionalContext ? { contextKey: contextValue } : {})
      }
    );
    setData(data);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    setLoading(false);
  }
};
```

---

## 🎯 Cache TTL Selection Guide

Choose the appropriate TTL based on data volatility:

| Data Type | Volatility | Recommended TTL | CACHE_TTL Constant |
|-----------|-----------|----------------|-------------------|
| Institute/Organization Info | Very Low | 120 minutes | `CACHE_TTL.INSTITUTES` |
| Class Structure | Low | 60 minutes | `CACHE_TTL.CLASSES` |
| Subject Lists | Low | 60 minutes | `CACHE_TTL.SUBJECTS` |
| Teacher Assignments | Low | 60 minutes | `CACHE_TTL.TEACHERS` |
| Student Lists | Low | 60 minutes | `CACHE_TTL.STUDENTS` |
| Lecture Schedules | Moderate | 45 minutes | `CACHE_TTL.LECTURES` |
| Homework | Moderate | 30 minutes | `CACHE_TTL.HOMEWORK` |
| Exam Records | Moderate | 30 minutes | `CACHE_TTL.EXAMS` |
| Payment History | Moderate | 30 minutes | `CACHE_TTL.PAYMENTS` |
| Payment Submissions | Moderate | 30 minutes | `CACHE_TTL.PAYMENT_SUBMISSIONS` |
| Attendance Records | High | 20 minutes | `CACHE_TTL.ATTENDANCE` |
| Notifications | High | 15 minutes | `CACHE_TTL.NOTIFICATIONS` |
| Unverified Students | Very High | 15 minutes | `CACHE_TTL.UNVERIFIED_STUDENTS` |
| Live Data/Real-time | Extreme | Don't Cache | N/A |

---

## 🔍 Common Issues & Solutions

### Issue 1: "Cannot find name 'getBaseUrl'"
**Solution:** Remove all `getBaseUrl()` calls and use endpoints starting with `/`

### Issue 2: Cache not updating after data change
**Solution:** Call fetch function with `forceRefresh=true` after create/update/delete operations

### Issue 3: Different users seeing each other's data
**Solution:** Ensure `userId` is included in cache context

### Issue 4: Wrong data showing when switching classes/subjects
**Solution:** Include `classId` and `subjectId` in cache context

### Issue 5: Too many API calls still happening
**Solution:** Verify cooldown protection is working, check Network tab for duplicate requests

### Issue 6: Data not loading at all
**Solution:** Check browser console for errors, verify API endpoint is correct (should start with `/`)

---

## 📝 Documentation to Update

After conversion, update:

- [ ] Component documentation with caching notes
- [ ] Add entry to `CACHING_CONVERSION_COMPLETE.md`
- [ ] Update relevant architecture diagrams
- [ ] Add to testing documentation

---

## ✅ Final Verification

Before marking conversion complete:

- [ ] All `fetch()` calls replaced with `enhancedCachedClient.get()`
- [ ] All functions have `forceRefresh` parameter
- [ ] Proper cache context (userId, role, etc.) included
- [ ] Appropriate TTL selected
- [ ] Manual testing completed successfully
- [ ] Network tab shows cache hits
- [ ] IndexedDB contains cached data
- [ ] Context isolation verified
- [ ] Cooldown protection working
- [ ] Code reviewed and cleaned up
- [ ] Documentation updated

---

## 🎓 Learning Resources

- **Main Documentation:** `COMPLETE_CACHING_IMPLEMENTATION.md`
- **Quick Start Guide:** `CACHING_QUICK_START.md`
- **Before/After Examples:** `CACHING_BEFORE_AFTER_EXAMPLES.md`
- **Architecture Details:** `CACHING_ARCHITECTURE.md`
- **API Reference:** `src/api/enhancedCachedClient.ts`
- **Configuration:** `src/config/cacheTTL.ts`

---

**Time Estimate per Component:** 10-15 minutes
**Difficulty Level:** Easy (following this checklist)
**Success Rate:** 100% (with checklist adherence)

---

*Use this checklist every time you convert a component to ensure consistent, reliable caching implementation.*
