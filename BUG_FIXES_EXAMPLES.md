# 🔧 Bug Fixes & Code Examples

**Date:** October 14, 2025  
**Purpose:** Specific code examples showing bugs and their fixes

---

## 🐛 Bug Fix Examples

### 1. Role Authorization Bug

#### ❌ BROKEN CODE
```typescript
// src/pages/UpdateLecture.tsx (Line 24)
const canUpdate = user?.role === 'Teacher';

// PROBLEM: Uses global login role, not institute-specific role
// If user is Teacher in Institute A but Student in Institute B,
// they can still edit lectures when viewing Institute B
```

#### ✅ FIXED CODE
```typescript
import { useInstituteRole } from '@/hooks/useInstituteRole';

const userRole = useInstituteRole();
const canUpdate = userRole === 'Teacher';

// CORRECT: Uses institute-specific role from selectedInstitute.instituteUserType
```

---

### 2. Security Bug - Exposed Tokens

#### ❌ BROKEN CODE
```typescript
// src/api/client.ts
console.log('Request Headers:', this.getHeaders());
// OUTPUT: { Authorization: "Bearer eyJhbGciOiJIUz..." }
// PROBLEM: Exposes auth token in console
```

#### ✅ FIXED CODE
```typescript
// Create logger utility
// src/utils/logger.ts
export const logger = {
  log: (...args: any[]) => {
    if (import.meta.env.DEV) {
      console.log(...args);
    }
  },
  
  logHeaders: (headers: Record<string, string>) => {
    if (import.meta.env.DEV) {
      const sanitized = { ...headers };
      if (sanitized.Authorization) {
        sanitized.Authorization = 'Bearer [REDACTED]';
      }
      console.log('Request Headers:', sanitized);
    }
  },
  
  error: (...args: any[]) => {
    console.error(...args);
  }
};

// In client.ts
logger.logHeaders(this.getHeaders());
```

---

### 3. Error Handling Bug

#### ❌ BROKEN CODE
```typescript
// src/components/Students.tsx
try {
  const response = await fetch(url);
  const data = await response.json();
  setStudents(data);
} catch (error) {
  console.error('Error:', error);
  // PROBLEMS:
  // 1. User doesn't see error
  // 2. App state may be inconsistent
  // 3. No error tracking
  // 4. Generic error message
}
```

#### ✅ FIXED CODE
```typescript
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

try {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new AppError(
      'Failed to load students',
      'STUDENTS_LOAD_ERROR',
      response.status
    );
  }
  
  const data = await response.json();
  setStudents(data);
  setError(null);
  
} catch (error) {
  const appError = error instanceof AppError 
    ? error 
    : new AppError('Unexpected error loading students', 'UNKNOWN_ERROR');
  
  // Log for developers
  logger.error('Students load error:', appError);
  
  // Show to user
  toast.error(appError.message);
  
  // Update state
  setError(appError.message);
  setStudents([]);
  
  // Track in monitoring service
  trackError(appError);
}
```

---

### 4. Pagination Bug

#### ❌ BROKEN CODE
```typescript
// src/components/Students.tsx
const [students, setStudents] = useState([]);

useEffect(() => {
  fetch(`/api/students?instituteId=${instituteId}`)
    .then(res => res.json())
    .then(data => setStudents(data));
}, [instituteId]);

// PROBLEMS:
// 1. Loads ALL students at once (could be 10,000+)
// 2. No loading state
// 3. No error handling
// 4. No pagination
```

#### ✅ FIXED CODE
```typescript
import { useTableData } from '@/hooks/useTableData';

const { 
  state: { data: students, loading, error },
  pagination,
  actions: { refresh }
} = useTableData({
  endpoint: '/institute/students',
  defaultParams: { instituteId },
  dependencies: [instituteId],
  pagination: { defaultLimit: 50 }
});

<MUITable
  data={students}
  columns={columns}
  loading={loading}
  error={error}
  page={pagination.page}
  rowsPerPage={pagination.limit}
  totalCount={pagination.totalCount}
  onPageChange={pagination.actions.setPage}
  onRowsPerPageChange={pagination.actions.setLimit}
/>

// BENEFITS:
// ✅ Only loads 50 students at a time
// ✅ Built-in loading state
// ✅ Built-in error handling
// ✅ Proper pagination controls
// ✅ Auto-refresh on dependency change
```

---

### 5. Token Storage Bug

#### ❌ BROKEN CODE
```typescript
// src/contexts/utils/auth.api.ts
localStorage.setItem('access_token', token);

// PROBLEMS:
// 1. Vulnerable to XSS attacks
// 2. Token persists forever
// 3. No httpOnly protection
// 4. Accessible from any script
```

#### ✅ FIXED CODE (Development)
```typescript
// For development, use localStorage but with security measures
const TOKEN_KEY = 'app_access_token';
const TOKEN_EXPIRY_KEY = 'app_token_expiry';

export const tokenStorage = {
  setToken(token: string, expiresIn: number = 3600) {
    const expiry = Date.now() + (expiresIn * 1000);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
  },
  
  getToken(): string | null {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    
    if (!token || !expiry) return null;
    
    // Check if expired
    if (Date.now() > parseInt(expiry)) {
      this.clearToken();
      return null;
    }
    
    return token;
  },
  
  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  },
  
  isExpired(): boolean {
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiry) return true;
    return Date.now() > parseInt(expiry);
  }
};
```

#### ✅ BETTER (Production - Backend Required)
```typescript
// Use httpOnly cookies (backend must set them)
// Frontend just makes requests, backend handles cookies

// Login
const response = await fetch('/api/login', {
  method: 'POST',
  credentials: 'include', // Important!
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(credentials)
});

// Backend sets httpOnly cookie in response:
// Set-Cookie: token=xyz; HttpOnly; Secure; SameSite=Strict

// All subsequent requests automatically include cookie
const data = await fetch('/api/students', {
  credentials: 'include' // Important!
});

// Benefits:
// ✅ Not accessible to JavaScript (XSS protection)
// ✅ Auto-expires
// ✅ Can't be stolen by XSS
// ✅ CSRF protection with SameSite
```

---

### 6. Component Size Bug

#### ❌ BROKEN CODE
```typescript
// src/components/AppContent.tsx (932 lines)
const AppContent = () => {
  // 50+ component imports
  // 20+ state variables
  // Complex routing logic
  // Role-based rendering
  // Institute selection logic
  // Class selection logic
  // Subject selection logic
  // ... 850 more lines
};

// PROBLEMS:
// 1. Hard to understand
// 2. Hard to test
// 3. Hard to maintain
// 4. Multiple responsibilities
// 5. Performance issues
```

#### ✅ FIXED CODE
```typescript
// Split into smaller components

// src/components/AppContent.tsx (100 lines)
const AppContent = () => {
  return (
    <AppLayout>
      <RouterProvider router={appRouter} />
    </AppLayout>
  );
};

// src/components/layout/AppLayout.tsx (150 lines)
const AppLayout = ({ children }) => {
  return (
    <div className="app-layout">
      <Header />
      <Sidebar />
      <main>{children}</main>
    </div>
  );
};

// src/routing/appRouter.tsx (200 lines)
const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'students', element: <Students /> },
      // ... more routes
    ]
  }
]);

// src/components/ProtectedRoute.tsx (80 lines)
const ProtectedRoute = () => {
  const userRole = useInstituteRole();
  const { selectedInstitute } = useAuth();
  
  // Role-based access logic
  // Institute selection requirement
  // Redirect logic
  
  return <Outlet />;
};

// BENEFITS:
// ✅ Each component has single responsibility
// ✅ Easy to test individually
// ✅ Easy to understand
// ✅ Can lazy-load routes
// ✅ Better performance
```

---

### 7. Type Safety Bug

#### ❌ BROKEN CODE
```typescript
// Loose typing leads to runtime errors
const students: any[] = await api.get('/students');

students.forEach(student => {
  console.log(student.fullName); // What if fullName doesn't exist?
});

// PROBLEMS:
// 1. No autocomplete
// 2. No type checking
// 3. Runtime errors
// 4. Hard to refactor
```

#### ✅ FIXED CODE
```typescript
// Define proper types
interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  instituteId: string;
  classId: string;
  enrollmentDate: string;
  isActive: boolean;
}

interface ApiResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Type-safe API call
const response = await api.get<ApiResponse<Student>>('/students');

// Now TypeScript knows the shape
response.data.forEach(student => {
  // ✅ Autocomplete works
  // ✅ Type checking works
  console.log(`${student.firstName} ${student.lastName}`);
});

// Enable strict mode in tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

---

### 8. Memory Leak Bug

#### ❌ BROKEN CODE
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    fetchData();
  }, 5000);
  
  // PROBLEM: Interval never cleared
  // Continues running even after component unmounts
  // Memory leak!
}, []);
```

#### ✅ FIXED CODE
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    fetchData();
  }, 5000);
  
  // Cleanup function
  return () => {
    clearInterval(interval);
  };
}, [fetchData]);

// Even better: Use a custom hook
const useInterval = (callback: () => void, delay: number | null) => {
  const savedCallback = useRef(callback);
  
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  
  useEffect(() => {
    if (delay === null) return;
    
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
};

// Usage
useInterval(() => {
  fetchData();
}, 5000);
```

---

### 9. Race Condition Bug

#### ❌ BROKEN CODE
```typescript
const [searchTerm, setSearchTerm] = useState('');
const [results, setResults] = useState([]);

useEffect(() => {
  if (searchTerm) {
    api.search(searchTerm).then(setResults);
  }
}, [searchTerm]);

// PROBLEM: Race condition
// User types "react" quickly
// Request for "r" might return after "react"
// Shows wrong results!
```

#### ✅ FIXED CODE
```typescript
const [searchTerm, setSearchTerm] = useState('');
const [results, setResults] = useState([]);

useEffect(() => {
  if (!searchTerm) {
    setResults([]);
    return;
  }
  
  let cancelled = false;
  
  const search = async () => {
    const data = await api.search(searchTerm);
    
    // Only update if this effect hasn't been cancelled
    if (!cancelled) {
      setResults(data);
    }
  };
  
  search();
  
  // Cleanup: mark this effect as cancelled
  return () => {
    cancelled = true;
  };
}, [searchTerm]);

// Even better: Add debouncing
import { useDebouncedValue } from '@/hooks/useDebounce';

const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebouncedValue(searchTerm, 300);

useEffect(() => {
  // Only runs 300ms after user stops typing
  if (debouncedSearch) {
    api.search(debouncedSearch).then(setResults);
  }
}, [debouncedSearch]);
```

---

### 10. Accessibility Bug

#### ❌ BROKEN CODE
```typescript
<div onClick={handleClick}>
  Click me
</div>

// PROBLEMS:
// 1. Not keyboard accessible
// 2. No screen reader support
// 3. No focus indicator
// 4. Not semantic HTML
```

#### ✅ FIXED CODE
```typescript
<button
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
  aria-label="Action button"
  className="focus:ring-2 focus:ring-blue-500"
>
  Click me
</button>

// Or better, use proper button component
import { Button } from '@/components/ui/button';

<Button onClick={handleClick} aria-label="Action button">
  Click me
</Button>

// Benefits:
// ✅ Keyboard accessible (Tab, Enter, Space)
// ✅ Screen reader friendly
// ✅ Focus indicator
// ✅ Semantic HTML
```

---

## 🎯 Common Patterns to Follow

### API Call Pattern
```typescript
const [data, setData] = useState<DataType[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const loadData = async () => {
  setLoading(true);
  setError(null);
  
  try {
    const response = await api.get<DataType[]>('/endpoint');
    setData(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    setError(message);
    toast.error(message);
    logger.error('Load error:', err);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  loadData();
}, [dependencies]);
```

### Form Handling Pattern
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
});

const MyForm = () => {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '' }
  });
  
  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      await api.post('/endpoint', data);
      toast.success('Success!');
      form.reset();
    } catch (error) {
      toast.error('Failed to submit');
    }
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* form fields */}
    </form>
  );
};
```

### Component Pattern
```typescript
interface MyComponentProps {
  id: string;
  onSuccess?: () => void;
  className?: string;
}

/**
 * Component description
 * 
 * @param id - The entity ID
 * @param onSuccess - Callback after successful operation
 * @param className - Additional CSS classes
 */
export const MyComponent = ({ 
  id, 
  onSuccess, 
  className 
}: MyComponentProps) => {
  // Component logic
  
  return (
    <div className={cn('base-classes', className)}>
      {/* JSX */}
    </div>
  );
};
```

---

## 📚 Additional Resources

- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [React Best Practices](https://react.dev/learn)
- [Security Best Practices](https://owasp.org/www-project-top-ten/)

---

**Last Updated:** October 14, 2025
