# ✅ Implementation Checklist

**Purpose:** Step-by-step guide to fix all critical issues  
**Target:** Development team  
**Timeline:** 8 weeks

---

## Week 1: Critical Security Fixes

### Day 1-2: Environment & Secrets
- [ ] **Verify .env is in .gitignore**
  ```bash
  grep -q "^\.env$" .gitignore || echo ".env" >> .gitignore
  ```
  
- [ ] **Create .env.example**
  ```bash
  cp .env .env.example
  # Edit .env.example and replace all values with placeholders
  ```
  
- [ ] **Check if .env was committed**
  ```bash
  git log --all --full-history -- .env
  # If found, rotate all credentials immediately!
  ```
  
- [ ] **Remove .env from git history (if needed)**
  ```bash
  git filter-branch --force --index-filter \
    "git rm --cached --ignore-unmatch .env" \
    --prune-empty --tag-name-filter cat -- --all
  ```

- [ ] **Rotate exposed credentials**
  - [ ] Generate new Supabase keys
  - [ ] Update production environment
  - [ ] Update team's local .env files

### Day 3-4: Console Logging Cleanup
- [ ] **Create logger utility**
  - [ ] Create `src/utils/logger.ts` (see BUG_FIXES_EXAMPLES.md)
  - [ ] Add sanitization for sensitive data
  - [ ] Export typed logger functions

- [ ] **Replace console.log across codebase**
  ```bash
  # Find all console.log occurrences
  grep -r "console.log" src/ --include="*.ts" --include="*.tsx"
  
  # Replace with logger (do in batches)
  # Priority: auth.api.ts, client.ts, AuthContext.tsx
  ```

- [ ] **Add ESLint rule**
  ```json
  {
    "rules": {
      "no-console": ["error", { "allow": ["error"] }]
    }
  }
  ```

### Day 5: Error Boundary
- [ ] **Create error boundary component**
  ```typescript
  // src/components/ErrorBoundary.tsx
  import { Component, ReactNode } from 'react';
  
  interface Props {
    children: ReactNode;
    fallback?: ReactNode;
  }
  
  interface State {
    hasError: boolean;
    error: Error | null;
  }
  
  export class ErrorBoundary extends Component<Props, State> {
    state = { hasError: false, error: null };
    
    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }
    
    componentDidCatch(error: Error, errorInfo: any) {
      console.error('Error boundary caught:', error, errorInfo);
      // Send to error tracking service
    }
    
    render() {
      if (this.state.hasError) {
        return this.props.fallback || <ErrorFallback error={this.state.error} />;
      }
      return this.props.children;
    }
  }
  ```

- [ ] **Wrap App component**
  ```typescript
  // src/main.tsx
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
  ```

- [ ] **Create error fallback UI**
  - [ ] Create `src/components/ErrorFallback.tsx`
  - [ ] Design user-friendly error page
  - [ ] Add "Report Issue" button

---

## Week 2: Role Migration

### Priority Files (Fix First)
- [ ] **src/pages/UpdateLecture.tsx**
  ```typescript
  // Line 24 - Replace:
  const canUpdate = user?.role === 'Teacher';
  // With:
  const userRole = useInstituteRole();
  const canUpdate = userRole === 'Teacher';
  ```

- [ ] **src/pages/UpdateHomework.tsx**
  ```typescript
  // Line 23 - Same fix as above
  ```

- [ ] **src/pages/SubjectSubmissions.tsx**
  ```typescript
  // Lines 31, 91 - Replace:
  if (user?.role !== 'Student') { ... }
  // With:
  const userRole = useInstituteRole();
  if (userRole !== 'Student') { ... }
  ```

- [ ] **src/pages/SubjectPayments.tsx**
  ```typescript
  // Lines 541, 563 - Same pattern
  ```

- [ ] **src/hooks/useEffectiveRole.ts**
  ```typescript
  // DEPRECATED: Remove this file
  // All usage should be replaced with useInstituteRole
  ```

### Remaining Components (Batch Process)
Create a script to help find and replace:

```typescript
// scripts/findRoleUsage.ts
import { glob } from 'glob';
import { readFileSync } from 'fs';

const files = glob.sync('src/**/*.{ts,tsx}');
const roleUsageFiles: string[] = [];

files.forEach(file => {
  const content = readFileSync(file, 'utf-8');
  if (content.includes('user?.role') && !file.includes('useInstituteRole.ts')) {
    roleUsageFiles.push(file);
  }
});

console.log('Files with user?.role usage:');
roleUsageFiles.forEach(f => console.log(`  - ${f}`));
console.log(`\nTotal: ${roleUsageFiles.length} files`);
```

- [ ] Run the script: `bun run scripts/findRoleUsage.ts`
- [ ] Fix each file systematically
- [ ] Test each component after fixing

### Testing Role Changes
- [ ] **Create test user accounts**
  - [ ] Admin in Institute A, Student in Institute B
  - [ ] Teacher in Institute A, Parent in Institute B
  - [ ] Student in multiple institutes

- [ ] **Test scenarios**
  - [ ] Login as multi-role user
  - [ ] Switch between institutes
  - [ ] Verify correct permissions per institute
  - [ ] Check all protected features

- [ ] **Create automated tests**
  ```typescript
  // tests/roleAuthorization.test.ts
  describe('Role Authorization', () => {
    it('should use institute role, not login role', () => {
      // Test implementation
    });
  });
  ```

---

## Week 3: Token Security

### Development Environment
- [ ] **Implement secure token storage**
  - [ ] Create `src/utils/tokenStorage.ts` (see BUG_FIXES_EXAMPLES.md)
  - [ ] Add token expiration
  - [ ] Add automatic cleanup

- [ ] **Update AuthContext**
  ```typescript
  // Replace localStorage.setItem
  // With tokenStorage.setToken
  ```

- [ ] **Update API client**
  ```typescript
  // Replace localStorage.getItem
  // With tokenStorage.getToken
  ```

### Production Planning (Backend Required)
- [ ] **Document httpOnly cookie requirements**
  ```markdown
  Backend must:
  1. Set httpOnly cookie on login response
  2. Include CSRF token in response
  3. Validate CSRF on state-changing requests
  4. Set secure flag in production
  5. Set SameSite=Strict or Lax
  ```

- [ ] **Update frontend for cookies**
  ```typescript
  // All fetch calls need:
  fetch(url, {
    credentials: 'include',
    headers: {
      'X-CSRF-Token': getCsrfToken()
    }
  })
  ```

---

## Week 4: Pagination Completion

### Create Tracking Spreadsheet
Track component pagination status:

| Component | Status | Priority | Assignee | Completed |
|-----------|--------|----------|----------|-----------|
| Students.tsx | ❌ | High | | |
| Teachers.tsx | ❌ | High | | |
| Subjects.tsx | ❌ | High | | |
| Exams.tsx | ❌ | Medium | | |
| Results.tsx | ❌ | Medium | | |
| Lectures.tsx | ❌ | Medium | | |
| Parents.tsx | ❌ | Low | | |

### Implementation Pattern
For each component:

1. **Import hook**
   ```typescript
   import { useTableData } from '@/hooks/useTableData';
   ```

2. **Replace manual state**
   ```typescript
   // Remove:
   const [data, setData] = useState([]);
   const [loading, setLoading] = useState(false);
   
   // Add:
   const { 
     state: { data, loading, error },
     pagination,
     actions: { refresh }
   } = useTableData({
     endpoint: '/api/endpoint',
     defaultParams: { instituteId },
     pagination: { defaultLimit: 50 }
   });
   ```

3. **Update table component**
   ```typescript
   <MUITable
     data={data}
     loading={loading}
     page={pagination.page}
     rowsPerPage={pagination.limit}
     totalCount={pagination.totalCount}
     onPageChange={pagination.actions.setPage}
     onRowsPerPageChange={pagination.actions.setLimit}
   />
   ```

4. **Test pagination**
   - [ ] Verify data loads
   - [ ] Test page navigation
   - [ ] Test changing page size
   - [ ] Check total count accuracy

---

## Week 5: Error Handling Standardization

### Create Error Types
- [ ] **Define error classes**
  ```typescript
  // src/utils/errors.ts
  export class AppError extends Error {
    constructor(
      message: string,
      public code: string,
      public statusCode?: number,
      public originalError?: any
    ) {
      super(message);
      this.name = 'AppError';
    }
  }
  
  export class AuthError extends AppError {
    constructor(message: string) {
      super(message, 'AUTH_ERROR', 401);
    }
  }
  
  export class ValidationError extends AppError {
    constructor(message: string, public fields?: string[]) {
      super(message, 'VALIDATION_ERROR', 400);
    }
  }
  ```

### Update API Client
- [ ] **Centralized error handling**
  ```typescript
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json();
      
      switch (response.status) {
        case 401:
          throw new AuthError(error.message);
        case 400:
          throw new ValidationError(error.message, error.fields);
        case 404:
          throw new AppError(error.message, 'NOT_FOUND', 404);
        default:
          throw new AppError(error.message, 'API_ERROR', response.status);
      }
    }
    
    return await response.json();
  }
  ```

### Component Updates
- [ ] **Replace try-catch blocks**
  - Use standardized error handling pattern
  - Show user-friendly messages
  - Log errors appropriately
  - Track in monitoring service

---

## Week 6: Testing Infrastructure

### Setup Testing Framework
- [ ] **Install dependencies**
  ```bash
  bun add -D vitest @testing-library/react @testing-library/jest-dom
  bun add -D @testing-library/user-event @vitest/ui
  ```

- [ ] **Configure Vitest**
  ```typescript
  // vitest.config.ts
  import { defineConfig } from 'vitest/config';
  import react from '@vitejs/plugin-react';
  
  export default defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html']
      }
    }
  });
  ```

- [ ] **Setup test utilities**
  ```typescript
  // src/setupTests.ts
  import '@testing-library/jest-dom';
  import { expect, afterEach } from 'vitest';
  import { cleanup } from '@testing-library/react';
  
  afterEach(() => {
    cleanup();
  });
  ```

### Write Critical Tests
- [ ] **Authentication tests**
  ```typescript
  // src/__tests__/auth.test.ts
  describe('Authentication', () => {
    it('should login successfully', async () => {
      // Test implementation
    });
    
    it('should handle invalid credentials', async () => {
      // Test implementation
    });
    
    it('should logout and clear tokens', async () => {
      // Test implementation
    });
  });
  ```

- [ ] **Role authorization tests**
  ```typescript
  // src/__tests__/roleAuthorization.test.ts
  describe('Role Authorization', () => {
    it('should show correct UI based on institute role', () => {
      // Test implementation
    });
  });
  ```

- [ ] **Component tests**
  - Students component
  - Classes component
  - Attendance component
  - Homework component

---

## Week 7: Performance Optimization

### Code Splitting
- [ ] **Lazy load routes**
  ```typescript
  const Dashboard = lazy(() => import('@/components/Dashboard'));
  const Students = lazy(() => import('@/components/Students'));
  
  <Suspense fallback={<LoadingSkeleton />}>
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/students" element={<Students />} />
    </Routes>
  </Suspense>
  ```

- [ ] **Lazy load heavy components**
  - Gallery components
  - Chart components
  - PDF viewers
  - Image editors

### React Optimization
- [ ] **Add React.memo**
  ```typescript
  export const StudentRow = React.memo(({ student }) => {
    return <tr>{/* ... */}</tr>;
  });
  ```

- [ ] **Use useMemo/useCallback**
  ```typescript
  const sortedStudents = useMemo(
    () => students.sort(compareFn),
    [students]
  );
  
  const handleClick = useCallback(() => {
    doSomething();
  }, [dependency]);
  ```

### Bundle Analysis
- [ ] **Install bundle analyzer**
  ```bash
  bun add -D rollup-plugin-visualizer
  ```

- [ ] **Analyze bundle**
  ```bash
  bun run build
  # Check dist/stats.html
  ```

- [ ] **Optimize large dependencies**
  - Tree-shake unused code
  - Replace heavy libraries
  - Split vendor chunks

---

## Week 8: Documentation & Polish

### Documentation
- [ ] **Create ARCHITECTURE.md**
  - System overview
  - Data flow diagrams
  - Authentication flow
  - Role hierarchy
  - API structure

- [ ] **Add JSDoc comments**
  - All components
  - All hooks
  - All utilities
  - All API functions

- [ ] **Update README.md**
  - Project overview
  - Setup instructions
  - Development guide
  - Deployment guide
  - Testing guide

### Code Quality
- [ ] **Enable TypeScript strict mode**
  ```json
  {
    "compilerOptions": {
      "strict": true,
      "noImplicitAny": true,
      "strictNullChecks": true,
      "noUnusedLocals": true,
      "noUnusedParameters": true
    }
  }
  ```

- [ ] **Fix TypeScript errors**
- [ ] **Setup pre-commit hooks**
  ```bash
  bun add -D husky lint-staged
  bunx husky init
  ```

- [ ] **Configure lint-staged**
  ```json
  {
    "lint-staged": {
      "*.{ts,tsx}": [
        "eslint --fix",
        "prettier --write"
      ]
    }
  }
  ```

### Final Checks
- [ ] **Security audit**
  ```bash
  bun audit
  ```

- [ ] **Performance audit**
  - Lighthouse score
  - Bundle size
  - Load time
  - Time to interactive

- [ ] **Accessibility audit**
  - WCAG compliance
  - Keyboard navigation
  - Screen reader support

- [ ] **Browser testing**
  - Chrome
  - Firefox
  - Safari
  - Edge

---

## 🎯 Definition of Done

Each task is complete when:
- [ ] Code changes implemented
- [ ] Tests written and passing
- [ ] Code reviewed by peer
- [ ] Documentation updated
- [ ] No new errors in console
- [ ] Performance impact assessed
- [ ] Changes deployed to staging
- [ ] QA testing passed

---

## 📊 Progress Tracking

Create a Kanban board with columns:
- 📋 **To Do**
- 🏗️ **In Progress**
- 👀 **In Review**
- ✅ **Done**

Update daily and hold weekly reviews.

---

## 🚨 Rollback Plan

If issues arise:
1. Immediately revert problematic changes
2. Document what went wrong
3. Create incident report
4. Plan fix with more testing
5. Re-deploy with caution

---

**Last Updated:** October 14, 2025  
**Next Review:** Weekly on Fridays
