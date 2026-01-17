import { attendanceApiClient } from './attendanceClient';
import { getAttendanceUrl, getApiHeaders, getBaseUrl } from '@/contexts/utils/auth.api';
import { attendanceDuplicateChecker } from '@/utils/attendanceDuplicateCheck';
import { AttendanceStatus, AttendanceSummary, normalizeAttendanceSummary } from '@/types/attendance.types';

export interface ChildAttendanceRecord {
  attendanceId?: string;
  studentId: string;
  studentName: string;
  instituteId?: string;
  instituteName: string;
  classId?: string;
  className?: string;
  subjectId?: string;
  subjectName?: string;
  date: string;
  status: AttendanceStatus;
  location: string;
  markingMethod: string;
  address?: string;
  markedBy?: string;
  markedAt?: string;
}

export interface ChildAttendanceResponse {
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
  data: ChildAttendanceRecord[];
  summary: AttendanceSummary;
}

export interface ChildAttendanceParams {
  studentId: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  userId?: string;
  role?: string;
}

export interface MarkAttendanceByCardRequest {
  studentCardId: string;
  instituteId: string;
  instituteName: string;
  classId?: string;
  className?: string;
  subjectId?: string;
  subjectName?: string;
  address: string;
  markingMethod: 'qr' | 'barcode' | 'rfid/nfc';
  status: AttendanceStatus;
}

export interface MarkAttendanceByCardResponse {
  success: boolean;
  message: string;
  attendanceId: string;
  action: string;
  imageUrl?: string;
  status: AttendanceStatus;
  name?: string;
}

export interface MarkAttendanceRequest {
  studentId: string;
  studentName?: string;
  instituteId: string;
  instituteName: string;
  classId?: string;
  className?: string;
  subjectId?: string;
  subjectName?: string;
  address: string;
  markingMethod: 'manual';
  status: AttendanceStatus;
}

export interface MarkAttendanceResponse {
  success: boolean;
  message: string;
  attendanceId: string;
  action: string;
  imageUrl?: string;
  status: AttendanceStatus;
  name?: string;
}

class ChildAttendanceApi {
  async getChildAttendance(params: ChildAttendanceParams): Promise<ChildAttendanceResponse> {
    const { studentId, ...queryParams } = params;
    
    const defaultParams = {
      startDate: '2025-09-01',
      endDate: '2025-09-07',
      page: 1,
      limit: 50, // Default to 50 as requested
      ...queryParams
    };

    console.log('Fetching child attendance for student:', studentId, 'with params:', defaultParams);

    return attendanceApiClient.get<ChildAttendanceResponse>(
      `/api/attendance/student/${studentId}`,
      defaultParams,
      {
        forceRefresh: false,
        ttl: 60, // Cache for 1 minute
        useStaleWhileRevalidate: true
      }
    );
  }

  async markAttendanceByCard(request: MarkAttendanceByCardRequest): Promise<MarkAttendanceByCardResponse> {
    // Get current user ID from localStorage
    const userId = localStorage.getItem('userId') || 'unknown';

    // 🛡️ CHECK FOR DUPLICATE ATTENDANCE
    const isDuplicate = attendanceDuplicateChecker.isDuplicate({
      userId,
      studentCardId: request.studentCardId,
      instituteId: request.instituteId,
      classId: request.classId,
      subjectId: request.subjectId,
      status: request.status,
      method: request.markingMethod
    });

    if (isDuplicate) {
      console.warn('⚠️ DUPLICATE ATTENDANCE PREVENTED - Already marked recently');
      throw new Error('This attendance was already marked recently. Please wait a few minutes before marking again.');
    }

    let attendanceBaseUrl = getAttendanceUrl();
    if (!attendanceBaseUrl) {
      // Use main API URL as fallback
      attendanceBaseUrl = getBaseUrl();
      if (!attendanceBaseUrl) {
        throw new Error('No API URL configured. Please set the API URL in settings.');
      }
    }

    // Build dynamic request body based on what's selected
    const requestBody: any = {
      studentCardId: request.studentCardId,
      instituteId: request.instituteId,
      instituteName: request.instituteName,
      address: request.address,
      markingMethod: request.markingMethod,
      status: request.status
    };

    // Only include class data if provided
    if (request.classId && request.className) {
      requestBody.classId = request.classId;
      requestBody.className = request.className;
    }

    // Only include subject data if provided
    if (request.subjectId && request.subjectName) {
      requestBody.subjectId = request.subjectId;
      requestBody.subjectName = request.subjectName;
    }

    const baseUrl = attendanceBaseUrl.endsWith('/') ? attendanceBaseUrl.slice(0, -1) : attendanceBaseUrl;
    const fullApiUrl = `${baseUrl}/api/attendance/mark-by-card`;
    
    console.log('=== ATTENDANCE BY CARD API CALL ===');
    console.log('Attendance URL from config:', getAttendanceUrl());
    console.log('Base URL from config:', getBaseUrl());
    console.log('Using base URL:', baseUrl);
    console.log('Full API Endpoint:', fullApiUrl);
    console.log('Request Method: POST');
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));
    console.log('Request Headers:', getApiHeaders());
    console.log('===============================');

    const response = await fetch(fullApiUrl, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify(requestBody),
      credentials: 'include' // CRITICAL: Send httpOnly refresh token cookie for JWT auth
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('=== ATTENDANCE BY CARD API ERROR ===');
      console.error('Status Code:', response.status);
      console.error('Status Text:', response.statusText);
      console.error('Error Response:', errorText);
      console.error('Full API URL used:', fullApiUrl);
      console.error('Original Request:', JSON.stringify(requestBody, null, 2));
      console.error('================================');
      throw new Error(`Failed to mark attendance by card: ${response.status} - ${errorText}`);
    }

    const result: MarkAttendanceByCardResponse = await response.json();
    console.log('=== ATTENDANCE BY CARD SUCCESS ===');
    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(result, null, 2));
    console.log('Original Request:', JSON.stringify(requestBody, null, 2));
    console.log('===============================');
    
    // ✅ RECORD ATTENDANCE LOCALLY TO PREVENT DUPLICATES
    attendanceDuplicateChecker.recordAttendance({
      userId,
      studentCardId: request.studentCardId,
      instituteId: request.instituteId,
      classId: request.classId,
      subjectId: request.subjectId,
      status: request.status,
      method: request.markingMethod
    });
    
    return result;
  }

  async markAttendanceByInstituteCard(request: {
    instituteCardId: string;
    instituteId: string;
    instituteName: string;
    classId?: string;
    className?: string;
    subjectId?: string;
    subjectName?: string;
    address: string;
    markingMethod: string;
    status: 'present' | 'absent' | 'late';
    date: string;
    location?: string;
  }): Promise<any> {
    // Get current user ID from localStorage
    const userId = localStorage.getItem('userId') || 'unknown';

    // 🛡️ CHECK FOR DUPLICATE ATTENDANCE (5 minute window)
    const isDuplicate = attendanceDuplicateChecker.isDuplicate({
      userId,
      // Reuse the studentCardId field to track institute card scans
      studentCardId: request.instituteCardId,
      instituteId: request.instituteId,
      classId: request.classId,
      subjectId: request.subjectId,
      status: request.status,
      method: (request.markingMethod as any) || 'rfid/nfc'
    });

    if (isDuplicate) {
      console.warn('⚠️ DUPLICATE ATTENDANCE PREVENTED - Already marked recently');
      throw new Error('This attendance was already marked recently. Please wait a few minutes before marking again.');
    }

    let attendanceBaseUrl = getAttendanceUrl();
    if (!attendanceBaseUrl) {
      attendanceBaseUrl = getBaseUrl();
      if (!attendanceBaseUrl) {
        throw new Error('No API URL configured. Please set the API URL in settings.');
      }
    }

    const baseUrl = attendanceBaseUrl.endsWith('/') ? attendanceBaseUrl.slice(0, -1) : attendanceBaseUrl;
    const fullApiUrl = `${baseUrl}/api/attendance/mark-by-institute-card`;

    console.log('=== INSTITUTE CARD ATTENDANCE API CALL ===');
    console.log('Full API Endpoint:', fullApiUrl);
    console.log('Request Body:', JSON.stringify(request, null, 2));
    console.log('========================================');

    const response = await fetch(fullApiUrl, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify(request),
      credentials: 'include' // CRITICAL: Send httpOnly refresh token cookie for JWT auth
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('=== INSTITUTE CARD ATTENDANCE ERROR ===');
      console.error('Status Code:', response.status);
      console.error('Error Response:', errorText);
      console.error('=====================================');
      throw new Error(`Failed to mark attendance: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('=== INSTITUTE CARD ATTENDANCE SUCCESS ===');
    console.log('Response:', JSON.stringify(result, null, 2));
    console.log('======================================');

    // ✅ RECORD ATTENDANCE LOCALLY TO PREVENT DUPLICATES
    attendanceDuplicateChecker.recordAttendance({
      userId,
      studentCardId: request.instituteCardId,
      instituteId: request.instituteId,
      classId: request.classId,
      subjectId: request.subjectId,
      status: request.status,
      method: (request.markingMethod as any) || 'rfid/nfc'
    });

    return result;
  }

  async markAttendance(request: MarkAttendanceRequest): Promise<MarkAttendanceResponse> {
    // Get current user ID from localStorage
    const userId = localStorage.getItem('userId') || 'unknown';

    // 🛡️ CHECK FOR DUPLICATE ATTENDANCE
    const isDuplicate = attendanceDuplicateChecker.isDuplicate({
      userId,
      studentId: request.studentId,
      instituteId: request.instituteId,
      classId: request.classId,
      subjectId: request.subjectId,
      status: request.status,
      method: request.markingMethod
    });

    if (isDuplicate) {
      console.warn('⚠️ DUPLICATE ATTENDANCE PREVENTED - Already marked recently');
      throw new Error('This attendance was already marked recently. Please wait a few minutes before marking again.');
    }

    let attendanceBaseUrl = getAttendanceUrl();
    if (!attendanceBaseUrl) {
      // Use main API URL as fallback
      attendanceBaseUrl = getBaseUrl();
      if (!attendanceBaseUrl) {
        throw new Error('No API URL configured. Please set the API URL in settings.');
      }
    }

    // Build dynamic request body based on what's selected
    const requestBody: any = {
      studentId: request.studentId,
      studentName: request.studentName || `Student ${request.studentId}`,
      instituteId: request.instituteId,
      instituteName: request.instituteName,
      address: request.address,
      markingMethod: request.markingMethod,
      status: request.status,
      date: new Date().toISOString()
    };

    // Only include class data if provided
    if (request.classId && request.className) {
      requestBody.classId = request.classId;
      requestBody.className = request.className;
    }

    // Only include subject data if provided
    if (request.subjectId && request.subjectName) {
      requestBody.subjectId = request.subjectId;
      requestBody.subjectName = request.subjectName;
    }

    const baseUrl = attendanceBaseUrl.endsWith('/') ? attendanceBaseUrl.slice(0, -1) : attendanceBaseUrl;
    const fullApiUrl = `${baseUrl}/api/attendance/mark`;

    console.log('=== MANUAL ATTENDANCE API CALL ===');
    console.log('Attendance URL from config:', getAttendanceUrl());
    console.log('Base URL from config:', getBaseUrl());
    console.log('Using base URL:', baseUrl);
    console.log('Full API Endpoint:', fullApiUrl);
    console.log('Request Method: POST');
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));
    console.log('Request Headers:', getApiHeaders());
    console.log('Request Details:');
    console.log('- Student ID:', requestBody.studentId);
    console.log('- Institute ID:', requestBody.instituteId);
    console.log('- Institute Name:', requestBody.instituteName);
    console.log('- Class ID:', requestBody.classId || 'Not selected');
    console.log('- Class Name:', requestBody.className || 'Not selected');
    console.log('- Subject ID:', requestBody.subjectId || 'Not selected');
    console.log('- Subject Name:', requestBody.subjectName || 'Not selected');
    console.log('- Address:', requestBody.address);
    console.log('- Marking Method:', requestBody.markingMethod);
    console.log('- Status:', requestBody.status);
    console.log('===============================');

    const response = await fetch(fullApiUrl, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('=== MANUAL ATTENDANCE API ERROR ===');
      console.error('Status Code:', response.status);
      console.error('Status Text:', response.statusText);
      console.error('Error Response:', errorText);
      console.error('Full API URL used:', fullApiUrl);
      console.error('Original Request:', JSON.stringify(requestBody, null, 2));
      console.error('================================');
      throw new Error(`Failed to mark attendance: ${response.status} - ${errorText}`);
    }

    const result: MarkAttendanceResponse = await response.json();
    console.log('=== MANUAL ATTENDANCE SUCCESS ===');
    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(result, null, 2));
    console.log('Original Request:', JSON.stringify(requestBody, null, 2));
    console.log('===============================');
    
    // ✅ RECORD ATTENDANCE LOCALLY TO PREVENT DUPLICATES
    attendanceDuplicateChecker.recordAttendance({
      userId,
      studentId: request.studentId,
      instituteId: request.instituteId,
      classId: request.classId,
      subjectId: request.subjectId,
      status: request.status,
      method: request.markingMethod
    });
    
    return result;
  }
}

export const childAttendanceApi = new ChildAttendanceApi();