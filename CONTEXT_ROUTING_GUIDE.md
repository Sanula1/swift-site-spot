# 🔗 Context-Aware Routing Implementation Guide

## Problem Solved

**BEFORE:** ❌
```
User selects Institute "ABC School" (ID: 6)
URL stays: /classes
User clicks "Classes" in sidebar
URL stays: /classes
No context visible in URL!
```

**AFTER:** ✅
```
User selects Institute "ABC School" (ID: 6)
URL updates: /institute/6/dashboard

User clicks "Classes" in sidebar
URL updates: /institute/6/classes

User selects Class "Grade 10A" (ID: 12)
URL updates: /institute/6/class/12/classes

User clicks "Subjects"
URL updates: /institute/6/class/12/subjects
```

## URL Structure

### Hierarchical Context in URLs

```
FORMAT: /institute/{id}/class/{id}/subject/{id}/{page}

EXAMPLES:
/dashboard                                      → No context (user not selected institute)
/institute/6/dashboard                          → Institute context only
/institute/6/classes                            → Institute context + classes page
/institute/6/class/12/subjects                  → Institute + Class context + subjects page
/institute/6/class/12/subject/5/homework        → Full context + homework page
/child/456/dashboard                            → Child context (for parents)
/organization/789/courses                       → Organization context
/transport/123/attendance                       → Transport context
```

### Context Hierarchy

```
1. Institute Level
   /institute/{instituteId}/{page}
   
2. Class Level (requires institute)
   /institute/{instituteId}/class/{classId}/{page}
   
3. Subject Level (requires institute + class)
   /institute/{instituteId}/class/{classId}/subject/{subjectId}/{page}
   
4. Child Level (for parents)
   /child/{childId}/{page}
   
5. Organization Level
   /organization/{organizationId}/{page}
   
6. Transport Level
   /transport/{transportId}/{page}
```

## Implementation Details

### 1. Automatic URL Sync (`useContextUrlSync`)

**File:** `src/utils/pageNavigation.ts`

**What it does:**
- Automatically updates URL when context changes
- Watches for changes in institute/class/subject/child selection
- Updates URL without page reload
- Preserves navigation history

**Usage in AppContent.tsx:**
```typescript
import { useContextUrlSync } from '@/utils/pageNavigation';

const AppContent = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  
  // 🔗 This hook automatically syncs URL with context
  useContextUrlSync(currentPage);
  
  // Rest of component...
};
```

**Example Flow:**
```typescript
1. User selects institute → Hook detects → URL updates to /institute/6/dashboard
2. User navigates to classes → setCurrentPage('classes') → URL updates to /institute/6/classes
3. User selects class → Hook detects → URL updates to /institute/6/class/12/classes
4. User navigates to subjects → setCurrentPage('subjects') → URL updates to /institute/6/class/12/subjects
```

### 2. Extract Page from URL (`extractPageFromUrl`)

**What it does:**
- Removes context segments from URL
- Returns the actual page name

**Example:**
```typescript
import { extractPageFromUrl } from '@/utils/pageNavigation';

extractPageFromUrl('/institute/6/classes')
// Returns: 'classes'

extractPageFromUrl('/institute/6/class/12/subjects')
// Returns: 'subjects'

extractPageFromUrl('/institute/6/class/12/subject/5/homework')
// Returns: 'homework'
```

### 3. Parse Context from URL (`parseContextIds`)

**What it does:**
- Extracts context IDs from URL

**Example:**
```typescript
import { parseContextIds } from '@/utils/pageNavigation';

parseContextIds('/institute/6/class/12/subjects')
// Returns: { instituteId: '6', classId: '12' }

parseContextIds('/child/456/dashboard')
// Returns: { childId: '456' }
```

### 4. Build Sidebar URLs (`buildSidebarUrl`)

**What it does:**
- Builds context-aware URLs for navigation links

**Example:**
```typescript
import { buildSidebarUrl } from '@/utils/pageNavigation';

const context = {
  instituteId: '6',
  classId: '12'
};

buildSidebarUrl('subjects', context)
// Returns: '/institute/6/class/12/subjects'

buildSidebarUrl('homework', context)
// Returns: '/institute/6/class/12/homework'
```

## Sidebar Integration

### Current Implementation

The sidebar currently uses `onPageChange` callback:

```typescript
// Sidebar.tsx (current)
<button onClick={() => onPageChange('classes')}>
  Classes
</button>
```

### Enhanced Implementation (Recommended)

Use the context navigation components:

```typescript
// Option 1: Using ContextNavLink
import { SidebarNavItem } from '@/components/ContextNavigation';

<SidebarNavItem
  to="/classes"
  icon={<BookOpen />}
  label="Classes"
  onClick={onClose}
/>

// Option 2: Using buildSidebarUrl
import { buildSidebarUrl } from '@/utils/pageNavigation';
import { useAuth } from '@/contexts/AuthContext';

const { selectedInstitute, selectedClass } = useAuth();

const handleNavigate = (page: string) => {
  const url = buildSidebarUrl(page, {
    instituteId: selectedInstitute?.id,
    classId: selectedClass?.id
  });
  
  navigate(url);
  onClose();
};

<button onClick={() => handleNavigate('classes')}>
  Classes
</button>
```

## Context-Aware Navigation Components

### 1. SidebarNavItem

```typescript
import { SidebarNavItem } from '@/components/ContextNavigation';

<SidebarNavItem
  to="/classes"
  icon={<BookOpen className="w-5 h-5" />}
  label="Classes"
  badge={3}  // Optional badge
  onClick={() => console.log('Clicked')}
/>
```

**Features:**
- Automatically includes context in URL
- Highlights when active
- Shows badge for notifications

### 2. ContextNavLink

```typescript
import { ContextNavLink } from '@/components/ContextNavigation';

<ContextNavLink
  to="/subjects"
  className="px-3 py-2 rounded-md"
  activeClassName="bg-primary text-white"
>
  View Subjects
</ContextNavLink>
```

### 3. ContextBreadcrumb

```typescript
import { ContextBreadcrumb } from '@/components/ContextNavigation';

<ContextBreadcrumb
  items={[
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Institute', path: '/institutes' },
    { label: 'Classes' }  // Current page (no path)
  ]}
/>
```

**Renders:** `Dashboard / Institute / Classes`

### 4. ContextTabs

```typescript
import { ContextTabs } from '@/components/ContextNavigation';

<ContextTabs
  tabs={[
    { id: 'overview', label: 'Overview', path: '/dashboard', icon: <Home /> },
    { id: 'classes', label: 'Classes', path: '/classes', icon: <BookOpen /> },
    { id: 'students', label: 'Students', path: '/students', icon: <Users /> }
  ]}
/>
```

## URL Examples by User Role

### Super Admin
```
/dashboard                          → Dashboard
/institutes                         → All institutes
/institute/6/dashboard              → Selected institute dashboard
/institute/6/users                  → Institute users
/institute/6/classes                → Institute classes
```

### Institute Admin
```
/institute/6/dashboard              → Institute dashboard
/institute/6/users                  → Manage users
/institute/6/classes                → Manage classes
/institute/6/class/12/subjects      → Manage class subjects
/institute/6/payments               → Payments
```

### Teacher
```
/institute/6/dashboard              → Dashboard
/institute/6/class/12/dashboard     → Class dashboard
/institute/6/class/12/students      → View students
/institute/6/class/12/attendance    → Mark attendance
/institute/6/class/12/homework      → Manage homework
/institute/6/class/12/exams         → Manage exams
/institute/6/class/12/grading       → Grade students
```

### Student
```
/institute/6/class/12/dashboard     → My dashboard
/institute/6/class/12/my-attendance → My attendance
/institute/6/class/12/homework      → My homework
/institute/6/class/12/exams         → My exams
/institute/6/class/12/results       → My results
```

### Parent
```
/my-children                        → Select child
/child/456/dashboard                → Child dashboard
/child/456/attendance               → Child attendance
/child/456/results                  → Child results
/child/456/transport                → Child transport
```

## Testing the Implementation

### Test 1: Institute Selection

```typescript
1. Login as any user
2. Select an institute
3. Check URL → Should update to /institute/{id}/dashboard
4. Navigate to Classes
5. Check URL → Should be /institute/{id}/classes
```

### Test 2: Class Selection

```typescript
1. Be on /institute/6/dashboard
2. Select a class
3. Check URL → Should update to /institute/6/class/12/dashboard
4. Navigate to Subjects
5. Check URL → Should be /institute/6/class/12/subjects
```

### Test 3: Subject Selection

```typescript
1. Be on /institute/6/class/12/subjects
2. Select a subject
3. Check URL → Should update to /institute/6/class/12/subject/5/subjects
4. Navigate to Homework
5. Check URL → Should be /institute/6/class/12/subject/5/homework
```

### Test 4: Context Change

```typescript
1. Be on /institute/6/class/12/subjects
2. Change to different class (e.g., Grade 11)
3. Check URL → Should update to /institute/NEW_ID/classes
4. Previous class context should be cleared
```

### Test 5: Sidebar Navigation

```typescript
1. Be on /institute/6/class/12/dashboard
2. Click "Subjects" in sidebar
3. URL should update to /institute/6/class/12/subjects
4. Page should render Subjects component
5. Sidebar should highlight "Subjects" as active
```

## Browser Console Logs

Watch for these logs to verify it's working:

```
🔗 Updating URL with context: {
  from: "/classes",
  to: "/institute/6/classes",
  page: "classes",
  context: {
    institute: "ABC School",
    class: null,
    subject: null
  }
}

🔗 Updating URL with context: {
  from: "/institute/6/classes",
  to: "/institute/6/class/12/classes",
  page: "classes",
  context: {
    institute: "ABC School",
    class: "Grade 10A",
    subject: null
  }
}

📍 Sidebar navigation clicked: {
  to: "/subjects",
  currentPath: "/institute/6/class/12/classes"
}
```

## Benefits

### ✅ User Experience
1. **Shareable URLs** - Users can copy/paste URLs with full context
2. **Bookmarkable** - Users can bookmark specific pages with context
3. **Browser History** - Back/forward buttons work correctly
4. **Deep Linking** - Can navigate directly to context-specific pages

### ✅ Developer Experience
1. **Clear State** - URL reflects application state
2. **Debugging** - Easy to see current context in URL
3. **Testing** - Can test specific scenarios with URLs
4. **Maintainability** - Centralized context management

### ✅ Security
1. **Context Validation** - Can validate context from URL
2. **Permission Checking** - Can verify user has access to institute/class/subject
3. **Audit Trail** - URLs in logs show full context
4. **Session Recovery** - Can restore state from URL after refresh

## Migration Guide

### Step 1: Update AppContent.tsx ✅
```typescript
import { useContextUrlSync } from '@/utils/pageNavigation';

// In component:
useContextUrlSync(currentPage);
```

### Step 2: Update Sidebar Links (Recommended)

**Before:**
```typescript
<button onClick={() => onPageChange('classes')}>
  Classes
</button>
```

**After:**
```typescript
import { SidebarNavItem } from '@/components/ContextNavigation';

<SidebarNavItem
  to="/classes"
  icon={<BookOpen />}
  label="Classes"
  onClick={onClose}
/>
```

### Step 3: Test All Navigation
- Click through all sidebar links
- Verify URLs update correctly
- Test with different contexts (institute, class, subject)
- Test browser back/forward buttons
- Test page refresh (should maintain context)

## Troubleshooting

### Issue: URL not updating
**Solution:** Check if `useContextUrlSync` is called in AppContent.tsx

### Issue: URL updating but page not rendering
**Solution:** Ensure App.tsx routes include context parameters

### Issue: Context lost on refresh
**Solution:** Implement URL parsing in initial state (coming soon)

### Issue: Sidebar active state not working
**Solution:** Use `ContextNavLink` or `SidebarNavItem` components

## Next Steps

1. ✅ Basic URL sync implemented
2. ✅ Context-aware navigation components created
3. ⏳ Update all sidebar links to use new components
4. ⏳ Implement URL context restoration on page load
5. ⏳ Add route guards based on URL context
6. ⏳ Add analytics/tracking for context-aware routes

## Status

**Implementation:** ✅ Complete  
**Testing:** ⏳ In Progress  
**Documentation:** ✅ Complete  
**Production Ready:** 🔄 Needs testing

---

**Last Updated:** October 14, 2025  
**Version:** 1.0.0  
**Status:** Ready for Integration Testing
