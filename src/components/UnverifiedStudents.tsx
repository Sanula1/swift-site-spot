import React, { useState, useEffect } from 'react';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import { useAuth } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, UserCheck, UserX, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { enhancedCachedClient } from '@/api/enhancedCachedClient';
import { CACHE_TTL } from '@/config/cacheTTL';
import { getBaseUrl } from '@/contexts/utils/auth.api';

interface UnverifiedStudent {
  id: string;
  userId: string;
  studentId: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    imageUrl: string;
    dateOfBirth: string;
    gender: string;
  };
}

interface NewUnverifiedStudent {
  id: string;
  name: string;
  phoneNumber: string;
  imageUrl: string;
  userIdByInstitute: string;
  studentUserId: string;
  enrollmentDate: string;
  enrollmentMethod: string;
  isVerified: number;
  isActive: number;
}

interface InstituteClassUnverifiedResponse {
  message: string;
  classId: string;
  className: string;
  classCode: string;
  instituteId: string;
  students: NewUnverifiedStudent[];
  count: number;
  totalPendingVerifications: number;
}

const UnverifiedStudents = () => {
  const { user, selectedInstitute, selectedClass, selectedSubject } = useAuth();
  const userRole = useInstituteRole();
  const [students, setStudents] = useState<(UnverifiedStudent | NewUnverifiedStudent)[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifyingIds, setVerifyingIds] = useState<Set<string>>(new Set());
  const [hasData, setHasData] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(50);
  const [rowsPerPageOptions] = useState([25, 50, 100]);

  const fetchUnverifiedStudents = async (page: number = 0, forceRefresh = false) => {
    if (!selectedInstitute || !selectedClass) return;
    
    setLoading(true);
    try {
      let endpoint = '';
      
      if (selectedSubject) {
        // Fetch institute class subject unverified students
        endpoint = `/institute-class-subject-students/unverified/${selectedInstitute.id}/${selectedClass.id}/${selectedSubject.id}`;
      } else {
        // Fetch institute class unverified students - NEW API with pagination
        endpoint = `/institute-classes/${selectedClass.id}/unverified-students?limit=${limit}&page=${page + 1}`;
      }

      const data = await enhancedCachedClient.get(
        endpoint,
        {},
        {
          ttl: CACHE_TTL.UNVERIFIED_STUDENTS,
          forceRefresh,
          userId: user?.id,
          role: userRole,
          instituteId: selectedInstitute.id,
          classId: selectedClass.id,
          ...(selectedSubject ? { subjectId: selectedSubject.id } : {})
        }
      );
      
      if (selectedSubject) {
        // For subject unverified students - use existing structure
        setStudents(data);
        setTotalCount(data.length);
        setTotalPages(1);
      } else {
        // For institute class unverified students - use new structure
        const responseData = data as InstituteClassUnverifiedResponse;
        // Filter only unverified students
        const unverifiedStudents = responseData.students.filter(student => student.isVerified === 0);
        setStudents(unverifiedStudents);
        setTotalCount(responseData.totalPendingVerifications);
        setTotalPages(Math.ceil(responseData.totalPendingVerifications / limit));
        setCurrentPage(page - 1); // Convert to 0-based for MUI
      }
      
      setHasData(true);
    } catch (error) {
      console.error('Error fetching unverified students:', error);
      toast({
        title: "Error",
        description: "Failed to load unverified students",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-load data when context changes (uses cache if available)
  useEffect(() => {
    if (selectedInstitute && selectedClass) {
      fetchUnverifiedStudents(0, false); // Load from cache
    }
  }, [selectedInstitute?.id, selectedClass?.id, selectedSubject?.id, limit]);

  const handleVerifyStudent = async (studentIdentifier: string, approve: boolean) => {
    if (!selectedInstitute || !selectedClass) return;

    setVerifyingIds(prev => new Set(prev).add(studentIdentifier));
    
    try {
      const token = localStorage.getItem('access_token');
      let endpoint = '';
      let requestBody = {};
      
      if (selectedSubject) {
        endpoint = `${getBaseUrl()}/institute-class-subject-students/verify/${selectedInstitute.id}/${selectedClass.id}/${selectedSubject.id}/${studentIdentifier}`;
        requestBody = {
          isVerified: approve,
          isActive: approve
        };
      } else {
        // NEW API for institute class verification
        endpoint = `${getBaseUrl()}/institute-classes/${selectedClass.id}/verify-student`;
        requestBody = {
          studentUserId: studentIdentifier,
          approve: approve
        };
      }

      const response = await fetch(endpoint, {
        method: selectedSubject ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('Failed to verify student');
      }

      toast({
        title: approve ? "Student Approved" : "Student Rejected",
        description: `Student has been ${approve ? 'approved' : 'rejected'} successfully`
      });

      // Refresh the list
      fetchUnverifiedStudents(currentPage);
    } catch (error) {
      console.error('Error verifying student:', error);
      toast({
        title: "Error",
        description: "Failed to verify student",
        variant: "destructive"
      });
    } finally {
      setVerifyingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(studentIdentifier);
        return newSet;
      });
    }
  };

  const getStudentKey = (student: UnverifiedStudent | NewUnverifiedStudent): string => {
    return student.id;
  };

  const getStudentId = (student: UnverifiedStudent | NewUnverifiedStudent): string => {
    if ('studentId' in student) {
      return student.studentId;
    }
    return student.userIdByInstitute;
  };

  const getStudentUser = (student: UnverifiedStudent | NewUnverifiedStudent) => {
    if ('user' in student && student.user) {
      return student.user;
    }
    // For NewUnverifiedStudent, parse name and return appropriate structure
    if ('name' in student) {
      const nameParts = student.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      return {
        firstName,
        lastName,
        email: 'N/A',
        phone: student.phoneNumber || 'N/A',
        imageUrl: student.imageUrl || ''
      };
    }
    // Fallback
    return {
      firstName: 'Unknown',
      lastName: 'Student',
      email: 'N/A',
      phone: 'N/A',
      imageUrl: ''
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getEnrollmentMethodBadge = (method: string) => {
    if (method === 'self_enrollment') {
      return <Badge variant="outline" className="text-blue-600 border-blue-200">Self Enrolled</Badge>;
    }
    return <Badge variant="outline" className="text-purple-600 border-purple-200">Teacher Assigned</Badge>;
  };

  const columns = [
    {
      key: 'avatar',
      header: 'Avatar',
      render: (value: any, row: any) => {
        const userData = getStudentUser(row);
        return (
          <Avatar className="h-10 w-10">
            <AvatarImage src={userData.imageUrl} alt={userData.firstName} />
            <AvatarFallback>
              {userData.firstName[0]}{userData.lastName[0]}
            </AvatarFallback>
          </Avatar>
        );
      }
    },
    {
      key: 'name',
      header: 'Name',
      render: (value: any, row: any) => {
        const userData = getStudentUser(row);
        return (
          <div>
            <div className="font-medium">{userData.firstName} {userData.lastName}</div>
            <div className="text-sm text-muted-foreground">ID: {getStudentId(row)}</div>
          </div>
        );
      }
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (value: any, row: any) => {
        const userData = getStudentUser(row);
        const phone = 'phoneNumber' in row ? row.phoneNumber : userData.phone;
        return (
          <div>
            <div className="text-sm">{userData.email}</div>
            <div className="text-sm text-muted-foreground">{phone}</div>
          </div>
        );
      }
    },
    {
      key: 'enrollment',
      header: 'Enrollment',
      render: (value: any, row: any) => {
        const isNewStudent = 'enrollmentDate' in row;
        if (!isNewStudent) return <span>-</span>;
        
        return (
          <div>
            <div className="text-sm">{formatDate(row.enrollmentDate)}</div>
            <div className="mt-1">{getEnrollmentMethodBadge(row.enrollmentMethod)}</div>
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: any, row: any) => {
        const isNewStudent = 'enrollmentDate' in row;
        return (
          <div>
            <Badge variant="outline" className="text-orange-600 border-orange-200 mb-1">
              Pending Verification
            </Badge>
            {isNewStudent && (
              <div className="text-sm text-muted-foreground">
                {row.isActive ? 'Active' : 'Inactive'}
              </div>
            )}
          </div>
        );
      }
    }
  ];

  const customActions = [
    {
      label: 'Approve',
      action: (row: any) => handleVerifyStudent(getStudentKey(row), true),
      icon: <UserCheck className="h-4 w-4" />,
      variant: 'default' as const,
      condition: (row: any) => !verifyingIds.has(getStudentKey(row))
    },
    {
      label: 'Reject',
      action: (row: any) => handleVerifyStudent(getStudentKey(row), false),
      icon: <UserX className="h-4 w-4" />,
      variant: 'outline' as const,
      condition: (row: any) => !verifyingIds.has(getStudentKey(row))
    }
  ];

  const getContextTitle = () => {
    if (selectedSubject) {
      return `Unverified Students - ${selectedSubject.name}`;
    }
    return `Unverified Students - ${selectedClass?.name}`;
  };

  if (!['InstituteAdmin', 'Teacher'].includes(userRole)) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to view unverified students.
        </AlertDescription>
      </Alert>
    );
  }

  if (!selectedInstitute || !selectedClass) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please select an institute and class to view unverified students.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{getContextTitle()}</h1>
          <p className="text-muted-foreground">
            {selectedSubject 
              ? `Students pending verification for ${selectedClass?.name} - ${selectedSubject.name}`
              : `Students pending verification for ${selectedClass?.name}`
            }
          </p>
        </div>
        <Button 
          onClick={() => fetchUnverifiedStudents(0, true)} // Force refresh from backend
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {hasData ? (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ height: 'calc(100vh - 280px)' }}>
            <Table stickyHeader aria-label="unverified students table">
              <TableHead>
                <TableRow>
                  <TableCell>Avatar</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Enrollment</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students
                  .slice(currentPage * limit, currentPage * limit + limit)
                  .map((student) => {
                    const userData = getStudentUser(student);
                    const studentKey = getStudentKey(student);
                    const isNewStudent = 'enrollmentDate' in student;
                    const phone = 'phoneNumber' in student ? student.phoneNumber : userData.phone;
                    
                    return (
                      <TableRow hover role="checkbox" tabIndex={-1} key={studentKey}>
                        <TableCell>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={userData.imageUrl} alt={userData.firstName} />
                            <AvatarFallback>
                              {userData.firstName[0]}{userData.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{userData.firstName} {userData.lastName}</div>
                            <div className="text-sm text-muted-foreground">ID: {getStudentId(student)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm">{userData.email}</div>
                            <div className="text-sm text-muted-foreground">{phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isNewStudent ? (
                            <div>
                              <div className="text-sm">{formatDate(student.enrollmentDate)}</div>
                              <div className="mt-1">{getEnrollmentMethodBadge(student.enrollmentMethod)}</div>
                            </div>
                          ) : (
                            <span>-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <Badge variant="outline" className="text-orange-600 border-orange-200 mb-1">
                              Pending Verification
                            </Badge>
                            {isNewStudent && (
                              <div className="text-sm text-muted-foreground">
                                {student.isActive ? 'Active' : 'Inactive'}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleVerifyStudent(studentKey, true)}
                              disabled={verifyingIds.has(studentKey)}
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVerifyStudent(studentKey, false)}
                              disabled={verifyingIds.has(studentKey)}
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                {students.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <div className="text-center py-8 text-muted-foreground">
                        No unverified students found
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={rowsPerPageOptions}
            component="div"
            count={totalCount}
            rowsPerPage={limit}
            page={currentPage}
            onPageChange={(event: unknown, newPage: number) => {
              fetchUnverifiedStudents(newPage); // MUI uses 0-based, API uses 1-based (converted in function)
            }}
            onRowsPerPageChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              const newLimit = parseInt(event.target.value, 10);
              setLimit(newLimit);
              setCurrentPage(0);
              fetchUnverifiedStudents(0);
            }}
          />
        </Paper>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Click "Load Students" to fetch unverified students
        </div>
      )}
    </div>
  );
};

export default UnverifiedStudents;