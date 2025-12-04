import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Users, MapPin, Calendar, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { useRefreshWithCooldown } from '@/hooks/useRefreshWithCooldown';
import { useToast } from '@/hooks/use-toast';
import { instituteStudentsApi, StudentAttendanceRecord, StudentAttendanceResponse } from '@/api/instituteStudents.api';
import { childAttendanceApi, ChildAttendanceRecord } from '@/api/childAttendance.api';
import AttendanceFilters, { AttendanceFilterParams } from '@/components/AttendanceFilters';

interface AttendanceColumn {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any, record?: any) => React.ReactNode;
}

const Attendance = () => {
  const { selectedInstitute, selectedClass, selectedSubject, currentInstituteId, currentClassId, currentSubjectId, user } = useAuth();
  const { toast } = useToast();
  const { refresh, isRefreshing, canRefresh, cooldownRemaining } = useRefreshWithCooldown(10);
  
  const [studentAttendanceRecords, setStudentAttendanceRecords] = useState<StudentAttendanceRecord[]>([]);
  const [childAttendanceRecords, setChildAttendanceRecords] = useState<ChildAttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Enhanced pagination state with default of 50 and available options [25, 50, 100]
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalRecords, setTotalRecords] = useState(0);
  const rowsPerPageOptions = [25, 50, 100];
  
  const [filters, setFilters] = useState<AttendanceFilterParams>({});

  // Get institute role
  const userRoleAuth = useInstituteRole();
  
  // Check permissions and get view type based on role and context
  const getPermissionInfo = () => {
    // Use institute-specific role
    const userRole = userRoleAuth;
    
    console.log('🔍 ATTENDANCE CONTEXT DEBUG:', {
      userRole,
      currentInstituteId,
      currentClassId,
      currentSubjectId,
      'selectedInstitute FULL': selectedInstitute,
      'selectedInstitute.userRole': selectedInstitute?.userRole,
      selectedClass: selectedClass?.name,
      selectedSubject: selectedSubject?.name
    });
    
    // Student - No permission to view attendance
    if (userRole === 'Student') {
      return {
        hasPermission: false,
        title: 'Attendance Access Restricted',
        viewType: 'none',
        description: 'Attendance viewing is not available for students'
      };
    }
    
    // 1. InstituteAdmin and AttendanceMarker - Institute level attendance (Institute only selected)
    if ((userRole === 'InstituteAdmin' || userRole === 'AttendanceMarker') && currentInstituteId && !currentClassId) {
      return {
        hasPermission: true,
        title: 'Institute Student Attendance Overview',
        viewType: 'institute',
        description: 'View all students attendance records for the selected institute'
      };
    }
    
    // 2. InstituteAdmin, Teacher, and AttendanceMarker - Class attendance (Institute + Class selected)
    if ((userRole === 'InstituteAdmin' || userRole === 'Teacher' || userRole === 'AttendanceMarker') && 
        currentInstituteId && currentClassId && !currentSubjectId) {
      return {
        hasPermission: true,
        title: 'Class Student Attendance Overview',
        viewType: 'class',
        description: 'View student attendance records for the selected class'
      };
    }
    
    // 3. InstituteAdmin, Teacher, and AttendanceMarker - Subject attendance (Institute + Class + Subject selected)
    if ((userRole === 'InstituteAdmin' || userRole === 'Teacher' || userRole === 'AttendanceMarker') && 
        currentInstituteId && currentClassId && currentSubjectId) {
      return {
        hasPermission: true,
        title: 'Subject Student Attendance Overview',
        viewType: 'subject',
        description: 'View student attendance records for the selected subject'
      };
    }
    
    return {
      hasPermission: false,
      title: 'Student Attendance Records',
      viewType: 'none',
      description: 'Select the required context to view attendance records'
    };
  };

  const { hasPermission, title, viewType, description } = getPermissionInfo();

  // Define columns based on view type
  const getColumns = (): AttendanceColumn[] => {
    // For institute attendance records with new API response format
    return [
      { id: 'studentId', label: 'Student ID', minWidth: 100 },
      { id: 'studentName', label: 'Student Name', minWidth: 170 },
      { id: 'instituteName', label: 'Institute', minWidth: 150 },
      { id: 'className', label: 'Class', minWidth: 120 },
      { id: 'subjectName', label: 'Subject', minWidth: 130 },
      { id: 'date', label: 'Date', minWidth: 120, format: (value) => value ? new Date(value).toLocaleDateString() : '-' },
      { 
        id: 'status', 
        label: 'Status', 
        minWidth: 100,
        format: (value) => (
          <Badge variant={value === 'present' ? 'default' : value === 'absent' ? 'destructive' : 'secondary'}>
            {value?.toUpperCase()}
          </Badge>
        )
      },
      { id: 'location', label: 'Location', minWidth: 200 },
      { id: 'markingMethod', label: 'Method', minWidth: 120 }
    ];
  };

  const handleFiltersChange = (newFilters: AttendanceFilterParams) => {
    setFilters(newFilters);
  };

  const handleApplyFilters = () => {
    console.log('Applying filters:', filters);
    setPage(0);
    loadStudentAttendanceData();
  };

  const handleClearFilters = () => {
    setFilters({});
    setPage(0);
    loadStudentAttendanceData();
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  // Enhanced data loading with proper pagination
  const loadStudentAttendanceData = useCallback(async () => {
    if (!hasPermission) return;
    
    setIsLoading(true);
    try {
      const apiParams = {
        page: page + 1,
        limit: rowsPerPage,
        ...filters,
        userId: user?.id,
        role: userRoleAuth
      };

      let response: StudentAttendanceResponse;

      if (viewType === 'institute' && currentInstituteId) {
        response = await instituteStudentsApi.getInstituteStudentAttendance(currentInstituteId, apiParams);
      } else if (viewType === 'class' && currentInstituteId && currentClassId) {
        response = await instituteStudentsApi.getClassStudentAttendance(currentInstituteId, currentClassId, apiParams);
      } else if (viewType === 'subject' && currentInstituteId && currentClassId && currentSubjectId) {
        response = await instituteStudentsApi.getSubjectStudentAttendance(currentInstituteId, currentClassId, currentSubjectId, apiParams);
      } else {
        console.warn('Invalid view type or missing context for attendance data');
        return;
      }

      if (response.success) {
        setStudentAttendanceRecords(response.data);
        setTotalRecords(response.pagination.totalRecords);
        setDataLoaded(true);
        
        toast({
          title: "Data Loaded",
          description: `Loaded ${response.data.length} attendance records`,
        });
      } else {
        throw new Error(response.message || 'Failed to load attendance data');
      }
    } catch (error) {
      console.error('Error loading attendance data:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load attendance data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentInstituteId, currentClassId, currentSubjectId, viewType, hasPermission, page, rowsPerPage, filters, toast]);

  // Load data when dependencies change
  useEffect(() => {
    if (hasPermission) {
      loadStudentAttendanceData();
    }
  }, [page, rowsPerPage, currentInstituteId, currentClassId, currentSubjectId, viewType]);

  const getCurrentSelection = () => {
    const parts = [];
    if (selectedInstitute) parts.push(`Institute: ${selectedInstitute.name}`);
    if (selectedClass) parts.push(`Class: ${selectedClass.name}`);
    if (selectedSubject) parts.push(`Subject: ${selectedSubject.name}`);
    return parts.join(' → ') || 'No selection';
  };

  if (!hasPermission) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Access Denied or Missing Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Please select the required context to view attendance records:</h3>
              <div className="text-sm text-muted-foreground space-y-2 mt-4">
                <p><strong>Institute Admin/Attendance Marker:</strong> Select Institute only for institute-level attendance</p>
                <p><strong>Institute Admin/Teacher/Attendance Marker:</strong> Select Institute + Class for class-level attendance</p>
                <p><strong>Institute Admin/Teacher/Attendance Marker:</strong> Select Institute + Class + Subject for subject-level attendance</p>
                <p className="mt-4 font-medium">Current Selection: {getCurrentSelection()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const columns = getColumns();
  const displayData = viewType === 'student' ? childAttendanceRecords : studentAttendanceRecords;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Current Selection: {getCurrentSelection()}
          </p>
        </div>
        <Button 
          onClick={loadStudentAttendanceData} 
          disabled={isLoading}
          variant="outline"
          className="shrink-0"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </>
          )}
        </Button>
      </div>

      {/* Filters Section */}
      <AttendanceFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold text-foreground">{totalRecords}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">View Type</p>
                <p className="text-lg font-medium text-foreground capitalize">{viewType} Level</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Page</p>
                <p className="text-lg font-medium text-foreground">{page + 1} of {Math.ceil(totalRecords / rowsPerPage)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced MUI Data Table with Fixed Height */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ height: 600 }}> {/* Fixed height for consistent display */}
          <Table stickyHeader aria-label="attendance table">
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    style={{ minWidth: column.minWidth }}
                  >
                    {column.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {displayData.length > 0 ? (
                displayData.map((record, index) => (
                  <TableRow hover role="checkbox" tabIndex={-1} key={index}>
                    {columns.map((column) => {
                      const value = (record as any)[column.id];
                      return (
                        <TableCell key={column.id} align={column.align}>
                          {column.format ? column.format(value, record) : value}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center">
                    <div className="py-12 text-center text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No attendance records found</p>
                      <p className="text-sm">{getCurrentSelection()}</p>
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
          count={totalRecords}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </div>
  );
};

export default Attendance;