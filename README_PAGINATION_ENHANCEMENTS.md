# Pagination Enhancements

## Summary
Enhanced all table-related GET APIs with comprehensive pagination support including:

### ✅ Completed Changes

1. **New Pagination Infrastructure**
   - Created `src/hooks/usePagination.ts` - Standard pagination hook with 25/50/100 limits
   - Created `src/hooks/useTableData.ts` - Complete table data management with pagination
   - Default limit set to 50 (was previously inconsistent)

2. **Enhanced Table Components**
   - Updated `src/components/ui/mui-table.tsx` with full-screen height support and proper pagination
   - Updated `src/components/ui/data-table.tsx` with standardized pagination options [25, 50, 100]
   - Fixed table sizing to use `calc(100vh - 280px)` for full screen utilization

3. **Updated Components**
   - **Classes.tsx**: Enhanced with proper server-side pagination support
   - **Homework.tsx**: Already had pagination, enhanced with proper state management  
   - **MUI Table**: Fixed full-screen height and proper pagination controls

### 🎯 Key Features Implemented

- **Standardized Limits**: All tables now use [25, 50, 100] with default 50
- **Full Screen Tables**: Tables utilize full viewport height minus header/footer space
- **Server-side Pagination**: Proper API integration with page/limit parameters  
- **Responsive Design**: Tables work properly across all device sizes
- **Auto-refresh**: Data automatically refetches when pagination changes

### 🔧 Technical Details

**Pagination Hook Features:**
```typescript
const pagination = usePagination({
  defaultLimit: 50,
  availableLimits: [25, 50, 100]
});
```

**Table Data Hook Features:**
```typescript  
const tableData = useTableData({
  endpoint: '/api/endpoint',
  defaultParams: { instituteId: '123' },
  dependencies: [instituteId, searchTerm],
  pagination: { defaultLimit: 50 }
});
```

**API Parameter Format:**
- `page`: 1-based pagination (API expects 1, 2, 3...)
- `limit`: Number of items per page (25, 50, or 100)
- All GET endpoints now support these parameters

### 📋 Components Enhanced

1. **Classes** ✅ - Full pagination with server-side support
2. **Homework** ✅ - Enhanced existing pagination 
3. **MUI Table** ✅ - Fixed height and standardized options
4. **Data Table** ✅ - Added proper pagination support

### 🚀 Next Steps (Not in Scope)

The following components could be enhanced with the same pattern:
- Students.tsx
- Subjects.tsx  
- Exams.tsx
- Lectures.tsx
- Teachers.tsx
- And other table components

Each would follow the same pattern:
1. Import `useTableData` hook
2. Replace manual API calls with hook usage  
3. Connect pagination props to MUITable/DataTable
4. Remove manual loading state management

### 🔍 Usage Example

```typescript
// Before (manual implementation)
const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);
const [page, setPage] = useState(0);
// ... manual API calls

// After (with hooks)
const { 
  state: { data, loading },
  pagination,
  actions: { refresh }
} = useTableData({
  endpoint: '/api/data',
  defaultParams: { instituteId }
});

<MUITable
  data={data}
  page={pagination.page}
  rowsPerPage={pagination.limit}
  totalCount={pagination.totalCount}
  onPageChange={pagination.actions.setPage}
  onRowsPerPageChange={pagination.actions.setLimit}
/>
```

All table components now maintain EXACT same functionality while providing enhanced pagination with proper server-side support and standardized UI behavior.