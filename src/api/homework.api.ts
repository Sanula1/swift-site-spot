import { cachedApiClient } from './cachedClient';
import { enhancedCachedClient } from './enhancedCachedClient';
import { ApiResponse } from './client';

export interface Homework {
  id: string;
  instituteId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  title: string;
  description: string;
  instructions?: string;
  startDate?: string;
  endDate?: string;
  maxMarks?: number;
  attachmentUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  teacher?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  subject?: {
    id: string;
    name: string;
    code: string;
  };
  class?: {
    id: string;
    name: string;
    code: string;
  };
  institute?: {
    id: string;
    name: string;
    code: string;
  };
  referenceLink?: string;
}

export interface HomeworkCreateData {
  instituteId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  title: string;
  description: string;
  instructions?: string;
  startDate?: string | null;
  dueDate?: string | null;
  maxMarks?: number | null;
  attachmentUrl?: string | null;
  isActive: boolean;
}

export interface HomeworkUpdateData extends Partial<HomeworkCreateData> {
  id: string;
}

export interface HomeworkQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  status?: string;
  instituteId?: string;
  classId?: string;
  subjectId?: string;
  isActive?: boolean;
  userId?: string;
  role?: string;
}

class HomeworkApi {
  /**
   * Get homework with enhanced caching
   * - Automatically caches based on context (institute/class/subject)
   * - Returns cached data immediately when navigating back
   * - Invalidates cache when homework is created/updated/deleted
   */
  async getHomework(params?: HomeworkQueryParams, forceRefresh = false): Promise<ApiResponse<Homework[]>> {
    console.log('📚 Fetching homework with secure caching:', params, { forceRefresh });
    
    return enhancedCachedClient.get<ApiResponse<Homework[]>>(
      '/institute-class-subject-homeworks', 
      params, 
      {
        forceRefresh,
        ttl: 15, // Cache for 15 minutes
        useStaleWhileRevalidate: true,
        userId: params?.userId,
        instituteId: params?.instituteId,
        classId: params?.classId,
        subjectId: params?.subjectId,
        role: params?.role
      }
    );
  }

  async getHomeworkById(id: string, forceRefresh = false, context?: { instituteId?: string; classId?: string; subjectId?: string; userId?: string }): Promise<Homework> {
    console.log('📄 Fetching homework by ID with secure caching:', id, { forceRefresh, context });
    return enhancedCachedClient.get<Homework>(
      `/institute-class-subject-homeworks/${id}`, 
      undefined, 
      {
        forceRefresh,
        ttl: 15,
        useStaleWhileRevalidate: true,
        ...context
      }
    );
  }

  async createHomework(data: HomeworkCreateData): Promise<Homework> {
    console.log('✏️ Creating homework (will invalidate cache):', data);
    return enhancedCachedClient.post<Homework>(
      '/institute-class-subject-homeworks', 
      data,
      {
        instituteId: data.instituteId,
        classId: data.classId,
        subjectId: data.subjectId
      }
    );
  }

  async updateHomework(id: string, data: Partial<HomeworkCreateData>): Promise<Homework> {
    console.log('📝 Updating homework (will invalidate cache):', id, data);
    return enhancedCachedClient.patch<Homework>(
      `/institute-class-subject-homeworks/${id}`, 
      data,
      {
        instituteId: data.instituteId,
        classId: data.classId,
        subjectId: data.subjectId
      }
    );
  }

  async deleteHomework(id: string, context?: { instituteId?: string; classId?: string; subjectId?: string }): Promise<void> {
    console.log('🗑️ Deleting homework (will invalidate cache):', id);
    return enhancedCachedClient.delete<void>(
      `/homework/${id}`,
      context
    );
  }

  /**
   * Check if homework is cached
   */
  async hasHomeworkCached(params?: HomeworkQueryParams): Promise<boolean> {
    return enhancedCachedClient.hasCache(
      '/institute-class-subject-homeworks', 
      params,
      {
        userId: params?.userId,
        instituteId: params?.instituteId,
        classId: params?.classId,
        subjectId: params?.subjectId
      }
    );
  }

  /**
   * Get cached homework only (no API call)
   */
  async getCachedHomework(params?: HomeworkQueryParams): Promise<ApiResponse<Homework[]> | null> {
    return enhancedCachedClient.getCachedOnly<ApiResponse<Homework[]>>(
      '/institute-class-subject-homeworks', 
      params,
      {
        userId: params?.userId,
        instituteId: params?.instituteId,
        classId: params?.classId,
        subjectId: params?.subjectId
      }
    );
  }

  /**
   * Preload homework data for faster navigation
   */
  async preloadHomework(params?: HomeworkQueryParams): Promise<void> {
    await enhancedCachedClient.preload<ApiResponse<Homework[]>>(
      '/institute-class-subject-homeworks', 
      params, 
      {
        ttl: 15,
        userId: params?.userId,
        instituteId: params?.instituteId,
        classId: params?.classId,
        subjectId: params?.subjectId
      }
    );
  }

  // Legacy method for backward compatibility
  async getLegacyHomework(params?: HomeworkQueryParams): Promise<ApiResponse<Homework[]>> {
    console.log('Fetching legacy homework with params:', params);
    return cachedApiClient.get<ApiResponse<Homework[]>>('/homework', params, {
      ttl: 15,
      useStaleWhileRevalidate: true
    });
  }
}

export const homeworkApi = new HomeworkApi();
