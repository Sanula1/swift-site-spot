import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { RefreshCw, Search, Filter, Calendar, User, Clock, CheckCircle, MapPin, School, BookOpen, UserCheck, UserX, TrendingUp, ChevronsUpDown, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { useToast } from '@/hooks/use-toast';
import { getAttendanceUrl, getBaseUrl } from '@/contexts/utils/auth.api';
import { Occupation, formatOccupation } from '@/types/occupation.types';
import { cn } from '@/lib/utils';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
interface AttendanceRecord {
  attendanceId?: string;
  studentId: string;
  studentName: string;
  instituteId?: string;
  instituteName?: string;
  classId?: string;
  className?: string;
  subjectId?: string;
  subjectName?: string;
  date: string;
  markedAt?: string;
  status: 'present' | 'absent' | 'late';
  location?: string;
  markingMethod: string;
  markedBy?: string;
}
interface AttendanceResponse {
  success: boolean;
  message: string;
  instituteInfo?: {
    instituteId: string;
    instituteName: string;
  };
  classInfo?: {
    instituteId: string;
    instituteName: string;
    classId: string;
    className: string;
  };
  subjectInfo?: {
    instituteId: string;
    instituteName: string;
    classId: string;
    className: string;
    subjectId: string;
    subjectName: string;
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    recordsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  dateRange: {
    startDate: string;
    endDate: string;
    totalDays: number;
  };
  data: AttendanceRecord[];
  summary: {
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    uniqueStudents: number;
    totalClasses?: number;
    totalSubjects?: number;
  };
}
const NewAttendance = () => {
  const {
    selectedInstitute,
    selectedClass,
    selectedSubject,
    currentInstituteId,
    currentClassId,
    currentSubjectId
  } = useAuth();
  const userRole = useInstituteRole();
  const {
    toast
  } = useToast();
  const [attendanceData, setAttendanceData] = useState<AttendanceResponse | null>(null);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Helper function to format date as YYYY-MM-DD
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calculate dynamic dates
  const getDefaultDates = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      startDate: formatDateForInput(yesterday),
      endDate: formatDateForInput(tomorrow)
    };
  };

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [occupationFilter, setOccupationFilter] = useState<string>('');
  const [occupationSearchOpen, setOccupationSearchOpen] = useState(false);
  const [startDate, setStartDate] = useState(getDefaultDates().startDate);
  const [endDate, setEndDate] = useState(getDefaultDates().endDate);
  const [sortOrder, setSortOrder] = useState<string>('descending');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Check permissions based on role and context
  const getPermissionAndEndpoint = () => {
    // Determine permissions purely from role and current selection
    const canViewSubject = (userRole === 'InstituteAdmin' || userRole === 'Teacher' || userRole === 'AttendanceMarker') && currentInstituteId && currentClassId && currentSubjectId;
    const canViewClass = (userRole === 'InstituteAdmin' || userRole === 'Teacher' || userRole === 'AttendanceMarker') && currentInstituteId && currentClassId;
    const canViewInstitute = (userRole === 'InstituteAdmin' || userRole === 'AttendanceMarker') && currentInstituteId;

    // Build base URL (attendance service first, fallback to main API)
    let attendanceBaseUrl = getAttendanceUrl() || getBaseUrl() || localStorage.getItem('baseUrl2') || '';
    attendanceBaseUrl = attendanceBaseUrl.endsWith('/') ? attendanceBaseUrl.slice(0, -1) : attendanceBaseUrl;
    if (canViewSubject) {
      return {
        hasPermission: true,
        endpoint: attendanceBaseUrl ? `${attendanceBaseUrl}/api/attendance/institute/${currentInstituteId}/class/${currentClassId}/subject/${currentSubjectId}` : '',
        title: 'Subject Attendance Records'
      };
    }
    if (canViewClass) {
      return {
        hasPermission: true,
        endpoint: attendanceBaseUrl ? `${attendanceBaseUrl}/api/attendance/institute/${currentInstituteId}/class/${currentClassId}` : '',
        title: 'Class Attendance Records'
      };
    }
    if (canViewInstitute) {
      return {
        hasPermission: true,
        endpoint: attendanceBaseUrl ? `${attendanceBaseUrl}/api/attendance/institute/${currentInstituteId}` : '',
        title: 'Institute Attendance Records'
      };
    }
    if (userRole === 'Student') {
      return {
        hasPermission: false,
        endpoint: '',
        title: 'Attendance Access Restricted'
      };
    }
    return {
      hasPermission: false,
      endpoint: '',
      title: 'Attendance Records'
    };
  };
  const {
    hasPermission,
    endpoint,
    title
  } = getPermissionAndEndpoint();
  const getApiHeaders = () => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('authToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json' // Add this header for ngrok
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };
  const loadAttendanceData = async () => {
    if (!hasPermission) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to view attendance records.",
        variant: "destructive"
      });
      return;
    }

    // Ensure API endpoint is configured
    if (!endpoint) {
      toast({
        title: 'Configuration Required',
        description: 'No API base URL configured. Please set attendance URL in Settings.',
        variant: 'destructive'
      });
      return;
    }
    setIsLoading(true);
    console.log('Loading attendance data from API:', endpoint);
    try {
      const headers = getApiHeaders();

      // Build query parameters
      const params = new URLSearchParams({
        startDate,
        endDate,
        page: currentPage.toString(),
        limit: '10'
      });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      const fullUrl = `${endpoint}?${params.toString()}`;
      console.log('Full API URL:', fullUrl);
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers
      });
      console.log('API Response Status:', response.status);
      console.log('Response Content-Type:', response.headers.get('Content-Type'));

      // Check if response is HTML (ngrok warning page)
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('text/html')) {
        const htmlContent = await response.text();

        // Check if it's an ngrok warning page
        if (htmlContent.includes('ngrok') && htmlContent.includes('You are about to visit')) {
          throw new Error('Ngrok tunnel is showing a browser warning. Please visit the ngrok URL in a browser first to accept the warning, or configure ngrok to skip browser warnings.');
        }
        throw new Error('API returned HTML instead of JSON. This might be a server configuration issue.');
      }
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          if (contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.message || JSON.stringify(errorData);
          } else {
            errorMessage = (await response.text()) || errorMessage;
          }
        } catch {
          // Use default error message if parsing fails
        }
        throw new Error(`Failed to fetch attendance data: ${errorMessage}`);
      }
      let result: AttendanceResponse;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        throw new Error('Invalid JSON response from server. The server might be returning HTML or plain text instead of JSON.');
      }
      console.log('Attendance data loaded successfully:', result);
      setAttendanceData(result);
      setFilteredRecords(result.data);
      setDataLoaded(true);
      toast({
        title: "Data Loaded",
        description: `Successfully loaded ${result.data.length} attendance records.`
      });
    } catch (error) {
      console.error('Failed to load attendance data:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load attendance data from server.";
      if (errorMessage.includes('ngrok') || errorMessage.includes('browser warning')) {
        toast({
          title: "Ngrok Configuration Issue",
          description: "The ngrok tunnel is showing a browser warning. Visit the ngrok URL in a browser first to accept the warning.",
          variant: "destructive"
        });
      } else if (errorMessage.includes('HTML instead of JSON')) {
        toast({
          title: "API Configuration Error",
          description: "The server is returning HTML instead of JSON. Check your API endpoint configuration.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Load Failed",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load attendance data when page changes
  useEffect(() => {
    if (dataLoaded) {
      loadAttendanceData();
    }
  }, [currentPage]);

  // Apply filters and sorting
  useEffect(() => {
    if (!attendanceData) return;
    let filtered = attendanceData.data;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(record => record.studentId.toLowerCase().includes(searchTerm.toLowerCase()) || record.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || record.status.toLowerCase().includes(searchTerm.toLowerCase()) || record.className && record.className.toLowerCase().includes(searchTerm.toLowerCase()) || record.subjectName && record.subjectName.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aDateStr = a.markedAt || a.date || '';
      const bDateStr = b.markedAt || b.date || '';
      const dateA = new Date(aDateStr);
      const dateB = new Date(bDateStr);
      return sortOrder === 'ascending' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
    });
    setFilteredRecords(filtered);
  }, [attendanceData, searchTerm, sortOrder]);
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'absent':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'late':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };
  const getCurrentSelection = () => {
    const selections = [];
    if (selectedInstitute) selections.push(`Institute: ${selectedInstitute.name}`);
    if (selectedClass) selections.push(`Class: ${selectedClass.name}`);
    if (selectedSubject) selections.push(`Subject: ${selectedSubject.name}`);
    return selections.join(', ');
  };
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  const getContextInfo = () => {
    if (attendanceData?.subjectInfo) {
      return `${attendanceData.subjectInfo.instituteName} > ${attendanceData.subjectInfo.className} > ${attendanceData.subjectInfo.subjectName}`;
    }
    if (attendanceData?.classInfo) {
      return `${attendanceData.classInfo.instituteName} > ${attendanceData.classInfo.className}`;
    }
    if (attendanceData?.instituteInfo) {
      return attendanceData.instituteInfo.instituteName;
    }
    return getCurrentSelection();
  };

  // Mobile Card Component
  const AttendanceCard = ({
    record
  }: {
    record: AttendanceRecord;
  }) => <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            {record.studentName}
          </CardTitle>
          <Badge className={getStatusColor(record.status)}>
            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" />
            <span>ID: {record.studentId}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span>Date: {formatDate(record.date || record.markedAt || '')}</span>
          </div>
          {record.instituteName && <div className="flex items-center gap-2">
              <School className="h-4 w-4 text-blue-600" />
              <span>Institute: {record.instituteName}</span>
            </div>}
          {record.location && <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span>Location: {record.location}</span>
            </div>}
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <span>Method: {record.markingMethod}</span>
          </div>
        </div>
      </CardContent>
    </Card>;
  if (!hasPermission) {
    return <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Access Denied or Missing Selection
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please select the required context to view attendance records:
            </p>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p><strong>Institute Admin/Attendance Marker:</strong> Select Institute only for institute-level attendance</p>
              <p><strong>Institute Admin/Teacher/Attendance Marker:</strong> Select Institute + Class for class-level attendance</p>
              <p><strong>Institute Admin/Teacher/Attendance Marker:</strong> Select Institute + Class + Subject for subject-level attendance</p>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Current Selection: {getContextInfo() || 'None'}
            </div>
          </CardContent>
        </Card>
      </div>;
  }
  if (!dataLoaded) {
    return <div className="container mx-auto p-6 space-y-6">
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Current Selection: {getContextInfo()}
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            View and manage attendance records
          </p>
          <Button onClick={loadAttendanceData} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
            {isLoading ? <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Loading Data...
              </> : <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Load Attendance Data
              </>}
          </Button>
        </div>
      </div>;
  }
  return <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Current Selection: {getContextInfo()}
          </p>
        </div>
        <Button onClick={loadAttendanceData} disabled={isLoading} variant="outline" size="sm">
          {isLoading ? <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Refreshing...
            </> : <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </>}
        </Button>
      </div>

      {/* Filter Toggle Button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowFilters(!showFilters)} variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </div>

      {/* Date Range Filter */}
      {showFilters && <Card>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="text-sm font-medium mb-2 block">Start Date</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">End Date</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <Button onClick={loadAttendanceData} disabled={isLoading}>
                Apply Filter
              </Button>
            </div>

            {/* Additional Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search records..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                </SelectContent>
              </Select>

              {/* Occupation Filter */}
              <Popover open={occupationSearchOpen} onOpenChange={setOccupationSearchOpen}>
                <PopoverTrigger asChild>
                  
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 pointer-events-auto bg-background border shadow-md z-50" align="start">
                  <Command className="bg-background">
                    <CommandInput placeholder="Search occupation..." className="h-9 border-b" />
                    <CommandList className="max-h-[300px] overflow-y-auto">
                      <CommandEmpty className="py-6 text-center text-sm">No occupation found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="all" onSelect={() => {
                      setOccupationFilter('');
                      setOccupationSearchOpen(false);
                    }} className="cursor-pointer">
                          <Check className={cn("mr-2 h-4 w-4", occupationFilter === '' ? "opacity-100" : "opacity-0")} />
                          All Occupations
                        </CommandItem>
                        {Object.values(Occupation).map(occupation => <CommandItem key={occupation} value={formatOccupation(occupation)} onSelect={() => {
                      setOccupationFilter(occupation === occupationFilter ? '' : occupation);
                      setOccupationSearchOpen(false);
                    }} className="cursor-pointer">
                            <Check className={cn("mr-2 h-4 w-4", occupationFilter === occupation ? "opacity-100" : "opacity-0")} />
                            {formatOccupation(occupation)}
                          </CommandItem>)}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Sort Order */}
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger>
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="descending">Newest First</SelectItem>
                  <SelectItem value="ascending">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>}

      {/* Summary Cards */}
      {attendanceData?.summary && <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Present</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {attendanceData.summary.totalPresent}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Absent</CardTitle>
              <UserX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {attendanceData.summary.totalAbsent}
              </div>
            </CardContent>
          </Card>

          

          
        </div>}

      {/* Records Summary */}

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Paper sx={{
        width: '100%',
        overflow: 'hidden'
      }}>
          <TableContainer sx={{
          minHeight: 600,
          maxHeight: 'calc(100vh - 400px)'
        }}>
            <Table stickyHeader aria-label="attendance records table">
              <TableHead>
                <TableRow>
                  <TableCell style={{
                  minWidth: 120,
                  fontWeight: 600
                }}>Student ID</TableCell>
                  <TableCell style={{
                  minWidth: 170,
                  fontWeight: 600
                }}>Student Name</TableCell>
                  <TableCell style={{
                  minWidth: 150,
                  fontWeight: 600
                }}>Institute Name</TableCell>
                  <TableCell style={{
                  minWidth: 120,
                  fontWeight: 600
                }}>Date</TableCell>
                  <TableCell style={{
                  minWidth: 100,
                  fontWeight: 600
                }}>Status</TableCell>
                  <TableCell style={{
                  minWidth: 200,
                  fontWeight: 600
                }}>Location</TableCell>
                  <TableCell style={{
                  minWidth: 150,
                  fontWeight: 600
                }}>Marking Method</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRecords.length === 0 ? <TableRow>
                    <TableCell colSpan={7} align="center" style={{
                  padding: '48px'
                }}>
                      <div>
                        <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: 500,
                      marginBottom: '8px'
                    }}>
                          No attendance records found
                        </h3>
                        <p style={{
                      color: '#6b7280'
                    }}>
                          No attendance records are available for the current selection.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow> : filteredRecords.map((record, index) => <TableRow hover role="checkbox" tabIndex={-1} key={record.attendanceId || index}>
                      <TableCell style={{
                  fontWeight: 500
                }}>{record.studentId}</TableCell>
                      <TableCell>{record.studentName}</TableCell>
                      <TableCell>{record.instituteName || '-'}</TableCell>
                      <TableCell>{formatDate(record.date || record.markedAt || '')}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(record.status)}>
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>{record.location || '-'}</TableCell>
                      <TableCell>{record.markingMethod}</TableCell>
                    </TableRow>)}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination rowsPerPageOptions={[10, 25, 50, 100]} component="div" count={attendanceData?.pagination.totalRecords || 0} rowsPerPage={10} page={currentPage - 1} onPageChange={(event, newPage) => setCurrentPage(newPage + 1)} onRowsPerPageChange={event => {
          // Handle rows per page change if needed
        }} />
        </Paper>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden">
        {filteredRecords.length === 0 ? <Card>
            <CardContent className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No attendance records found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No attendance records are available for the current selection.
              </p>
            </CardContent>
          </Card> : <div className="space-y-4">
            {filteredRecords.map((record, index) => <AttendanceCard key={index} record={record} />)}
          </div>}
      </div>
    </div>;
};
export default NewAttendance;