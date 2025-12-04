import { apiClient } from './client';
import { enhancedCachedClient } from './enhancedCachedClient';

// Request/Response Types
export interface SelfEnrollRequest {
  enrollmentKey: string;
}

export interface SelfEnrollResponse {
  message: string;
  instituteId: string;
  classId: string;
  subjectId: string;
  subjectName: string;
  className: string;
  enrollmentMethod: string;
  enrolledAt: string;
}

export interface TeacherAssignRequest {
  studentIds: string[];
}

export interface TeacherAssignResponse {
  message: string;
  successCount: number;
  failedCount: number;
  successfulAssignments: Array<{
    studentId: string;
    studentName: string;
    status: string;
  }>;
  failedAssignments: Array<{
    studentId: string;
    studentName?: string;
    status: string;
    reason: string;
  }>;
}

export interface EnrollmentSettingsRequest {
  enrollmentEnabled: boolean;
}

export interface EnrollmentSettingsResponse {
  instituteId: string;
  classId: string;
  subjectId: string;
  subjectName: string;
  className: string;
  enrollmentEnabled: boolean;
  enrollmentKey?: string;
  currentEnrollmentCount: number;
  updatedAt: string;
}

export class ApiError extends Error {
  constructor(public status: number, public response: any) {
    const errorMessages: Record<number, string> = {
      400: "Invalid request. Please check your input.",
      401: "Authentication required. Please log in.",
      403: "You don't have permission for this action.",
      404: "Resource not found or enrollment disabled.",
      409: "Enrollment conflict (already enrolled).",
      500: "Server error. Please try again later."
    };
    
    super(errorMessages[status] || 'An unexpected error occurred');
  }
}

export interface EnrollmentQueryParams {
  userId?: string;
  role?: string;
  instituteId?: string;
  classId?: string;
  subjectId?: string;
}

export const enrollmentApi = {
  // Student self-enrollment with auto-invalidation
  async selfEnroll(enrollmentKey: string, params?: EnrollmentQueryParams): Promise<SelfEnrollResponse> {
    try {
      return await enhancedCachedClient.post('/institute-class-subject-students/self-enroll', {
        enrollmentKey
      }, {
        userId: params?.userId,
        instituteId: params?.instituteId,
        classId: params?.classId,
        subjectId: params?.subjectId
      });
    } catch (error: any) {
      throw new ApiError(error.status || 500, error.response || error);
    }
  },

  // Teacher assigns students with auto-invalidation
  async teacherAssignStudents(
    instituteId: string,
    classId: string,
    subjectId: string,
    studentIds: string[],
    params?: EnrollmentQueryParams
  ): Promise<TeacherAssignResponse> {
    try {
      return await enhancedCachedClient.post(
        `/institute-class-subject-students/teacher-assign/${instituteId}/${classId}/${subjectId}`,
        { studentIds },
        {
          userId: params?.userId,
          instituteId,
          classId,
          subjectId,
          role: params?.role
        }
      );
    } catch (error: any) {
      throw new ApiError(error.status || 500, error.response || error);
    }
  },

  // Update enrollment settings with auto-invalidation
  async updateEnrollmentSettings(
    instituteId: string,
    classId: string,
    subjectId: string,
    enrollmentEnabled: boolean,
    params?: EnrollmentQueryParams
  ): Promise<EnrollmentSettingsResponse> {
    try {
      return await enhancedCachedClient.patch(
        `/institute-class-subject-students/enrollment-settings/${instituteId}/${classId}/${subjectId}`,
        { enrollmentEnabled },
        {
          userId: params?.userId,
          instituteId,
          classId,
          subjectId,
          role: params?.role
        }
      );
    } catch (error: any) {
      throw new ApiError(error.status || 500, error.response || error);
    }
  },

  // Get enrollment settings with enhanced caching
  async getEnrollmentSettings(
    instituteId: string,
    classId: string,
    subjectId: string,
    params?: EnrollmentQueryParams,
    forceRefresh = false
  ): Promise<EnrollmentSettingsResponse> {
    try {
      return await enhancedCachedClient.get(
        `/institute-class-subject-students/enrollment-settings/${instituteId}/${classId}/${subjectId}`,
        undefined,
        {
          forceRefresh,
          ttl: 20,
          useStaleWhileRevalidate: true,
          userId: params?.userId,
          instituteId,
          classId,
          subjectId,
          role: params?.role
        }
      );
    } catch (error: any) {
      throw new ApiError(error.status || 500, error.response || error);
    }
  }
};