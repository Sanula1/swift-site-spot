import { enhancedCachedClient } from './enhancedCachedClient';
import { apiClient, ApiResponse } from './client';

// =================== TYPES ===================

export type SubmissionType = 'UPLOAD' | 'GOOGLE_DRIVE';

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  studentId: string;

  // Teacher/Admin view: student details included
  studentName?: string;
  studentEmail?: string;
  studentImageUrl?: string | null;

  submissionDate: string;
  fileUrl?: string;
  teacherCorrectionFileUrl?: string;
  remarks?: string;
  grade?: string;
  reviewedAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Google Drive fields
  submissionType?: SubmissionType;
  driveFileId?: string;
  driveFileName?: string;
  driveMimeType?: string;
  driveFileSize?: number;
  driveViewUrl?: string;
  
  // Nested relations (when included)
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    imageUrl?: string;
  };
  homework?: {
    id: string;
    title: string;
    description: string;
    endDate?: string;
  };
}

export interface SubmissionQueryParams {
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

export interface GoogleDriveSubmissionData {
  homeworkId: string;
  fileId: string;
  accessToken: string;
  fileName: string;
  mimeType: string;
}

export interface ReviewSubmissionData {
  remarks?: string;
  grade?: string;
}

// =================== API CLASS ===================

class HomeworkSubmissionsApi {
  private basePath = '/institute-class-subject-homework-submissions';
  private altBasePath = '/institute-class-subject-homeworks-submissions';

  // =================== STUDENT METHODS ===================

  /**
   * Submit homework via file upload (Student)
   * POST /institute-class-subject-homework-submissions/{homeworkId}/submit
   */
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
    data?: HomeworkSubmission;
  }> {
    console.log('📤 Submitting homework:', { homeworkId, fileUrl, submissionData });
    
    try {
      const response = await apiClient.post(
        `${this.basePath}/${homeworkId}/submit`,
        {
          fileUrl,
          submissionDate: submissionData?.submissionDate || new Date().toISOString(),
          remarks: submissionData?.remarks
        }
      );
      console.log('✅ Homework submission successful:', response);
      return {
        success: true,
        message: 'Homework submitted successfully',
        data: response as HomeworkSubmission
      };
    } catch (error: any) {
      console.error('❌ Homework submission failed:', {
        homeworkId,
        error: error.message,
        status: error.status
      });
      throw error;
    }
  }

  /**
   * Submit homework via Google Drive (Student)
   * POST /institute-class-subject-homeworks-submissions/submit-google-drive
   */
  async submitViaGoogleDrive(data: GoogleDriveSubmissionData): Promise<{
    success: boolean;
    message: string;
    data?: HomeworkSubmission;
  }> {
    console.log('📁 Submitting homework via Google Drive:', { homeworkId: data.homeworkId, fileName: data.fileName });
    
    try {
      const response = await apiClient.post(
        `${this.altBasePath}/submit-google-drive`,
        {
          homeworkId: data.homeworkId,
          fileId: data.fileId,
          accessToken: data.accessToken,
          fileName: data.fileName,
          mimeType: data.mimeType
        }
      );
      console.log('✅ Google Drive submission successful:', response);
      return {
        success: true,
        message: 'Homework submitted successfully via Google Drive',
        data: response as HomeworkSubmission
      };
    } catch (error: any) {
      console.error('❌ Google Drive submission failed:', {
        homeworkId: data.homeworkId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get own submissions for a homework (Student)
   * GET /institute-class-subject-homework-submissions/{homeworkId}/my-submissions
   */
  async getMySubmissions(homeworkId: string, forceRefresh = false): Promise<ApiResponse<HomeworkSubmission[]>> {
    console.log('📋 Fetching my submissions for homework:', homeworkId);
    return enhancedCachedClient.get<ApiResponse<HomeworkSubmission[]>>(
      `${this.basePath}/${homeworkId}/my-submissions`,
      undefined,
      {
        forceRefresh,
        ttl: 10,
        useStaleWhileRevalidate: true
      }
    );
  }

  /**
   * Update own submission (Student - before deadline)
   * PATCH /institute-class-subject-homeworks-submissions/{id}
   */
  async updateMySubmission(
    id: string, 
    data: { fileUrl?: string; remarks?: string },
    context?: SubmissionQueryParams
  ): Promise<HomeworkSubmission> {
    console.log('📝 Updating my submission:', id, data);
    return enhancedCachedClient.patch<HomeworkSubmission>(
      `${this.altBasePath}/${id}`, 
      data,
      {
        userId: context?.userId,
        instituteId: context?.instituteId,
        classId: context?.classId,
        subjectId: context?.subjectId
      }
    );
  }

  /**
   * Delete own submission (Student - before deadline)
   * DELETE /institute-class-subject-homeworks-submissions/{id}
   */
  async deleteMySubmission(id: string, context?: SubmissionQueryParams): Promise<void> {
    console.log('🗑️ Deleting my submission:', id);
    return enhancedCachedClient.delete<void>(
      `${this.altBasePath}/${id}`,
      {
        userId: context?.userId,
        instituteId: context?.instituteId,
        classId: context?.classId,
        subjectId: context?.subjectId
      }
    );
  }

  // =================== TEACHER/ADMIN METHODS ===================

  /**
   * Get all submissions for a homework (Teacher/Admin)
   * GET /institute-class-subject-homeworks-submissions?homeworkId={homeworkId}
   */
  async getSubmissionsByHomework(
    homeworkId: string, 
    params?: Omit<SubmissionQueryParams, 'homeworkId'>,
    forceRefresh = false
  ): Promise<ApiResponse<HomeworkSubmission[]>> {
    console.log('📋 Fetching all submissions for homework:', homeworkId, params);
    return enhancedCachedClient.get<ApiResponse<HomeworkSubmission[]>>(
      this.altBasePath,
      { ...params, homeworkId },
      {
        forceRefresh,
        ttl: 10,
        useStaleWhileRevalidate: true,
        userId: params?.userId,
        instituteId: params?.instituteId,
        classId: params?.classId,
        subjectId: params?.subjectId,
        role: params?.role
      }
    );
  }

  /**
   * Get submissions by class/subject (Teacher/Admin)
   * GET /institute-class-subject-homework-submissions/institute/{instituteId}/class/{classId}/subject/{subjectId}
   */
  async getSubmissionsByClassSubject(
    instituteId: string,
    classId: string,
    subjectId: string,
    params?: Omit<SubmissionQueryParams, 'instituteId' | 'classId' | 'subjectId'>,
    forceRefresh = false
  ): Promise<ApiResponse<HomeworkSubmission[]>> {
    console.log('📋 Fetching submissions by class/subject:', { instituteId, classId, subjectId });
    return enhancedCachedClient.get<ApiResponse<HomeworkSubmission[]>>(
      `${this.basePath}/institute/${instituteId}/class/${classId}/subject/${subjectId}`,
      params,
      {
        forceRefresh,
        ttl: 10,
        useStaleWhileRevalidate: true,
        userId: params?.userId,
        instituteId,
        classId,
        subjectId,
        role: params?.role
      }
    );
  }

  /**
   * Get single submission details (Teacher/Admin)
   * GET /institute-class-subject-homework-submissions/{submissionId}/details
   */
  async getSubmissionDetails(submissionId: string, forceRefresh = false): Promise<HomeworkSubmission> {
    console.log('📄 Fetching submission details:', submissionId);
    return enhancedCachedClient.get<HomeworkSubmission>(
      `${this.basePath}/${submissionId}/details`,
      undefined,
      {
        forceRefresh,
        ttl: 10,
        useStaleWhileRevalidate: true
      }
    );
  }

  /**
   * Get submissions for a specific student (Teacher/Admin)
   * GET /institute-class-subject-homework-submissions/student/{studentId}/submissions
   */
  async getSubmissionsForStudent(
    studentId: string,
    params?: Omit<SubmissionQueryParams, 'studentId'>,
    forceRefresh = false
  ): Promise<ApiResponse<HomeworkSubmission[]>> {
    console.log('📋 Fetching submissions for student:', studentId);
    return enhancedCachedClient.get<ApiResponse<HomeworkSubmission[]>>(
      `${this.basePath}/student/${studentId}/submissions`,
      params,
      {
        forceRefresh,
        ttl: 10,
        useStaleWhileRevalidate: true,
        userId: params?.userId,
        instituteId: params?.instituteId,
        classId: params?.classId,
        subjectId: params?.subjectId,
        role: params?.role
      }
    );
  }

  /**
   * Delete any submission (Teacher/Admin)
   */
  async deleteSubmission(id: string, context?: SubmissionQueryParams): Promise<void> {
    console.log('🗑️ Deleting submission:', id);
    return enhancedCachedClient.delete<void>(
      `${this.altBasePath}/${id}`,
      {
        userId: context?.userId,
        instituteId: context?.instituteId,
        classId: context?.classId,
        subjectId: context?.subjectId,
        role: context?.role
      }
    );
  }

  // =================== CORRECTION MANAGEMENT (TEACHER/ADMIN) ===================

  /**
   * Upload correction file (Teacher/Admin)
   * POST /institute-class-subject-homework-submissions/{submissionId}/correction-file
   */
  async uploadCorrectionFile(
    submissionId: string, 
    correctionFileUrl: string
  ): Promise<{ teacherCorrectionFileUrl: string }> {
    console.log('📎 Uploading correction file:', submissionId);
    return apiClient.post(
      `${this.basePath}/${submissionId}/correction-file`,
      { correctionFileUrl }
    );
  }

  /**
   * Review submission with remarks (Teacher/Admin)
   * PATCH /institute-class-subject-homework-submissions/{submissionId}/review
   */
  async reviewSubmission(
    submissionId: string, 
    data: ReviewSubmissionData
  ): Promise<HomeworkSubmission> {
    console.log('✏️ Reviewing submission:', submissionId, data);
    return apiClient.patch(
      `${this.basePath}/${submissionId}/review`,
      data
    );
  }

  /**
   * Review submission with correction file (Teacher/Admin)
   * PATCH /institute-class-subject-homework-submissions/{submissionId}/review
   */
  async reviewSubmissionWithCorrection(
    submissionId: string, 
    data: ReviewSubmissionData & { correctionFileUrl: string }
  ): Promise<HomeworkSubmission> {
    console.log('✏️ Reviewing submission with correction:', submissionId);
    return apiClient.patch(
      `${this.basePath}/${submissionId}/review`,
      data
    );
  }

  /**
   * Delete correction file (Teacher/Admin)
   * DELETE /institute-class-subject-homework-submissions/{submissionId}/correction-file
   */
  async deleteCorrectionFile(submissionId: string): Promise<void> {
    console.log('🗑️ Deleting correction file:', submissionId);
    return apiClient.delete(`${this.basePath}/${submissionId}/correction-file`);
  }

  /**
   * Update correction file (Teacher/Admin)
   * PUT /institute-class-subject-homework-submissions/{submissionId}/correction-file
   */
  async updateCorrectionFile(
    submissionId: string, 
    correctionFileUrl: string
  ): Promise<{ teacherCorrectionFileUrl: string }> {
    console.log('📝 Updating correction file:', submissionId);
    return apiClient.put(
      `${this.basePath}/${submissionId}/correction-file`,
      { correctionFileUrl }
    );
  }

  // =================== LEGACY METHODS (backward compatibility) ===================

  async getSubmissions(params?: SubmissionQueryParams, forceRefresh = false): Promise<ApiResponse<HomeworkSubmission[]>> {
    console.log('📋 Fetching homework submissions (legacy):', params, { forceRefresh });
    return enhancedCachedClient.get<ApiResponse<HomeworkSubmission[]>>(
      this.altBasePath, 
      params, 
      {
        forceRefresh,
        ttl: 10,
        useStaleWhileRevalidate: true,
        userId: params?.userId,
        instituteId: params?.instituteId,
        classId: params?.classId,
        subjectId: params?.subjectId,
        role: params?.role
      }
    );
  }

  async createSubmission(
    data: {
      homeworkId: string;
      studentId: string;
      submissionDate: string;
      fileUrl?: string;
      teacherCorrectionFileUrl?: string;
      remarks?: string;
      isActive: boolean;
    }, 
    params?: SubmissionQueryParams
  ): Promise<HomeworkSubmission> {
    console.log('📤 Creating homework submission (legacy):', data);
    return enhancedCachedClient.post<HomeworkSubmission>(
      this.altBasePath, 
      data, 
      {
        userId: params?.userId,
        instituteId: params?.instituteId,
        classId: params?.classId,
        subjectId: params?.subjectId,
        role: params?.role
      }
    );
  }

  async getSubmissionById(id: string, params?: SubmissionQueryParams, forceRefresh = false): Promise<HomeworkSubmission> {
    console.log('📄 Fetching homework submission by ID:', id, { forceRefresh });
    return enhancedCachedClient.get<HomeworkSubmission>(
      `${this.altBasePath}/${id}`, 
      undefined, 
      {
        forceRefresh,
        ttl: 10,
        userId: params?.userId,
        instituteId: params?.instituteId,
        classId: params?.classId,
        subjectId: params?.subjectId,
        role: params?.role
      }
    );
  }

  async updateSubmission(id: string, data: Partial<{
    homeworkId: string;
    studentId: string;
    submissionDate: string;
    fileUrl?: string;
    teacherCorrectionFileUrl?: string;
    remarks?: string;
    isActive: boolean;
  }>, params?: SubmissionQueryParams): Promise<HomeworkSubmission> {
    console.log('📝 Updating homework submission (legacy):', id, data);
    return enhancedCachedClient.patch<HomeworkSubmission>(
      `${this.altBasePath}/${id}`, 
      data, 
      {
        userId: params?.userId,
        instituteId: params?.instituteId,
        classId: params?.classId,
        subjectId: params?.subjectId,
        role: params?.role
      }
    );
  }

  // =================== BACKWARD COMPATIBILITY ===================

  /**
   * Get student submissions with class/subject context (legacy method)
   * Used by StudentHomeworkSubmissions component
   */
  async getStudentSubmissions(
    instituteId: string, 
    classId: string, 
    subjectId: string, 
    studentId: string, 
    params?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'ASC' | 'DESC'; userId?: string; role?: string },
    forceRefresh = false
  ): Promise<{ data: HomeworkSubmission[]; meta: any }> {
    console.log('📋 Fetching student homework submissions (legacy):', { instituteId, classId, subjectId, studentId, params, forceRefresh });
    const queryParams = {
      instituteId,
      classId,
      subjectId,
      studentId,
      ...params
    };
    return enhancedCachedClient.get<{ data: HomeworkSubmission[]; meta: any }>(
      this.altBasePath, 
      queryParams, 
      {
        forceRefresh,
        ttl: 10,
        useStaleWhileRevalidate: true,
        userId: params?.userId || studentId,
        instituteId,
        classId,
        subjectId,
        role: params?.role
      }
    );
  }
}

export const homeworkSubmissionsApi = new HomeworkSubmissionsApi();
