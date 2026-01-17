export interface User {
  id: string;
  nameWithInitials: string; // New field: "J. Doe" format
  name: string; // Computed display name (fallback to nameWithInitials)
  email: string;
  phone: string;
  userType: string;
  dateOfBirth: string;
  gender: string;
  nic: string;
  birthCertificateNo: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  province: string;
  postalCode: string;
  country: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  imageUrl: string;
  role: string;
  institutes?: Institute[]; // Optional institutes array
  
  // Deprecated fields - kept for backward compatibility
  /** @deprecated Use nameWithInitials instead */
  firstName?: string;
  /** @deprecated Use nameWithInitials instead */
  lastName?: string;
}

// Export UserRole type for use in other components
export type UserRole = 
  | 'OrganizationManager'
  | 'InstituteAdmin' 
  | 'Student' 
  | 'AttendanceMarker' 
  | 'Teacher' 
  | 'Parent'
  | 'User'
  | 'UserWithoutParent'
  | 'UserWithoutStudent';

export interface Institute {
  id: string;
  name: string;
  code: string;
  description: string;
  type?: string;
  isActive: boolean;
  instituteUserType?: string; // Raw API value: STUDENT, INSTITUTE_ADMIN, TEACHER, etc.
  userRole?: string; // Mapped role (kept for backward compatibility)
  userIdByInstitute?: string; // User's ID within this institute
  shortName?: string; // Institute's short name
  logo?: string; // Institute's logo URL
  instituteUserImageUrl?: string; // User's profile image within this institute
}

export interface Class {
  id: string;
  name: string;
  code: string;
  description: string;
  grade: number;
  specialty: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
  category?: string;
  creditHours?: number;
  isActive?: boolean;
  subjectType?: string;
  basketCategory?: string;
  instituteType?: string;
  imgUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Child {
  id: string;
  userId: string;
  studentId: string;
  emergencyContact: string;
  medicalConditions: string;
  allergies: string;
  bloodGroup: string;
  user: {
    id: string;
    nameWithInitials?: string;
    firstName?: string; // Deprecated
    lastName?: string; // Deprecated
    email: string;
    imageUrl: string;
    dateOfBirth: string;
    gender: string;
    userType: string;
  };
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userRole?: string; // User's role in this organization
}

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface AuthContextType {
  user: User | null;
  selectedInstitute: Institute | null;
  selectedClass: Class | null;
  selectedSubject: Subject | null;
  selectedChild: Child | null;
  selectedOrganization: Organization | null;
  selectedTransport: { id: string; vehicleNumber: string; bookhireId: string } | null;
  selectedInstituteType: string | null;
  selectedClassGrade: number | null;
  currentInstituteId: string | null;
  currentClassId: string | null;
  currentSubjectId: string | null;
  currentChildId: string | null;
  currentOrganizationId: string | null;
  currentTransportId: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  setSelectedInstitute: (institute: Institute | null) => void;
  setSelectedClass: (classData: Class | null) => void;
  setSelectedSubject: (subject: Subject | null) => void;
  setSelectedChild: (child: Child | null) => void;
  setSelectedOrganization: (organization: Organization | null) => void;
  setSelectedTransport: (transport: { id: string; vehicleNumber: string; bookhireId: string } | null) => void;
  loadUserInstitutes: () => Promise<Institute[]>;
  refreshUserData?: (forceRefresh?: boolean) => Promise<void>;
  validateUserToken?: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
}

// API Response types with new nameWithInitials format
export interface ApiUserResponse {
  id: string;
  email: string;
  nameWithInitials: string;
  userType: string;
  imageUrl?: string;
  // Full user data (optional, returned from /auth/me)
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  nic?: string;
  birthCertificateNo?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  role?: string;
}

export interface ApiResponse {
  access_token: string;
  user: ApiUserResponse;
  // Note: refresh_token is now stored in httpOnly cookie, not in response body
}
