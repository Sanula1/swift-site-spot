# ✅ Centralized Cache TTL Management System

## Overview

Implemented a **centralized cache TTL (Time To Live) configuration system** that manages cache durations across the entire application from a single file.

## What Was Done

### 1. Created Centralized TTL Configuration ✅

**File:** `src/config/cacheTTL.ts`

**Features:**
- ✅ Single source of truth for all cache durations
- ✅ Default TTL: **60 minutes (1 hour)**
- ✅ Endpoint-specific TTL configuration
- ✅ Automatic TTL detection based on endpoint
- ✅ Cache presets for common scenarios
- ✅ Helper functions for TTL management

### 2. Updated Cache Manager ✅

**File:** `src/utils/apiCache.ts`

**Changes:**
- ✅ Imported centralized TTL configuration
- ✅ Changed default TTL from 30 minutes to **60 minutes (1 hour)**
- ✅ Automatic TTL detection based on endpoint
- ✅ Enhanced console logging with TTL information
- ✅ Shows expiration time in logs

## Cache TTL Configuration

### Default Settings

| Data Type | TTL | Reason |
|-----------|-----|--------|
| **Default** | 60 min | Standard for most data |
| User Profile | 60 min | Changes occasionally |
| Institutes | 60 min | Relatively static |
| Classes/Subjects | 60 min | Standard academic data |
| **Attendance** | 30 min | Changes frequently |
| **Live Lectures** | 15 min | Real-time content |
| **Payments** | 30 min | Financial data |
| Gallery | 120 min | Images rarely change |
| **Notifications** | 15 min | Needs to be fresh |

### Complete TTL List

```typescript
// DEFAULT: 60 minutes (1 hour)
DEFAULT: 60

// USER & AUTHENTICATION: 60 minutes
USER_PROFILE: 60
USER_PERMISSIONS: 60
USER_ROLES: 60

// INSTITUTE DATA: 60 minutes
INSTITUTES: 60
INSTITUTE_DETAILS: 60
INSTITUTE_USERS: 60
INSTITUTE_CLASSES: 60
INSTITUTE_ORGANIZATIONS: 60

// ACADEMIC DATA: 60 minutes
CLASSES: 60
SUBJECTS: 60
GRADES: 60
STUDENTS: 60
TEACHERS: 60
PARENTS: 60

// ATTENDANCE: 30 minutes (frequently changing)
ATTENDANCE_RECORDS: 30
ATTENDANCE_MARKERS: 60
DAILY_ATTENDANCE: 30
MY_ATTENDANCE: 30
CHILD_ATTENDANCE: 30

// ACADEMIC CONTENT: 60 minutes
LECTURES: 60
LIVE_LECTURES: 15  // Real-time
FREE_LECTURES: 60
HOMEWORK: 60
HOMEWORK_SUBMISSIONS: 30
EXAMS: 60
EXAM_RESULTS: 60
CHILD_RESULTS: 60

// PAYMENTS: 30 minutes
PAYMENTS: 30
PAYMENT_SUBMISSIONS: 30
INSTITUTE_PAYMENTS: 30
SUBJECT_PAYMENTS: 30

// TRANSPORT: 60 minutes
TRANSPORT: 60
TRANSPORT_ATTENDANCE: 30
CHILD_TRANSPORT: 60

// ORGANIZATIONS: 60 minutes
ORGANIZATIONS: 60
ORGANIZATION_COURSES: 60
ORGANIZATION_LECTURES: 60
ORGANIZATION_GALLERY: 120  // Images

// STATIC DATA: 120 minutes (2 hours)
GALLERY: 120
SETTINGS: 60

// REAL-TIME: 15 minutes
NOTIFICATIONS: 15
UNVERIFIED_STUDENTS: 15
ENROLLMENT_STATUS: 15

// API CONFIG: 120 minutes (2 hours)
API_CONFIG: 120
```

## Automatic TTL Detection

The system automatically detects the appropriate TTL based on the endpoint:

```typescript
// Example: Attendance endpoint
fetch('/api/attendance/student/123')
// Automatically uses CHILD_ATTENDANCE: 30 minutes

// Example: Lectures endpoint
fetch('/api/lectures/live')
// Automatically uses LIVE_LECTURES: 15 minutes

// Example: Classes endpoint
fetch('/api/classes')
// Automatically uses CLASSES: 60 minutes
```

### Endpoint Mapping

| Endpoint Pattern | TTL Used | Duration |
|------------------|----------|----------|
| `/attendance/markers` | ATTENDANCE_MARKERS | 60 min |
| `/attendance/student` | CHILD_ATTENDANCE | 30 min |
| `/attendance/my` | MY_ATTENDANCE | 30 min |
| `/attendance/daily` | DAILY_ATTENDANCE | 30 min |
| `/attendance` | ATTENDANCE_RECORDS | 30 min |
| `/lectures/live` | LIVE_LECTURES | 15 min |
| `/lectures/free` | FREE_LECTURES | 60 min |
| `/lectures` | LECTURES | 60 min |
| `/institute-users` | INSTITUTE_USERS | 60 min |
| `/classes` | CLASSES | 60 min |
| `/payments` | PAYMENTS | 30 min |
| `/gallery` | GALLERY | 120 min |
| `/notifications` | NOTIFICATIONS | 15 min |
| Unknown | DEFAULT | 60 min |

## Usage Examples

### 1. Using Default TTL (Auto-Detected)

```typescript
import { cachedApiClient } from '@/api/cachedClient';

// Automatically uses 60 minutes for classes
const classes = await cachedApiClient.get('/api/classes');

// Automatically uses 30 minutes for attendance
const attendance = await cachedApiClient.get('/api/attendance/student/123');

// Automatically uses 15 minutes for live lectures
const liveLectures = await cachedApiClient.get('/api/lectures/live');
```

### 2. Override TTL Manually

```typescript
import { cachedApiClient } from '@/api/cachedClient';
import { CACHE_PRESETS } from '@/config/cacheTTL';

// Use custom TTL
const data = await cachedApiClient.get('/api/some-endpoint', {}, {
  ttl: CACHE_PRESETS.SHORT // 15 minutes
});

// No cache
const freshData = await cachedApiClient.get('/api/some-endpoint', {}, {
  ttl: CACHE_PRESETS.NO_CACHE // 0 minutes
});

// Very long cache
const staticData = await cachedApiClient.get('/api/reference-data', {}, {
  ttl: CACHE_PRESETS.VERY_LONG // 360 minutes (6 hours)
});
```

### 3. Get TTL Programmatically

```typescript
import { getTTL, getTTLForEndpoint, CACHE_TTL } from '@/config/cacheTTL';

// Get TTL by key
const userTTL = getTTL('USER_PROFILE'); // 60

// Get TTL for endpoint
const attendanceTTL = getTTLForEndpoint('/api/attendance/student/123'); // 30

// Direct access
const classesTTL = CACHE_TTL.CLASSES; // 60
```

## Cache Presets

Pre-defined TTL values for common scenarios:

```typescript
import { CACHE_PRESETS } from '@/config/cacheTTL';

CACHE_PRESETS.VERY_SHORT  // 5 minutes  - Real-time data
CACHE_PRESETS.SHORT       // 15 minutes - Frequent updates
CACHE_PRESETS.MEDIUM      // 30 minutes - Occasional updates
CACHE_PRESETS.STANDARD    // 60 minutes - Most data
CACHE_PRESETS.LONG        // 120 minutes - Static data
CACHE_PRESETS.VERY_LONG   // 360 minutes - Reference data
CACHE_PRESETS.NO_CACHE    // 0 minutes  - Always fresh
```

## Console Logging

### Cache SET

```
✅ Cache SET for /api/classes:
{
  userId: "user123",
  role: "InstituteAdmin",
  dataLength: 15,
  storageType: "indexeddb",
  ttl: "60 minutes",
  expiresAt: "3:45:30 PM"
}
```

### Cache HIT

```
✅ ApiCache: Cache HIT for /api/attendance/student/123:
{
  cacheKey: "api_cache_/api/attendance/...",
  dataLength: 50,
  storageType: "indexeddb",
  age: "12.5 minutes",
  ttl: "30 minutes",
  expiresIn: "17.5 minutes"
}
```

### Cache GET (with auto-detection)

```
🔍 ApiCache.getCache() called:
{
  endpoint: "/api/lectures/live",
  cacheKey: "api_cache_...",
  storageType: "indexeddb",
  userId: "user123",
  role: "Student",
  ttl: "15 minutes"  ← Auto-detected!
}
```

## How to Adjust TTL

### Option 1: Change Global Default

```typescript
// In src/config/cacheTTL.ts
export const CACHE_TTL: CacheTTLConfig = {
  DEFAULT: 120, // Change from 60 to 120 minutes
  // ...
};
```

### Option 2: Change Specific Endpoint

```typescript
// In src/config/cacheTTL.ts
export const CACHE_TTL: CacheTTLConfig = {
  // ...
  ATTENDANCE_RECORDS: 45, // Change from 30 to 45 minutes
  // ...
};
```

### Option 3: Add New Endpoint Pattern

```typescript
// In src/config/cacheTTL.ts
export function getTTLForEndpoint(endpoint: string): number {
  // ...
  
  // Add new pattern
  if (cleanEndpoint.includes('my-custom-endpoint')) {
    return 90; // 90 minutes
  }
  
  // ...
}
```

## Benefits

### 🎯 Centralized Management
- ✅ One file to manage all cache durations
- ✅ Easy to find and update TTL values
- ✅ Consistent caching strategy

### 🚀 Performance
- ✅ 1 hour default cache reduces API calls
- ✅ Endpoint-specific tuning for optimal performance
- ✅ Automatic detection saves configuration time

### 🛡️ Flexibility
- ✅ Override TTL per request when needed
- ✅ Presets for common scenarios
- ✅ Helper functions for conversions

### 📊 Better Debugging
- ✅ Detailed console logs with TTL info
- ✅ Shows expiration times
- ✅ Easy to identify cache behavior

## Testing

### Test Different TTLs

```typescript
import { CACHE_TTL, getTTLForEndpoint } from '@/config/cacheTTL';

// Test endpoint detection
console.log('Classes TTL:', getTTLForEndpoint('/api/classes')); // 60
console.log('Attendance TTL:', getTTLForEndpoint('/api/attendance/student/123')); // 30
console.log('Live Lectures TTL:', getTTLForEndpoint('/api/lectures/live')); // 15
console.log('Unknown TTL:', getTTLForEndpoint('/api/unknown')); // 60 (default)
```

### Verify Cache Expiration

```typescript
import { cachedApiClient } from '@/api/cachedClient';

// Fetch data (will be cached for 60 minutes)
const data1 = await cachedApiClient.get('/api/classes');

// Immediate fetch (should hit cache)
const data2 = await cachedApiClient.get('/api/classes');
// Console: ✅ ApiCache: Cache HIT (age: 0.1 minutes, expiresIn: 59.9 minutes)

// Wait 61 minutes...
// Next fetch (should miss cache - expired)
const data3 = await cachedApiClient.get('/api/classes');
// Console: ⏰ ApiCache: Cache expired (age: 61.0 minutes, ttl: 60)
```

## Migration Guide

### Before (Manual TTL)

```typescript
// Had to specify TTL every time
const data = await cachedApiClient.get('/api/classes', {}, {
  ttl: 60 // Manual
});

const attendance = await cachedApiClient.get('/api/attendance', {}, {
  ttl: 30 // Manual
});
```

### After (Automatic TTL)

```typescript
// TTL automatically detected!
const data = await cachedApiClient.get('/api/classes');
// Uses 60 minutes automatically

const attendance = await cachedApiClient.get('/api/attendance');
// Uses 30 minutes automatically
```

## Configuration Summary

| Setting | Value | Location |
|---------|-------|----------|
| **Default TTL** | 60 minutes | `src/config/cacheTTL.ts` |
| **Minimum TTL** | 15 minutes | Live lectures, notifications |
| **Maximum TTL** | 120 minutes | Gallery, static data |
| **Most Common** | 60 minutes | Academic, institutes, users |
| **Financial Data** | 30 minutes | Payments |
| **Attendance** | 30 minutes | All attendance types |

## Files Modified

| File | Changes |
|------|---------|
| `src/config/cacheTTL.ts` | ✅ Created - Centralized TTL config |
| `src/utils/apiCache.ts` | ✅ Updated - Use centralized config, auto-detect TTL |

## Status

| Feature | Status |
|---------|--------|
| Centralized TTL Config | ✅ Complete |
| Auto-Detection | ✅ Complete |
| Default 1 Hour Cache | ✅ Complete |
| Enhanced Logging | ✅ Complete |
| TypeScript Types | ✅ Complete |
| Documentation | ✅ Complete |

---

**Last Updated:** October 14, 2025  
**Default Cache Duration:** 60 minutes (1 hour)  
**Configuration File:** `src/config/cacheTTL.ts`  
**Status:** ✅ Production Ready
