import { getAttendanceUrl, getBaseUrl, getApiHeaders } from '@/contexts/utils/auth.api';
import { enhancedCachedClient } from './enhancedCachedClient';

export interface StudentAttendanceRecord {
  attendanceId: string;
  studentId: string;
  studentName: string;
  instituteName: string;
  className: string;
  subjectName: string;
  address: string;
  markedBy: string;
  markedAt: string;
  markingMethod: string;
  status: 'present' | 'absent' | 'late';
}

export interface StudentAttendanceResponse {
  success: boolean;
  message: string;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    recordsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  data: StudentAttendanceRecord[];
  summary: {
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    attendanceRate: number;
  };
}

export interface StudentAttendanceParams {
  studentId: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  userId?: string;
  role?: string;
  instituteId?: string;
  classId?: string;
}

export const studentAttendanceApi = {
  getStudentAttendance: async (params: StudentAttendanceParams, forceRefresh = false): Promise<StudentAttendanceResponse> => {
    // Build query params
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    queryParams.append('page', (params.page || 1).toString());
    queryParams.append('limit', (params.limit || 50).toString());

    const endpoint = `/attendance/student/${params.studentId}?${queryParams.toString()}`;
    
    console.log('=== STUDENT ATTENDANCE API CALL ===');
    console.log('Endpoint:', endpoint);
    
    // Use enhancedCachedClient with context
    return enhancedCachedClient.get<StudentAttendanceResponse>(endpoint, undefined, {
      forceRefresh,
      ttl: 10,
      useStaleWhileRevalidate: true,
      userId: params.userId || params.studentId,
      instituteId: params.instituteId,
      classId: params.classId,
      role: params.role
    });
  },

  // Utility methods
  hasAttendanceCached: (params: StudentAttendanceParams) => {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    queryParams.append('page', (params.page || 1).toString());
    queryParams.append('limit', (params.limit || 50).toString());

    return enhancedCachedClient.hasCache(`/attendance/student/${params.studentId}?${queryParams.toString()}`, undefined, {
      userId: params.userId || params.studentId,
      instituteId: params.instituteId,
      classId: params.classId,
      role: params.role
    });
  },

  getCachedAttendance: (params: StudentAttendanceParams) => {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    queryParams.append('page', (params.page || 1).toString());
    queryParams.append('limit', (params.limit || 50).toString());

    return enhancedCachedClient.getCachedOnly<StudentAttendanceResponse>(`/attendance/student/${params.studentId}?${queryParams.toString()}`, undefined, {
      userId: params.userId || params.studentId,
      instituteId: params.instituteId,
      classId: params.classId,
      role: params.role
    });
  },

  preloadAttendance: async (params: StudentAttendanceParams) => {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    queryParams.append('page', (params.page || 1).toString());
    queryParams.append('limit', (params.limit || 50).toString());

    await enhancedCachedClient.get<StudentAttendanceResponse>(`/attendance/student/${params.studentId}?${queryParams.toString()}`, undefined, {
      ttl: 10,
      userId: params.userId || params.studentId,
      instituteId: params.instituteId,
      classId: params.classId,
      role: params.role
    });
  }
};