import { cachedApiClient } from './cachedClient';
import { enhancedCachedClient } from './enhancedCachedClient';
import { ApiResponse } from './client';

export interface Lecture {
  id: string;
  instituteId: string;
  classId?: string;
  subjectId?: string;
  instructorId: string;
  title: string;
  description: string;
  lectureType: 'online' | 'physical';
  venue?: string;
  subject?: string;
  startTime?: string;
  endTime?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'in_progress';
  meetingLink?: string;
  meetingId?: string;
  meetingPassword?: string;
  recordingUrl?: string;
  isRecorded: boolean;
  maxParticipants: number;
  isActive: boolean;
}

export interface LectureCreateData {
  instituteId: string;
  classId?: string;
  subjectId?: string;
  instructorId: string;
  title: string;
  description: string;
  lectureType: 'online' | 'physical';
  venue?: string | null;
  subject?: string;
  startTime?: string | null;
  endTime?: string | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'in_progress';
  meetingLink?: string | null;
  meetingId?: string | null;
  meetingPassword?: string | null;
  recordingUrl?: string | null;
  isRecorded: boolean;
  maxParticipants: number;
  isActive: boolean;
}

export interface LectureQueryParams {
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

class LectureApi {
  async getLectures(params?: LectureQueryParams, forceRefresh = false): Promise<ApiResponse<Lecture[]>> {
    console.log('📚 Fetching lectures with secure caching:', params, { forceRefresh });
    return enhancedCachedClient.get<ApiResponse<Lecture[]>>('/institute-class-subject-lectures', params, {
      forceRefresh,
      ttl: 10, // Cache lectures for 10 minutes (they change frequently)
      useStaleWhileRevalidate: true,
      userId: params?.userId,
      instituteId: params?.instituteId,
      classId: params?.classId,
      subjectId: params?.subjectId,
      role: params?.role
    });
  }

  async getInstituteLectures(params?: LectureQueryParams, forceRefresh = false): Promise<ApiResponse<Lecture[]>> {
    console.log('📚 Fetching institute lectures with secure caching:', params, { forceRefresh });
    return enhancedCachedClient.get<ApiResponse<Lecture[]>>('/institute-lectures', params, {
      forceRefresh,
      ttl: 10,
      useStaleWhileRevalidate: true,
      userId: params?.userId,
      instituteId: params?.instituteId,
      role: params?.role
    });
  }

  async getLectureById(id: string, forceRefresh = false, context?: { instituteId?: string; classId?: string; subjectId?: string; userId?: string }): Promise<Lecture> {
    console.log('📄 Fetching lecture by ID with secure caching:', id, { forceRefresh, context });
    return enhancedCachedClient.get<Lecture>(`/institute-class-subject-lectures/${id}`, undefined, {
      forceRefresh,
      ttl: 10,
      useStaleWhileRevalidate: true,
      ...context
    });
  }

  async createLecture(data: LectureCreateData, isInstituteLecture: boolean = false): Promise<Lecture> {
    const endpoint = isInstituteLecture ? '/institute-lectures' : '/institute-class-subject-lectures';
    console.log('✏️ Creating lecture (will invalidate cache):', endpoint, data);
    return enhancedCachedClient.post<Lecture>(endpoint, data, {
      instituteId: data.instituteId,
      classId: data.classId,
      subjectId: data.subjectId
    });
  }

  async createInstituteLecture(data: LectureCreateData): Promise<Lecture> {
    console.log('✏️ Creating institute lecture (will invalidate cache):', data);
    return enhancedCachedClient.post<Lecture>('/institute-lectures', data, {
      instituteId: data.instituteId
    });
  }

  async updateInstituteLecture(id: string, data: Partial<LectureCreateData>, context?: { instituteId?: string }): Promise<Lecture> {
    console.log('📝 Updating institute lecture (will invalidate cache):', id, data);
    return enhancedCachedClient.patch<Lecture>(`/institute-lectures/${id}`, data, context);
  }

  async updateLecture(id: string, data: Partial<LectureCreateData>, context?: { instituteId?: string; classId?: string; subjectId?: string }): Promise<Lecture> {
    console.log('📝 Updating lecture (will invalidate cache):', id, data);
    return enhancedCachedClient.patch<Lecture>(`/institute-class-subject-lectures/${id}`, data, context);
  }

  async deleteLecture(id: string, context?: { instituteId?: string; classId?: string; subjectId?: string }): Promise<void> {
    console.log('🗑️ Deleting lecture (will invalidate cache):', id);
    return enhancedCachedClient.delete<void>(`/institute-class-subject-lectures/${id}`, context);
  }

  async deleteInstituteLecturePermanent(id: string, context?: { instituteId?: string }): Promise<any> {
    console.log('🗑️ Permanently deleting institute lecture (will invalidate cache):', id);
    return enhancedCachedClient.delete<any>(`/institute-lectures/${id}/permanent`, context);
  }

  async hasLecturesCached(params?: LectureQueryParams): Promise<boolean> {
    return enhancedCachedClient.hasCache('/institute-class-subject-lectures', params, {
      userId: params?.userId,
      instituteId: params?.instituteId,
      classId: params?.classId,
      subjectId: params?.subjectId
    });
  }

  async getCachedLectures(params?: LectureQueryParams): Promise<ApiResponse<Lecture[]> | null> {
    return enhancedCachedClient.getCachedOnly<ApiResponse<Lecture[]>>('/institute-class-subject-lectures', params, {
      userId: params?.userId,
      instituteId: params?.instituteId,
      classId: params?.classId,
      subjectId: params?.subjectId
    });
  }

  async preloadLectures(params?: LectureQueryParams): Promise<void> {
    await enhancedCachedClient.preload<ApiResponse<Lecture[]>>('/institute-class-subject-lectures', params, {
      ttl: 10,
      userId: params?.userId,
      instituteId: params?.instituteId,
      classId: params?.classId,
      subjectId: params?.subjectId
    });
  }
}

export const lectureApi = new LectureApi();
