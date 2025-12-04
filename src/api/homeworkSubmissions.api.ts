import { enhancedCachedClient } from './enhancedCachedClient';
import { apiClient } from './client';
import { ApiResponse } from './client';

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  studentId: string;
  submissionDate: string;
  fileUrl?: string;
  teacherCorrectionFileUrl?: string;
  remarks?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  homework?: {
    id: string;
    title: string;
    description: string;
  };
}

export interface HomeworkSubmissionCreateData {
  homeworkId: string;
  studentId: string;
  submissionDate: string;
  fileUrl?: string;
  teacherCorrectionFileUrl?: string;
  remarks?: string;
  isActive: boolean;
}

export interface HomeworkSubmissionQueryParams {
  page?: number;
  limit?: number;
  homeworkId?: string;
  studentId?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  userId?: string;
  role?: string;
  instituteId?: string;
  classId?: string;
  subjectId?: string;
}

class HomeworkSubmissionsApi {
  async submitHomework(
    homeworkId: string, 
    fileUrl: string,
    submissionData?: {
      submissionDate?: string;
      remarks?: string;
    }
  ): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    console.log('Submitting homework:', { homeworkId, fileUrl, submissionData });
    
    try {
      const response = await apiClient.post(
        `/institute-class-subject-homework-submissions/${homeworkId}/submit`,
        {
          fileUrl,
          submissionDate: submissionData?.submissionDate || new Date().toISOString(),
          remarks: submissionData?.remarks
        }
      );
      console.log('Homework submission successful:', response);
      return response;
    } catch (error: any) {
      console.error('Homework submission failed:', {
        homeworkId,
        error: error.message,
        status: error.status,
        response: error.response
      });
      throw error;
    }
  }

  async createSubmission(data: HomeworkSubmissionCreateData, params?: HomeworkSubmissionQueryParams): Promise<HomeworkSubmission> {
    console.log('Creating homework submission:', data);
    return enhancedCachedClient.post<HomeworkSubmission>('/institute-class-subject-homeworks-submissions', data, {
      userId: params?.userId,
      instituteId: params?.instituteId,
      classId: params?.classId,
      subjectId: params?.subjectId,
      role: params?.role
    });
  }

  async getSubmissions(params?: HomeworkSubmissionQueryParams, forceRefresh = false): Promise<ApiResponse<HomeworkSubmission[]>> {
    console.log('Fetching homework submissions:', params, { forceRefresh });
    return enhancedCachedClient.get<ApiResponse<HomeworkSubmission[]>>('/institute-class-subject-homeworks-submissions', params, {
      forceRefresh,
      ttl: 10,
      useStaleWhileRevalidate: true,
      userId: params?.userId,
      instituteId: params?.instituteId,
      classId: params?.classId,
      subjectId: params?.subjectId,
      role: params?.role
    });
  }

  async getStudentSubmissions(
    instituteId: string, 
    classId: string, 
    subjectId: string, 
    studentId: string, 
    params?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'ASC' | 'DESC'; userId?: string; role?: string },
    forceRefresh = false
  ): Promise<{ data: HomeworkSubmission[]; meta: any }> {
    console.log('Fetching student homework submissions:', { instituteId, classId, subjectId, studentId, params, forceRefresh });
    const queryParams = {
      instituteId,
      classId,
      subjectId,
      studentId,
      ...params
    };
    return enhancedCachedClient.get<{ data: HomeworkSubmission[]; meta: any }>('/institute-class-subject-homeworks-submissions', queryParams, {
      forceRefresh,
      ttl: 10,
      useStaleWhileRevalidate: true,
      userId: params?.userId || studentId,
      instituteId,
      classId,
      subjectId,
      role: params?.role
    });
  }

  async getSubmissionById(id: string, params?: HomeworkSubmissionQueryParams, forceRefresh = false): Promise<HomeworkSubmission> {
    console.log('Fetching homework submission by ID:', id, { forceRefresh });
    return enhancedCachedClient.get<HomeworkSubmission>(`/institute-class-subject-homeworks-submissions/${id}`, undefined, {
      forceRefresh,
      ttl: 10,
      userId: params?.userId,
      instituteId: params?.instituteId,
      classId: params?.classId,
      subjectId: params?.subjectId,
      role: params?.role
    });
  }

  async updateSubmission(id: string, data: Partial<HomeworkSubmissionCreateData>, params?: HomeworkSubmissionQueryParams): Promise<HomeworkSubmission> {
    console.log('Updating homework submission:', id, data);
    return enhancedCachedClient.patch<HomeworkSubmission>(`/institute-class-subject-homeworks-submissions/${id}`, data, {
      userId: params?.userId,
      instituteId: params?.instituteId,
      classId: params?.classId,
      subjectId: params?.subjectId,
      role: params?.role
    });
  }

  async deleteSubmission(id: string, params?: HomeworkSubmissionQueryParams): Promise<void> {
    console.log('Deleting homework submission:', id);
    return enhancedCachedClient.delete<void>(`/institute-class-subject-homeworks-submissions/${id}`, {
      userId: params?.userId,
      instituteId: params?.instituteId,
      classId: params?.classId,
      subjectId: params?.subjectId,
      role: params?.role
    });
  }
}

export const homeworkSubmissionsApi = new HomeworkSubmissionsApi();