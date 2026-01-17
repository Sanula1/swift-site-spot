# Caching System Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        USER INTERACTION LAYER                            │
├─────────────────────────────────────────────────────────────────────────┤
│  Components (Homework, Lectures, Exams, etc.)                           │
│  - User navigates to page                                               │
│  - Requests data with context (user/institute/class/subject)            │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         API LAYER                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  homework.api.ts, lecture.api.ts, exam.api.ts, etc.                    │
│  - Adds context to requests                                             │
│  - Handles response formatting                                          │
│  - Provides utility methods (hasCached, getCachedOnly, preload)         │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   ENHANCED CACHED CLIENT                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  enhancedCachedClient.ts                                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ GET Request Flow:                                                │   │
│  │ 1. Check cooldown (prevent spam)                                │   │
│  │ 2. Try to get from cache                                        │   │
│  │ 3. If cached & valid → Return immediately                       │   │
│  │ 4. If cached & stale → Return + refresh in background          │   │
│  │ 5. If no cache → Fetch from API                                │   │
│  │ 6. Store response in cache                                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ POST/PATCH/DELETE Flow:                                         │   │
│  │ 1. Execute mutation                                             │   │
│  │ 2. On success → Trigger cache invalidation                     │   │
│  │ 3. Clear related caches                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     SECURE CACHE MANAGER                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  secureCache.ts                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Cache Key Generation:                                            │   │
│  │ secure_cache_/endpoint_user_123_inst_1_class_5_subj_10         │   │
│  │ - Ensures context isolation                                     │   │
│  │ - Prevents data leakage between users/contexts                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Cache Entry:                                                     │   │
│  │ {                                                                │   │
│  │   data: [...], // Actual API response                           │   │
│  │   timestamp: 1697285400000, // When cached                      │   │
│  │   key: "secure_cache_...", // Unique key                        │   │
│  │   context: { userId, instituteId, ... }, // Context info        │   │
│  │   hash: "a4f3d2c1" // Data integrity check                      │   │
│  │ }                                                                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Invalidation Rules:                                              │   │
│  │ POST:/homework → Clear all /homework caches                     │   │
│  │ PATCH:/homework → Clear all /homework caches                    │   │
│  │ DELETE:/homework → Clear all /homework caches                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                   ┌─────────┴─────────┐
                   ▼                   ▼
        ┌──────────────────┐  ┌──────────────────┐
        │   STORAGE LAYER  │  │  BACKEND API     │
        └──────────────────┘  └──────────────────┘
                 │                     │
         ┌───────┼───────┐            │
         ▼       ▼       ▼            ▼
    ┌────────┐ ┌────┐ ┌──────┐  ┌──────────┐
    │IndexedDB│ │LS │ │Memory│  │  Server  │
    │(Primary)│ │(FB)│ │(Temp)│  │          │
    └────────┘ └────┘ └──────┘  └──────────┘
```

## Data Flow Examples

### Example 1: First Time Loading Homework

```
User clicks "Homework"
       ↓
Component calls: homeworkApi.getHomework(params)
       ↓
Enhanced Client checks cache
       ↓
❌ Cache miss (first time)
       ↓
Makes API call to /homework
       ↓
Receives data from server (1000ms)
       ↓
Stores in cache with context:
  Key: secure_cache_/homework_user_123_inst_1_class_5_subj_10
  Data: [homework1, homework2, ...]
  Timestamp: NOW
  Hash: abc123
       ↓
Returns data to component
       ↓
User sees homework list
```

### Example 2: Navigating Back to Homework (Cache Hit)

```
User navigates back to "Homework"
       ↓
Component calls: homeworkApi.getHomework(params)
       ↓
Enhanced Client checks cache
       ↓
✅ Cache hit! (found valid cache)
       ↓
Validates data integrity (hash check)
       ↓
Returns cached data (5ms) ⚡
       ↓
User sees homework list instantly!
       ↓
(Background: Silently refreshes data if stale-while-revalidate enabled)
```

### Example 3: Creating New Homework (Cache Invalidation)

```
User submits new homework form
       ↓
Component calls: homeworkApi.createHomework(data)
       ↓
Enhanced Client makes POST /homework
       ↓
Server creates homework, returns success
       ↓
Enhanced Client triggers invalidation:
  "POST:/homework detected"
       ↓
Secure Cache Manager finds invalidation rules:
  POST:/homework → Clear all /homework caches
       ↓
Clears all homework caches across all contexts:
  🗑️ secure_cache_/homework_user_123_inst_1_*
  🗑️ secure_cache_/homework_user_123_inst_2_*
       ↓
Component refreshes with: homeworkApi.getHomework(params, true)
       ↓
Makes fresh API call (no cache)
       ↓
Stores new data in cache
       ↓
User sees updated homework list with new item
```

### Example 4: Context Switching (Institute Change)

```
User viewing Institute A homework (cached)
       ↓
User switches to Institute B
       ↓
Component calls: homeworkApi.getHomework({
  instituteId: 'B', // Changed!
  classId: '10',
  userId: '123'
})
       ↓
Enhanced Client generates new cache key:
  OLD: secure_cache_/homework_user_123_inst_A_class_10
  NEW: secure_cache_/homework_user_123_inst_B_class_10
       ↓
Different key = Different cache!
       ↓
❌ Cache miss for Institute B
       ↓
Fetches Institute B data from API
       ↓
Stores in separate cache
       ↓
User sees correct Institute B data ✅
```

## Cache Lifecycle

```
┌──────────────────────────────────────────────────────┐
│                  CACHE LIFECYCLE                      │
└──────────────────────────────────────────────────────┘

1. CREATION
   Data fetched from API
   ↓
   Stored with:
   - Unique key (with context)
   - Timestamp (NOW)
   - Data hash (for integrity)
   - TTL (default 30 min)

2. ACTIVE STATE (Valid)
   Age < TTL
   ↓
   Returns data immediately
   ↓
   Optional: Background refresh if stale-while-revalidate

3. STALE STATE (Expired)
   Age > TTL
   ↓
   Marked as expired
   ↓
   Cleared from storage
   ↓
   Next request fetches fresh data

4. INVALIDATION (Forced)
   Mutation detected (POST/PATCH/DELETE)
   ↓
   Related caches cleared
   ↓
   Next request fetches fresh data

5. AUTOMATIC CLEANUP
   Storage full
   ↓
   Remove oldest 25% of entries
   ↓
   Free up space for new data
```

## Storage Priority & Fallback

```
┌─────────────────────────────────────────────┐
│         STORAGE SELECTION LOGIC              │
└─────────────────────────────────────────────┘

Try IndexedDB
    ↓
    ├─ ✅ Available?
    │      ↓
    │      Use IndexedDB (Recommended)
    │      - Unlimited space
    │      - Fast performance
    │      - Structured queries
    │
    └─ ❌ Not available?
           ↓
           Try localStorage
               ↓
               ├─ ✅ Available?
               │      ↓
               │      Use localStorage (Fallback)
               │      - ~5-10MB limit
               │      - Good compatibility
               │      - Simple key-value
               │
               └─ ❌ Not available?
                      ↓
                      Use Memory (Emergency)
                      - Session only
                      - Lost on page refresh
                      - Always available
```

## Request Flow with Cooldown & Deduplication

```
┌────────────────────────────────────────────────┐
│     MULTIPLE SIMULTANEOUS REQUESTS             │
└────────────────────────────────────────────────┘

Component A: homeworkApi.getHomework(params) ───┐
                                                 │
Component B: homeworkApi.getHomework(params) ───┼─→ Enhanced Client
                                                 │
Component C: homeworkApi.getHomework(params) ───┘
                                                 
                         ↓
              Request Deduplication
         (Same endpoint + params = Same key)
                         ↓
              Only 1 API call made!
                         ↓
              All 3 components get result
                         ↓
              Cooldown starts (1 second)
                         ↓
         No duplicate requests for 1 second
```

## Cache Invalidation Patterns

```
┌─────────────────────────────────────────────────────┐
│           INVALIDATION RULES MAP                     │
└─────────────────────────────────────────────────────┘

Mutation                    Clears Caches
─────────────────────────── ──────────────────────
POST /homework           → All /homework caches
PATCH /homework/:id      → All /homework caches
DELETE /homework/:id     → All /homework caches

POST /lectures           → All /lectures caches
PATCH /lectures/:id      → All /lectures caches

POST /students           → /students + /classes
PATCH /students/:id      → /students + /classes

POST /attendance         → All /attendance caches

... (more rules in secureCache.ts)
```

## Context Isolation Visualization

```
┌─────────────────────────────────────────────────────┐
│            USER CACHE ISOLATION                      │
└─────────────────────────────────────────────────────┘

User A (Student, Institute 1)
├── secure_cache_/homework_user_A_inst_1_class_5_subj_10
├── secure_cache_/lectures_user_A_inst_1_class_5_subj_10
└── secure_cache_/exams_user_A_inst_1_class_5_subj_10

User B (Teacher, Institute 2)
├── secure_cache_/homework_user_B_inst_2_class_3_subj_8
├── secure_cache_/lectures_user_B_inst_2_class_3_subj_8
└── secure_cache_/exams_user_B_inst_2_class_3_subj_8

User C (Admin, Institute 1)
├── secure_cache_/homework_user_C_inst_1_role_Admin
├── secure_cache_/students_user_C_inst_1_role_Admin
└── secure_cache_/classes_user_C_inst_1_role_Admin

✅ Complete isolation - No data leakage!
```

## Performance Comparison

```
┌─────────────────────────────────────────────────────┐
│         BEFORE vs AFTER CACHING                      │
└─────────────────────────────────────────────────────┘

Scenario: User browses 5 pages, then goes back to each

WITHOUT CACHING:
Page 1: 1000ms (API) ─────────┐
Page 2: 1000ms (API)          │
Page 3: 1000ms (API)          │ Total: 10,000ms
Page 4: 1000ms (API)          │ 10 API calls
Page 5: 1000ms (API)          │
Back to 1: 1000ms (API) ──────┤
Back to 2: 1000ms (API)       │
Back to 3: 1000ms (API)       │
Back to 4: 1000ms (API)       │
Back to 5: 1000ms (API) ──────┘

WITH CACHING:
Page 1: 1000ms (API + cache) ─┐
Page 2: 1000ms (API + cache)  │
Page 3: 1000ms (API + cache)  │ Total: 5,025ms ⚡
Page 4: 1000ms (API + cache)  │ 5 API calls 💰
Page 5: 1000ms (API + cache)  │
Back to 1: 5ms (cache) ───────┤ 50% faster!
Back to 2: 5ms (cache)        │ 50% fewer calls!
Back to 3: 5ms (cache)        │
Back to 4: 5ms (cache)        │
Back to 5: 5ms (cache) ───────┘

IMPROVEMENT:
✅ 50% reduction in load time
✅ 50% reduction in API calls
✅ 99.5% faster when returning to pages
✅ Dramatically better UX
```

---

## Legend

- ✅ = Success / Available
- ❌ = Failure / Not available
- ⚡ = Fast / Instant
- 💰 = Cost savings
- 🗑️ = Cleared / Deleted
- 📦 = Cached / Stored
- 🔄 = Refreshing / Updating
