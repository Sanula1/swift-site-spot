# 🗺️ System Architecture & Issue Map

**Visual guide to understand the system structure and where issues exist**

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND APPLICATION                     │
│                  (React + TypeScript + Vite)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION LAYER                     │
│  ⚠️ ISSUE: Tokens in localStorage (XSS vulnerable)          │
│  ⚠️ ISSUE: No httpOnly cookies                              │
│  ⚠️ ISSUE: Credentials in .env (may be exposed)             │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│   AUTHORIZATION LAYER     │   │    API CLIENT LAYER       │
│  🔴 CRITICAL ISSUE:       │   │  ⚠️ ISSUE: Dual base URLs │
│  - 30+ files using        │   │  ⚠️ ISSUE: 100+ console  │
│    user?.role instead of  │   │     .log statements       │
│    useInstituteRole()     │   │  ⚠️ ISSUE: No interceptors│
│  - Wrong permissions!     │   └───────────────────────────┘
└───────────────────────────┘               │
                ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       COMPONENT LAYER                         │
│  440+ TSX Components                                          │
│                                                               │
│  ⚠️ ISSUES:                                                  │
│  - No error boundaries (crashes show blank screen)           │
│  - Large components (932 lines in AppContent.tsx)            │
│  - 16/20 tables missing pagination                           │
│  - No code splitting (slow initial load)                     │
│  - No memoization (unnecessary re-renders)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         DATA LAYER                            │
│  ⚠️ ISSUE: No test coverage (0%)                            │
│  ⚠️ ISSUE: Inconsistent state management                    │
│  ⚠️ ISSUE: API cache uses slow localStorage/IndexedDB       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔴 Critical Issue Map

### Issue Location Diagram

```
src/
├── 🔴 .env (Exposed credentials)
├── 🔴 contexts/
│   ├── 🔴 AuthContext.tsx (localStorage tokens)
│   └── utils/
│       └── 🔴 auth.api.ts (console.log tokens)
│
├── 🔴 api/
│   ├── 🔴 client.ts (console.log headers, dual URLs)
│   └── *.api.ts (100+ files with console.log)
│
├── 🔴 pages/
│   ├── 🔴 UpdateLecture.tsx (user?.role on line 24)
│   ├── 🔴 UpdateHomework.tsx (user?.role on line 23)
│   ├── 🔴 SubjectSubmissions.tsx (user?.role lines 31, 91)
│   └── 🔴 SubjectPayments.tsx (user?.role lines 541, 563)
│
├── 🔴 hooks/
│   ├── ✅ useInstituteRole.ts (CORRECT - use this!)
│   └── 🔴 useEffectiveRole.ts (WRONG - remove this!)
│
├── 🟡 components/ (440+ files)
│   ├── 🔴 AppContent.tsx (932 lines, needs refactor)
│   ├── 🔴 Students.tsx (needs pagination)
│   ├── 🔴 Teachers.tsx (needs pagination)
│   ├── 🔴 Subjects.tsx (needs pagination)
│   ├── 🔴 Exams.tsx (needs pagination)
│   ├── 🔴 Lectures.tsx (needs pagination)
│   ├── ✅ Classes.tsx (pagination done!)
│   └── ✅ Homework.tsx (pagination done!)
│
└── ❌ __tests__/ (MISSING - no tests!)
```

---

## 🎯 Component Dependency Graph

```
                    ┌──────────────┐
                    │   App.tsx    │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ AuthProvider │
                    │  🔴 Issues:  │
                    │  - Token     │
                    │    storage   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ AppContent   │
                    │  🔴 932 lines│
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   Dashboard   │  │   Students    │  │   Teachers    │
│  ✅ Good      │  │  🔴 Issues:   │  │  🔴 Issues:   │
│               │  │  - No paging  │  │  - No paging  │
│               │  │  - user?.role │  │  - user?.role │
└───────────────┘  └───────────────┘  └───────────────┘
```

---

## 📊 Data Flow Diagram

```
┌──────────┐        ┌──────────────┐        ┌─────────────┐
│  User    │───────▶│  Login Form  │───────▶│ Auth API    │
│  Action  │        │              │        │ 🔴 console  │
└──────────┘        └──────────────┘        │    .log     │
                                             └─────┬───────┘
                                                   │
                                                   ▼
                                        ┌──────────────────┐
                                        │  localStorage    │
                                        │  🔴 XSS risk!    │
                                        └──────────────────┘
                                                   │
        ┌──────────────────────────────────────────┘
        │
        ▼
┌───────────────┐        ┌──────────────┐        ┌─────────────┐
│ AuthContext   │───────▶│  Component   │───────▶│ Check Role  │
│ Provides:     │        │  Renders     │        │ 🔴 Wrong!   │
│ - user        │        │              │        │ user?.role  │
│ - institute   │        │              │        └─────────────┘
└───────────────┘        └──────────────┘
        │                                          ┌─────────────┐
        │                                          │ Should be:  │
        └─────────────────────────────────────────▶│ useInstitute│
                                                   │ Role()      │
                                                   └─────────────┘
```

---

## 🔄 Role Authorization Flow

### ❌ CURRENT (BROKEN):

```
User Login
    │
    ▼
Assign Global Role: "Teacher"
    │
    ▼
User selects Institute A
    │
    ▼
Fetch institute data
instituteUserType: "STUDENT"
    │
    ▼
Component checks: user?.role
    │
    ▼
Returns: "Teacher" ❌ WRONG!
    │
    ▼
Shows teacher features in Institute A ❌ INCORRECT!
```

### ✅ CORRECT (AFTER FIX):

```
User Login
    │
    ▼
Assign Global Role: "Teacher"
    │
    ▼
User selects Institute A
    │
    ▼
Fetch institute data
instituteUserType: "STUDENT"
    │
    ▼
Component calls: useInstituteRole()
    │
    ▼
Returns: "Student" ✅ CORRECT!
    │
    ▼
Shows student features in Institute A ✅ CORRECT!
```

---

## 🗺️ File Priority Map

### Fix Order (by severity):

```
Priority 0 (THIS WEEK):
🔴🔴🔴🔴🔴
├── .env (verify not in git)
├── contexts/AuthContext.tsx (token storage)
├── api/client.ts (console.log)
└── main.tsx (add error boundary)

Priority 1 (NEXT WEEK):
🔴🔴🔴🔴
├── pages/UpdateLecture.tsx
├── pages/UpdateHomework.tsx
├── pages/SubjectSubmissions.tsx
├── pages/SubjectPayments.tsx
└── hooks/useEffectiveRole.ts (remove)

Priority 2 (WEEK 3-4):
🔴🔴🔴
├── components/Students.tsx (pagination + role)
├── components/Teachers.tsx (pagination + role)
├── components/Subjects.tsx (pagination + role)
├── components/Exams.tsx (pagination + role)
└── components/Lectures.tsx (pagination + role)

Priority 3 (WEEK 5-8):
🟡🟡
├── All other components (role migration)
├── Testing infrastructure
├── Performance optimization
└── Documentation
```

---

## 📈 Progress Visualization

### Current State:

```
Security:       [░░░░░░░░░░] 0%   🔴 CRITICAL
Role Migration: [░░░░░░░░░░] 0%   🔴 CRITICAL
Pagination:     [██░░░░░░░░] 27%  🟡 IN PROGRESS
Error Handling: [░░░░░░░░░░] 0%   🔴 CRITICAL
Testing:        [░░░░░░░░░░] 0%   🔴 CRITICAL
Documentation:  [██████████] 100% ✅ COMPLETE
```

### Target State (8 weeks):

```
Security:       [██████████] 100% ✅
Role Migration: [██████████] 100% ✅
Pagination:     [██████████] 100% ✅
Error Handling: [████████░░] 80%  ✅
Testing:        [████████░░] 80%  ✅
Documentation:  [██████████] 100% ✅
```

---

## 🎯 Impact vs Effort Matrix

```
High Impact │
            │  ┌──────────────┐
            │  │  Security    │ ← FIX FIRST
            │  │  Fixes       │
            │  └──────────────┘
            │       
            │  ┌──────────────┐
            │  │ Role         │ ← FIX SECOND
            │  │ Migration    │
            │  └──────────────┘
            │
            │           ┌──────────────┐
            │           │ Pagination   │ ← FIX THIRD
            │           │              │
            │           └──────────────┘
            │
            │                      ┌──────────────┐
            │                      │ Refactoring  │ ← LATER
            │                      └──────────────┘
Low Impact  │
            └─────────────────────────────────────────
              Low Effort              High Effort
```

---

## 🔧 Technology Stack Map

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND STACK                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Build Tool:      Vite ✅                                   │
│  Package Manager: Bun ✅                                    │
│  Framework:       React 18 ✅                               │
│  Language:        TypeScript ⚠️ (not strict mode)          │
│  UI Libraries:    - shadcn/ui ✅                            │
│                   - MUI ✅                                   │
│                   - Radix UI ✅                              │
│                   - Flowbite ⚠️ (redundant?)                │
│                   - RSuite ⚠️ (redundant?)                  │
│  State:           - React Context ✅                         │
│                   - useState/useReducer ✅                   │
│                   - ❌ No Redux/Zustand                      │
│  Routing:         React Router v6 ✅                         │
│  Forms:           React Hook Form ✅                         │
│  Validation:      Zod ✅                                     │
│  HTTP Client:     Native Fetch ⚠️ (should use axios)        │
│  Cache:           Custom IndexedDB/localStorage ⚠️          │
│  Testing:         ❌ NONE                                    │
│  Error Tracking:  ❌ NONE                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Deployment Pipeline (Proposed)

```
Developer          CI/CD Pipeline           Production
─────────          ──────────────           ──────────

Local Dev    ─┬──▶  Git Push
              │
              ├──▶  Run Linter
              │     ├─ ESLint
              │     └─ Prettier
              │
              ├──▶  Run Tests
              │     ├─ Unit Tests
              │     ├─ Integration Tests
              │     └─ E2E Tests
              │
              ├──▶  Security Scan
              │     ├─ Dependency Audit
              │     └─ Code Scan
              │
              ├──▶  Build
              │     └─ vite build
              │
              ├──▶  Deploy to Staging
              │     └─ Automated Tests
              │
              └──▶  Deploy to Production
                    (Manual Approval)

⚠️ CURRENT STATE: Missing all CI/CD steps!
```

---

## 📊 Component Size Heat Map

```
🔴 = Critical (>500 lines)
🟡 = Warning (200-500 lines)
🟢 = Good (<200 lines)

src/components/
├── 🔴 AppContent.tsx (932 lines!)
├── 🟡 Students.tsx (400 lines)
├── 🟡 Teachers.tsx (350 lines)
├── 🟡 Attendance.tsx (300 lines)
├── 🟢 Dashboard.tsx (150 lines)
└── ... (more components)

RECOMMENDATION: Split AppContent.tsx into:
- AppLayout.tsx (150 lines)
- AppRouter.tsx (200 lines)
- ProtectedRoute.tsx (80 lines)
- Navigation.tsx (100 lines)
```

---

## 🎭 User Roles Hierarchy

```
                ┌──────────────┐
                │ SystemAdmin  │
                │ (Super User) │
                └──────┬───────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
┌────────────────┐          ┌──────────────────┐
│ Organization   │          │ Institute        │
│ Manager        │          │ Admin            │
│ (Org Level)    │          │ (Institute Level)│
└────────────────┘          └────────┬─────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
            ┌───────────┐    ┌───────────┐   ┌───────────┐
            │  Teacher  │    │  Student  │   │  Parent   │
            └───────────┘    └───────────┘   └───────────┘
                    │                ▼
                    └──────────▶ ┌───────────────┐
                                 │ Attendance    │
                                 │ Marker        │
                                 └───────────────┘

🔴 CRITICAL: Must use useInstituteRole() to get institute-specific role!
```

---

## 📚 Quick Reference Symbols

```
✅ = Working correctly
⚠️ = Needs attention
🔴 = Critical issue
🟡 = Warning
🟢 = Good
❌ = Missing/Not implemented
🚀 = Priority fix
📊 = Metrics/Data
🔧 = Technical
💰 = Budget/Cost
👥 = Team/People
📅 = Timeline
```

---

For detailed information, see:
- [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)
- [SYSTEM_ANALYSIS.md](./SYSTEM_ANALYSIS.md)
- [ISSUES_SUMMARY.md](./ISSUES_SUMMARY.md)

**Last Updated:** October 14, 2025
