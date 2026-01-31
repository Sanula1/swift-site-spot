import { apiClient } from './client';

export interface StructuredLecture {
  id: string;
  instituteId: string;
  classId: string;
  subjectId: string;
  subjectName?: string;
  grade: number;
  lessonNumber: number;
  lectureNumber: number;
  title: string;
  description?: string;
  lectureVideoUrl?: string;
  lectureLink?: string;
  documentUrls?: string[];
  coverImageUrl?: string;
  provider?: string;
  isActive: boolean;
  viewCount?: number;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStructuredLectureDto {
  instituteId: string;
  classId: string;
  subjectId: string;
  grade: number;
  lessonNumber?: number;
  lectureNumber?: number;
  title: string;
  description?: string;
  lectureVideoUrl?: string;
  lectureLink?: string;
  documentUrls?: string[];
  coverImageUrl?: string;
  provider?: string;
  isActive?: boolean;
}

export interface UpdateStructuredLectureDto {
  title?: string;
  description?: string;
  lectureVideoUrl?: string;
  lectureLink?: string;
  documentUrls?: string[];
  coverImageUrl?: string;
  provider?: string;
  isActive?: boolean;
  lessonNumber?: number;
  lectureNumber?: number;
}

export interface StructuredLecturesResponse {
  success: boolean;
  message?: string;
  data: StructuredLecture[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SingleLectureResponse {
  success: boolean;
  message?: string;
  data: StructuredLecture;
}

export interface LecturesBySubjectResponse {
  success: boolean;
  data: {
    subjectId: string;
    subjectName: string;
    lecturesByGrade: Record<string, {
      lessons: Array<{
        lessonNumber: number;
        lectures: Array<{
          lectureNumber: number;
          id: string;
          title: string;
          coverImageUrl?: string;
          viewCount?: number;
        }>;
      }>;
    }>;
    totalLectures: number;
  };
}

export interface StructuredLectureFilterParams {
  subjectId?: string;
  grade?: number;
  lessonNumber?: number;
  search?: string;
  isActive?: boolean;
  provider?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export const structuredLecturesApi = {
  /**
   * Create a new structured lecture
   * Access: SUPERADMIN, Institute Admin, Teacher
   */
  create: async (data: CreateStructuredLectureDto): Promise<SingleLectureResponse> => {
    const response = await apiClient.post('/structured-lectures', data);
    return response;
  },

  /**
   * Get all lectures with filtering and pagination
   * Access: SUPERADMIN (all), Institute Admin (institute), Teacher (own)
   */
  getAll: async (params?: StructuredLectureFilterParams): Promise<StructuredLecturesResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.subjectId) queryParams.append('subjectId', params.subjectId);
    if (params?.grade) queryParams.append('grade', params.grade.toString());
    if (params?.lessonNumber) queryParams.append('lessonNumber', params.lessonNumber.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params?.provider) queryParams.append('provider', params.provider);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const url = `/structured-lectures${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await apiClient.get(url);
    return response;
  },

  /**
   * Get a single lecture by ID
   * Access: SUPERADMIN, Institute Admin, Teacher (own), Student (enrolled)
   */
  getById: async (id: string): Promise<SingleLectureResponse> => {
    const response = await apiClient.get(`/structured-lectures/${id}`);
    return response;
  },

  /**
   * Update a lecture
   * Access: SUPERADMIN, Institute Admin (institute), Teacher (own)
   */
  update: async (id: string, data: UpdateStructuredLectureDto): Promise<SingleLectureResponse> => {
    const response = await apiClient.put(`/structured-lectures/${id}`, data);
    return response;
  },

  /**
   * Delete a lecture (soft delete)
   * Access: SUPERADMIN, Institute Admin (institute), Teacher (own)
   */
  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/structured-lectures/${id}`);
    return response;
  },

  /**
   * Get lectures by subject (hierarchical view)
   * Access: SUPERADMIN, Institute Admin, Teacher, Student (enrolled)
   */
  getBySubject: async (subjectId: string, grade?: number, isActive?: boolean): Promise<LecturesBySubjectResponse> => {
    const queryParams = new URLSearchParams();
    if (grade) queryParams.append('grade', grade.toString());
    if (isActive !== undefined) queryParams.append('isActive', isActive.toString());

    const url = `/structured-lectures/subject/${subjectId}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await apiClient.get(url);
    return response;
  },

  /**
   * Get lectures for institute context
   */
  getForInstitute: async (
    instituteId: string, 
    classId: string, 
    subjectId: string, 
    grade: number,
    params?: { page?: number; limit?: number }
  ): Promise<StructuredLecture[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('grade', grade.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `/api/structured-lectures/subject/${subjectId}?${queryParams.toString()}`;
    const baseUrl = import.meta.env.VITE_LMS_BASE_URL || 'https://lmsapi.suraksha.lk';
    const token = localStorage.getItem('access_token');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${baseUrl}${url}`, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }
};
