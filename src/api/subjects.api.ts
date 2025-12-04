import { enhancedCachedClient } from './enhancedCachedClient';

export interface Subject {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  creditHours: number;
  isActive: boolean;
  subjectType: string;
  basketCategory: string;
  instituteType: string | null;
  imgUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectsResponse {
  data: Subject[];
  total?: number;
  page?: number;
  limit?: number;
}

export interface SubjectQueryParams {
  userId?: string;
  role?: string;
  instituteId?: string;
  classId?: string;
  subjectId?: string;
}

export const subjectsApi = {
  // Get all subjects for an institute
  getAll: (instituteId: string, params?: SubjectQueryParams, forceRefresh = false) => {
    return enhancedCachedClient.get<Subject[]>(`/subjects/institute/${instituteId}`, undefined, {
      ttl: 20,
      forceRefresh,
      useStaleWhileRevalidate: true,
      userId: params?.userId,
      instituteId,
      classId: params?.classId,
      subjectId: params?.subjectId,
      role: params?.role
    });
  },

  // Get a single subject by ID
  getById: (id: string, params?: SubjectQueryParams, forceRefresh = false) => {
    return enhancedCachedClient.get<Subject>(`/subjects/${id}`, undefined, {
      ttl: 20,
      forceRefresh,
      useStaleWhileRevalidate: true,
      userId: params?.userId,
      instituteId: params?.instituteId,
      classId: params?.classId,
      subjectId: id,
      role: params?.role
    });
  },

  // Create a new subject (handled directly in CreateSubjectForm due to FormData)
  create: (data: FormData) => {
    // This is handled directly in the form component due to FormData requirements
    throw new Error('Subject creation is handled directly in CreateSubjectForm component');
  },

  // Update a subject
  update: (id: string, data: Partial<Subject>, instituteId?: string) => {
    return enhancedCachedClient.patch<Subject>(`/subjects/${id}`, data, {
      instituteId,
      subjectId: id
    });
  },

  // Delete a subject
  delete: (id: string, instituteId?: string) => {
    return enhancedCachedClient.delete<void>(`/subjects/${id}`, {
      instituteId,
      subjectId: id
    });
  },

  // Check if subjects are cached
  hasCache: (instituteId: string, params?: SubjectQueryParams) => {
    return enhancedCachedClient.hasCache(`/subjects/institute/${instituteId}`, undefined, {
      userId: params?.userId,
      instituteId,
      classId: params?.classId,
      subjectId: params?.subjectId,
      role: params?.role
    });
  },

  // Get cached subjects
  getCached: (instituteId: string, params?: SubjectQueryParams) => {
    return enhancedCachedClient.getCachedOnly<Subject[]>(`/subjects/institute/${instituteId}`, undefined, {
      userId: params?.userId,
      instituteId,
      classId: params?.classId,
      subjectId: params?.subjectId,
      role: params?.role
    });
  },

  // Preload subjects
  preload: async (instituteId: string, params?: SubjectQueryParams) => {
    await enhancedCachedClient.get<Subject[]>(`/subjects/institute/${instituteId}`, undefined, {
      ttl: 20,
      userId: params?.userId,
      instituteId,
      classId: params?.classId,
      subjectId: params?.subjectId,
      role: params?.role
    });
  }
};