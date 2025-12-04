import { getAttendanceUrl, getApiHeaders } from '@/contexts/utils/auth.api';

export interface StudentListRecord {
  id: string;
  name: string;
  email: string;
  addressLine1?: string;
  addressLine2?: string;
  phoneNumber: string;
  imageUrl?: string;
  dateOfBirth?: string;
  userIdByInstitute?: string;
  fatherId?: string;
  motherId?: string;
  guardianId?: string;
  emergencyContact?: string;
  medicalConditions?: string;
  allergies?: string;
  studentId?: string;
  father?: {
    id: string;
    name: string;
    email: string;
    occupation?: string;
    workPlace?: string;
    children: any[];
  };
  mother?: {
    id: string;
    name: string;
    email: string;
    occupation?: string;
    workPlace?: string;
    children: any[];
  };
  guardian?: {
    id: string;
    name: string;
    email: string;
    occupation?: string;
    workPlace?: string;
    children: any[];
  };
}

export interface StudentListResponse {
  data: StudentListRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface StudentAttendanceRecord {
  studentId: string;
  studentName: string;
  instituteId: string;
  instituteName: string;
  classId?: string;
  className?: string;
  subjectId?: string;
  subjectName?: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  location: string;
  markingMethod: string;
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
  summary?: {
    totalPresent: number;
    totalAbsent: number;
    attendanceRate: number;
  };
}

export interface StudentAttendanceParams {
  page?: number;
  limit?: number;
  userId?: string;
  role?: string;
}

class InstituteStudentsApi {
  // STUDENT LIST METHODS
  
  // Get students by class
  async getStudentsByClass(
    instituteId: string,
    classId: string,
    params: { page?: number; limit?: number; parent?: boolean } = {}
  ): Promise<StudentListResponse> {
    const queryParams = new URLSearchParams({
      page: String(params.page || 1),
      limit: String(params.limit || 50),
      parent: String(params.parent ?? true)
    });

    console.log('Fetching students for institute:', instituteId, 'class:', classId);

    const attendanceUrl = getAttendanceUrl();
    const endpoint = `${attendanceUrl}/institute-users/institute/${instituteId}/users/STUDENT/class/${classId}?${queryParams}`;
    const headers = await getApiHeaders();
    
    const response = await fetch(endpoint, { headers });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  // Get students by class and subject
  async getStudentsBySubject(
    instituteId: string,
    classId: string,
    subjectId: string,
    params: { page?: number; limit?: number; parent?: boolean } = {}
  ): Promise<StudentListResponse> {
    const queryParams = new URLSearchParams({
      page: String(params.page || 1),
      limit: String(params.limit || 50),
      parent: String(params.parent ?? true)
    });

    console.log('Fetching students for institute:', instituteId, 'class:', classId, 'subject:', subjectId);

    const attendanceUrl = getAttendanceUrl();
    const endpoint = `${attendanceUrl}/institute-users/institute/${instituteId}/users/STUDENT/class/${classId}/subject/${subjectId}?${queryParams}`;
    const headers = await getApiHeaders();
    
    const response = await fetch(endpoint, { headers });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  // ATTENDANCE METHODS
  
  // 1. Institute-level attendance (InstituteAdmin only)
  async getInstituteStudentAttendance(
    instituteId: string, 
    params: StudentAttendanceParams = {},
    forceRefresh = false
  ): Promise<StudentAttendanceResponse> {
    const queryParams = {
      page: params.page || 1,
      limit: params.limit || 50
    };

    console.log('Fetching institute student attendance for institute:', instituteId, 'with params:', queryParams);

    const attendanceUrl = getAttendanceUrl();
    const endpoint = `${attendanceUrl}/api/attendance/institute/${instituteId}?page=${queryParams.page}&limit=${queryParams.limit}`;
    const headers = await getApiHeaders();
    
    const response = await fetch(endpoint, { headers });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  // 2. Class-level attendance (InstituteAdmin, Teacher)
  async getClassStudentAttendance(
    instituteId: string,
    classId: string,
    params: StudentAttendanceParams = {},
    forceRefresh = false
  ): Promise<StudentAttendanceResponse> {
    const queryParams = {
      page: params.page || 1,
      limit: params.limit || 50
    };

    console.log('Fetching class student attendance for institute:', instituteId, 'class:', classId, 'with params:', queryParams);

    const attendanceUrl = getAttendanceUrl();
    const endpoint = `${attendanceUrl}/api/students/by-institute/${instituteId}/class/${classId}?page=${queryParams.page}&limit=${queryParams.limit}`;
    const headers = await getApiHeaders();
    
    const response = await fetch(endpoint, { headers });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  // 3. Subject-level attendance (InstituteAdmin, Teacher)
  async getSubjectStudentAttendance(
    instituteId: string,
    classId: string,
    subjectId: string,
    params: StudentAttendanceParams = {},
    forceRefresh = false
  ): Promise<StudentAttendanceResponse> {
    const queryParams = {
      page: params.page || 1,
      limit: params.limit || 50
    };

    console.log('Fetching subject student attendance for institute:', instituteId, 'class:', classId, 'subject:', subjectId, 'with params:', queryParams);

    const attendanceUrl = getAttendanceUrl();
    const endpoint = `${attendanceUrl}/api/students/by-institute/${instituteId}/class/${classId}/subject/${subjectId}?page=${queryParams.page}&limit=${queryParams.limit}`;
    const headers = await getApiHeaders();
    
    const response = await fetch(endpoint, { headers });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }
}

export const instituteStudentsApi = new InstituteStudentsApi();