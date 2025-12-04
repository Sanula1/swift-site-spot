import { apiClient } from './client';
import { enhancedCachedClient } from './enhancedCachedClient';
import { CACHE_TTL } from '@/config/cacheTTL';

export interface SubjectPayment {
  id: string;
  instituteId: string;
  classId: string;
  subjectId: string;
  createdBy: string;
  title: string;
  description: string;
  targetType: 'PARENTS' | 'STUDENT';
  priority: 'MANDATORY' | 'OPTIONAL';
  amount: string;
  documentUrl?: string;
  lastDate: string;
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  submissionsCount: number;
  verifiedSubmissionsCount: number;
  pendingSubmissionsCount: number;
}

export interface SubjectPaymentsResponse {
  data: SubjectPayment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SubjectPaymentSubmission {
  id: string;
  paymentId: string;
  userId: string;
  userType: string;
  username: string;
  paymentDate: string;
  receiptUrl: string;
  receiptFilename: string;
  transactionId: string;
  submittedAmount: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  notes?: string;
  uploadedAt: string;
  updatedAt: string;
  // Legacy fields for backward compatibility
  paymentAmount?: number;
  paymentMethod?: string;
  transactionReference?: string;
  receiptFileName?: string;
  receiptFileUrl?: string;
  submitterName?: string;
  verifierName?: string;
  createdAt?: string;
  paymentRemarks?: string;
  lateFeeApplied?: number;
  totalAmountPaid?: number;
  canResubmit?: boolean;
  canDelete?: boolean;
  paymentTitle?: string;
  paymentDescription?: string;
  dueDate?: string;
  priority?: string;
}

export interface SubjectSubmissionsResponse {
  data: SubjectPaymentSubmission[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary?: {
    totalSubmissions: number;
    byStatus: {
      pending: number;
      verified: number;
      rejected: number;
    };
    totalAmountSubmitted: number;
    totalAmountVerified: number;
    totalLateFees: number;
  };
}

class SubjectPaymentsApi {
  // Get all subject payments for Institute Admin/Teacher
  async getSubjectPayments(
    instituteId: string, 
    classId: string, 
    subjectId: string,
    page: number = 1,
    limit: number = 50,
    forceRefresh: boolean = false
  ): Promise<SubjectPaymentsResponse> {
    return enhancedCachedClient.get(
      `/institute-class-subject-payments/institute/${instituteId}/class/${classId}/subject/${subjectId}`,
      { page, limit },
      {
        ttl: CACHE_TTL.SUBJECT_PAYMENTS,
        forceRefresh,
        instituteId,
        classId,
        subjectId
      }
    );
  }

  // Get student's subject payments
  async getMySubjectPayments(
    instituteId: string, 
    classId: string, 
    subjectId: string,
    page: number = 1,
    limit: number = 50,
    forceRefresh: boolean = false
  ): Promise<SubjectPaymentsResponse> {
    return enhancedCachedClient.get(
      `/institute-class-subject-payments/institute/${instituteId}/class/${classId}/subject/${subjectId}/my-payments`,
      { page, limit },
      {
        ttl: CACHE_TTL.SUBJECT_PAYMENTS,
        forceRefresh,
        instituteId,
        classId,
        subjectId
      }
    );
  }

  // Get student's subject payment submissions
  async getMySubjectSubmissions(
    instituteId: string, 
    classId: string, 
    subjectId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<SubjectSubmissionsResponse> {
    return apiClient.get(`/institute-class-subject-payment-submissions/institute/${instituteId}/class/${classId}/subject/${subjectId}/my-submissions?page=${page}&limit=${limit}`);
  }

  // Get all submissions for a specific subject payment (for Admin/Teacher)
  async getSubjectPaymentSubmissions(
    instituteId: string, 
    classId: string, 
    subjectId: string,
    paymentId: string
  ): Promise<SubjectSubmissionsResponse> {
    return apiClient.get(`/institute-class-subject-payment-submissions/institute/${instituteId}/class/${classId}/subject/${subjectId}/payment/${paymentId}/submissions`);
  }

  // Get payment submissions by payment ID only (for simplified access)
  async getPaymentSubmissions(
    paymentId: string, 
    page: number = 1, 
    limit: number = 50
  ): Promise<SubjectSubmissionsResponse> {
    return apiClient.get(`/institute-class-subject-payment-submissions/payment/${paymentId}/submissions?page=${page}&limit=${limit}`);
  }

  // Verify payment submission
  async verifyPaymentSubmission(submissionId: string, data: {
    status: 'VERIFIED' | 'REJECTED';
    rejectionReason?: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string }> {
    return apiClient.patch(`/institute-class-subject-payment-submissions/submission/${submissionId}/verify`, data);
  }

  // Submit payment (for students)
  async submitPayment(paymentId: string, data: {
    paymentDate: string;
    transactionId: string;
    submittedAmount: number;
    notes?: string;
    receiptUrl: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: {
      submissionId: string;
      status: string;
      receiptFile: string;
    };
  }> {
    return apiClient.post(`/institute-class-subject-payment-submissions/payment/${paymentId}/submit`, data);
  }
}

export const subjectPaymentsApi = new SubjectPaymentsApi();