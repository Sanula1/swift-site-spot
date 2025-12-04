import { attendanceApiClient } from './attendanceClient';

export interface TransportEnrollment {
  id: string;
  studentId: string;
  bookhireId: string;
  bookhireTitle?: string;
  vehicleNumber?: string;
  imageUrl?: string;
  enrollmentDate?: string;
  cardId: string | null;
  startDate: string;
  endDate: string | null;
  status: 'pending' | 'active' | 'inactive' | 'approved';
  parentContact: string | null;
  emergencyContact: string | null;
  pickupLocation: string | null;
  dropoffLocation: string | null;
  pickupTime: string | null;
  dropoffTime: string | null;
  specialInstructions: string | null;
  monthlyFee: number;
  isActive?: boolean;
  approvedAt?: string | null;
  approvedBy?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookhireDetails {
  vehicleModel?: string;
  vehicleNumber?: string;
  driverName?: string;
}

export interface TransportEnrollmentsResponse {
  success: boolean;
  message: string;
  data: {
    enrollments: TransportEnrollment[];
    total: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
}

export interface EnrollTransportRequest {
  studentId: string;
  bookhireId: number;
  pickupLocation: string;
  dropoffLocation: string;
  monthlyFee: number;
}

export interface EnrollTransportResponse {
  success: boolean;
  message: string;
  data: TransportEnrollment;
}

export interface TransportAttendanceRecord {
  attendanceDate: string;
  status: 'pickup' | 'dropoff';
  pickupStatus?: 'present' | 'absent' | 'late';
  dropoffStatus?: 'present' | 'absent' | 'late';
  pickupTime?: string;
  dropoffTime?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  location?: string;
  notes?: string;
  vehicleNumber: string;
  bookhireName: string;
  timestamp: string;
}

export interface TransportAttendanceResponse {
  success: boolean;
  message: string;
  data: {
    success: boolean;
    data: TransportAttendanceRecord[];
    pagination: {
      currentPage: number;
      totalItems: number;
      hasMore: boolean;
    };
  };
}

export const transportApi = {
  getStudentEnrollments: async (
    studentId: string,
    params?: { page?: number; limit?: number }
  ): Promise<TransportEnrollmentsResponse> => {
    const queryParams = new URLSearchParams({
      page: String(params?.page || 1),
      limit: String(params?.limit || 10)
    });
    
    return attendanceApiClient.get(`/api/student-bookhire-enrollment/student/${studentId}?${queryParams}`);
  },

  enrollTransport: async (
    data: EnrollTransportRequest
  ): Promise<EnrollTransportResponse> => {
    return attendanceApiClient.post(`/api/student-bookhire-enrollment/enroll`, data);
  },

  getStudentAttendance: async (
    studentId: string,
    bookhireId: string,
    params?: { page?: number; limit?: number }
  ): Promise<TransportAttendanceResponse> => {
    const queryParams = new URLSearchParams({
      page: String(params?.page || 1),
      limit: String(params?.limit || 10),
      bookhireId: bookhireId
    });
    
    return attendanceApiClient.get(`/api/bookhire-attendance/student/${studentId}?${queryParams}`);
  }
};
