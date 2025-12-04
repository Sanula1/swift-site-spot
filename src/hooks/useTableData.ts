import { useState, useEffect, useCallback } from 'react';
import { usePagination, UsePaginationReturn } from './usePagination';
import { cachedApiClient } from '@/api/cachedClient';

export interface TableDataConfig {
  endpoint: string;
  defaultParams?: Record<string, any>;
  cacheOptions?: {
    ttl?: number;
    forceRefresh?: boolean;
    userId?: string;
    role?: string;
    instituteId?: string;
    classId?: string;
    subjectId?: string;
  };
  dependencies?: any[];
  pagination?: {
    defaultLimit?: number;
    availableLimits?: number[];
  };
  autoLoad?: boolean; // if false, data is only loaded when actions.loadData/refresh are called
}

export interface TableDataState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  lastRefresh: Date | null;
}

export interface TableDataActions {
  refresh: () => Promise<void>;
  loadData: (forceRefresh?: boolean) => Promise<void>;
  updateFilters: (filters: Record<string, any>) => void;
}

export interface UseTableDataReturn<T> extends UsePaginationReturn {
  state: TableDataState<T>;
  actions: TableDataActions & UsePaginationReturn['actions'];
  filters: Record<string, any>;
}

export const useTableData = <T = any>(config: TableDataConfig): UseTableDataReturn<T> => {
  const pagination = usePagination(config.pagination);
  const [filters, setFilters] = useState<Record<string, any>>(config.defaultParams || {});
  
  const [state, setState] = useState<TableDataState<T>>({
    data: [],
    loading: false,
    error: null,
    lastRefresh: null
  });

  const buildParams = useCallback(() => {
    const apiParams = pagination.getApiParams();
    return {
      ...config.defaultParams,
      ...filters,
      ...apiParams
    };
  }, [filters, pagination, config.defaultParams]);

  const loadData = useCallback(async (forceRefresh = false) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const params = buildParams();
      console.log(`📥 Loading data from ${config.endpoint}:`, params);
      
      const result = await cachedApiClient.get(
        config.endpoint, 
        params, 
        {
          ttl: config.cacheOptions?.ttl || 15,
          forceRefresh,
          userId: config.cacheOptions?.userId,
          role: config.cacheOptions?.role,
          instituteId: config.cacheOptions?.instituteId,
          classId: config.cacheOptions?.classId,
          subjectId: config.cacheOptions?.subjectId
        }
      );

      console.log('✅ Table data loaded successfully:', result);
      
      // Handle various API response formats
      let data, total;
      if (result?.data?.submissions) {
        // Institute payment submissions API format
        data = result.data.submissions;
        total = result.data.pagination?.totalItems || data.length;
      } else if (result?.data?.payments) {
        // Institute payments API format
        data = result.data.payments;
        total = result.data.pagination?.totalItems || data.length;
      } else if ((result as any)?.items) {
        // SMS history API format {items, total, page, limit, totalPages}
        data = (result as any).items;
        total = (result as any).total || data.length;
      } else if ((result as any)?.messages) {
        // Enhanced SMS history API format
        data = (result as any).messages;
        total = (result as any).total || data.length;
      } else if (Array.isArray(result)) {
        // Direct array response
        data = result;
        total = result.length;
      } else {
        // Generic paginated response
        data = (result as any)?.data || [];
        total = (result as any)?.meta?.total || data.length;
      }
      
      pagination.actions.setTotalCount(total);
      
      setState(prev => ({
        ...prev,
        data,
        loading: false,
        lastRefresh: new Date()
      }));
      
    } catch (error) {
      console.error(`Failed to load data from ${config.endpoint}:`, error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load data'
      }));
    }
  }, [buildParams, config.endpoint, config.cacheOptions, pagination]);

  const refresh = useCallback(() => loadData(true), [loadData]);

const updateFilters = useCallback((newFilters: Record<string, any>) => {
  setFilters(prev => ({ ...prev, ...newFilters }));
  if (newFilters.page == null) {
    pagination.actions.setPage(0); // Reset to first page only when page isn't provided
  } else {
    // Keep pagination UI in sync when explicit page is provided (API is 1-based, UI is 0-based)
    const zeroBased = Math.max(0, Number(newFilters.page) - 1);
    pagination.actions.setPage(zeroBased);
  }
}, [pagination.actions]);

// Auto-load data when enabled and any dependency changes
useEffect(() => {
  if (config.autoLoad === false) return;
  if (!config.endpoint) return;
  loadData(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, config.autoLoad !== false ? [config.endpoint, pagination.pagination.page, pagination.pagination.limit] : []);

  return {
    ...pagination,
    state,
    actions: {
      ...pagination.actions,
      refresh,
      loadData,
      updateFilters
    },
    filters
  };
};