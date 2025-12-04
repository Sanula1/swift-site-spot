# 🎯 Cache TTL Quick Reference

## ⏰ Default Cache Duration: 1 HOUR (60 minutes)

## 📋 Quick TTL Lookup

| Data Type | TTL | Use Case |
|-----------|-----|----------|
| 🟢 **Most Data** | 60 min | Default for everything |
| 🟡 **Attendance** | 30 min | Changes frequently |
| 🟠 **Live Content** | 15 min | Real-time updates |
| 🟠 **Payments** | 30 min | Financial data |
| 🔵 **Static Data** | 120 min | Images, reference |

## 🚀 Common Endpoints

```
/api/classes                        → 60 minutes
/api/subjects                       → 60 minutes
/api/students                       → 60 minutes
/api/attendance/student/123         → 30 minutes
/api/lectures/live                  → 15 minutes
/api/payments                       → 30 minutes
/api/gallery                        → 120 minutes
/api/notifications                  → 15 minutes
```

## 💡 Quick Usage

### Auto (Recommended)
```typescript
// Automatically uses correct TTL
const data = await cachedApiClient.get('/api/classes');
```

### Manual Override
```typescript
import { CACHE_PRESETS } from '@/config/cacheTTL';

const data = await cachedApiClient.get('/api/endpoint', {}, {
  ttl: CACHE_PRESETS.SHORT // 15 minutes
});
```

## 🎛️ Presets

```typescript
CACHE_PRESETS.VERY_SHORT  // 5 min  - Real-time
CACHE_PRESETS.SHORT       // 15 min - Frequent
CACHE_PRESETS.MEDIUM      // 30 min - Occasional
CACHE_PRESETS.STANDARD    // 60 min - Default ✅
CACHE_PRESETS.LONG        // 120 min - Static
CACHE_PRESETS.VERY_LONG   // 360 min - Reference
CACHE_PRESETS.NO_CACHE    // 0 min  - Always fresh
```

## 📍 Location

**Config File:** `src/config/cacheTTL.ts`
**Cache Manager:** `src/utils/apiCache.ts`

## 🔧 To Change TTL

1. Open `src/config/cacheTTL.ts`
2. Find the data type (e.g., `CLASSES: 60`)
3. Change the number (in minutes)
4. Save - changes apply immediately!

## 📊 Current Settings

| Category | Items | TTL |
|----------|-------|-----|
| Academic | Classes, Subjects, Grades, Students | 60 min |
| Users | Profile, Permissions, Roles | 60 min |
| Institutes | Details, Users, Classes | 60 min |
| Attendance | Records, Daily, My | 30 min |
| Lectures | Standard, Free | 60 min |
| Lectures | Live | 15 min |
| Payments | All payment types | 30 min |
| Static | Gallery, Settings | 120 min |
| Real-time | Notifications, Unverified | 15 min |

## 🎯 Best Practices

✅ **Use Auto-Detection** - Let system choose TTL  
✅ **1 Hour Default** - Good balance for most data  
✅ **30 Min for Frequent** - Attendance, payments  
✅ **15 Min for Real-time** - Live lectures, notifications  
✅ **2 Hours for Static** - Images, rarely changing data  

## 📝 Console Output

```
✅ Cache SET for /api/classes:
   ttl: "60 minutes"
   expiresAt: "3:45:30 PM"

✅ Cache HIT for /api/classes:
   age: "12.5 minutes"
   expiresIn: "47.5 minutes"
```

---

**Default:** 60 minutes (1 hour) ⏰  
**File:** `src/config/cacheTTL.ts` 📁  
**Auto-Detect:** ✅ Enabled  
