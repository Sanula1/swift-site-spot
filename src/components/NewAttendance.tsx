import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Search, Filter, Calendar, User, Clock, CheckCircle, MapPin, School, BookOpen, UserCheck, UserX, TrendingUp, LogOut, DoorOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { useToast } from '@/hooks/use-toast';
import { getAttendanceUrl, getBaseUrl } from '@/contexts/utils/auth.api';
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
  status: 'present' | 'absent' | 'late' | 'left' | 'left_early' | 'left_lately';
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
  // Removed occupation filter - not needed
  const [startDate, setStartDate] = useState(getDefaultDates().startDate);
  const [endDate, setEndDate] = useState(getDefaultDates().endDate);
  const [sortOrder, setSortOrder] = useState<string>('descending');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
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
        limit: rowsPerPage.toString()
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

  // Load attendance data when page or rowsPerPage changes
  useEffect(() => {
    if (dataLoaded) {
      loadAttendanceData();
    }
  }, [currentPage, rowsPerPage]);

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
      case 'left':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'left_early':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
      case 'left_lately':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
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

  // Client-side totals (so "Late" does not get counted as "Absent")
  const totals = React.useMemo(() => {
    const records = attendanceData?.data ?? [];
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalLeft = 0;
    let totalLeftEarly = 0;
    let totalLeftLately = 0;

    for (const r of records) {
      if (r.status === 'present') totalPresent += 1;
      else if (r.status === 'absent') totalAbsent += 1;
      else if (r.status === 'late') totalLate += 1;
      else if (r.status === 'left') totalLeft += 1;
      else if (r.status === 'left_early') totalLeftEarly += 1;
      else if (r.status === 'left_lately') totalLeftLately += 1;
    }

    return { totalPresent, totalAbsent, totalLate, totalLeft, totalLeftEarly, totalLeftLately };
  }, [attendanceData?.data]);

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
          <Button onClick={loadAttendanceData} disabled={isLoading} className="gap-2" size="lg">
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
  return <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* Modern Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-border/50 p-6">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                  {title}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  <span className="font-medium text-primary">{getContextInfo()}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              onClick={loadAttendanceData} 
              disabled={isLoading} 
              variant="outline" 
              size="sm" 
              className="gap-2 rounded-full px-4 border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>

            <Button 
              onClick={() => setShowFilters(!showFilters)} 
              variant={showFilters ? "default" : "outline"}
              size="sm" 
              className="gap-2 rounded-full px-4"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Modern Filters Panel */}
      {showFilters && (
        <Card className="card-glass border-border/50 shadow-premium rounded-xl overflow-hidden">
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
              {/* Date range */}
              <div className="lg:col-span-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">From</p>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 rounded-lg border-border/50 bg-background/50 focus:border-primary text-sm"
                />
              </div>

              <div className="lg:col-span-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">To</p>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 rounded-lg border-border/50 bg-background/50 focus:border-primary text-sm"
                />
              </div>

              {/* Search */}
              <div className="lg:col-span-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Search</p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Student name / ID"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 rounded-lg border-border/50 bg-background/50 focus:border-primary text-sm"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="lg:col-span-2 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Status</p>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 rounded-lg border-border/50 bg-background/50 text-sm">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="present">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-success" />
                        Present
                      </span>
                    </SelectItem>
                    <SelectItem value="absent">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-destructive" />
                        Absent
                      </span>
                    </SelectItem>
                    <SelectItem value="late">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-warning" />
                        Late
                      </span>
                    </SelectItem>
                    <SelectItem value="left">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        Left
                      </span>
                    </SelectItem>
                    <SelectItem value="left_early">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-pink-500" />
                        Left Early
                      </span>
                    </SelectItem>
                    <SelectItem value="left_lately">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        Left Late
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort */}
              <div className="lg:col-span-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Sort</p>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger className="h-9 rounded-lg border-border/50 bg-background/50 text-sm">
                    <Clock className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="descending">Newest first</SelectItem>
                    <SelectItem value="ascending">Oldest first</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              <div className="lg:col-span-9 flex flex-wrap items-center justify-end gap-2">
                <Button
                  onClick={() => {
                    const d = getDefaultDates();
                    setSearchTerm('');
                    setStatusFilter('all');
                    setSortOrder('descending');
                    setStartDate(d.startDate);
                    setEndDate(d.endDate);
                    setCurrentPage(1);
                  }}
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg"
                >
                  Clear
                </Button>
                <Button
                  onClick={loadAttendanceData}
                  disabled={isLoading}
                  size="sm"
                  className="h-9 rounded-lg gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Apply filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {attendanceData && (
        <section aria-label="Attendance totals" className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Present */}
            <Card className="card-premium hover-lift">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Present</p>
                    <p className="mt-1 text-2xl font-bold text-success">{totals.totalPresent}</p>
                  </div>
                  <div className="shrink-0 rounded-lg bg-success/10 border border-success/20 p-2">
                    <UserCheck className="h-4 w-4 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Absent */}
            <Card className="card-premium hover-lift">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Absent</p>
                    <p className="mt-1 text-2xl font-bold text-destructive">{totals.totalAbsent}</p>
                  </div>
                  <div className="shrink-0 rounded-lg bg-destructive/10 border border-destructive/20 p-2">
                    <UserX className="h-4 w-4 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Late */}
            <Card className="card-premium hover-lift">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Late</p>
                    <p className="mt-1 text-2xl font-bold text-warning">{totals.totalLate}</p>
                  </div>
                  <div className="shrink-0 rounded-lg bg-warning/10 border border-warning/20 p-2">
                    <Clock className="h-4 w-4 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Left */}
            <Card className="card-premium hover-lift">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Left</p>
                    <p className="mt-1 text-2xl font-bold text-purple-600">{totals.totalLeft}</p>
                  </div>
                  <div className="shrink-0 rounded-lg bg-purple-500/10 border border-purple-500/20 p-2">
                    <LogOut className="h-4 w-4 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Left Early */}
            <Card className="card-premium hover-lift">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Left Early</p>
                    <p className="mt-1 text-2xl font-bold text-pink-600">{totals.totalLeftEarly}</p>
                  </div>
                  <div className="shrink-0 rounded-lg bg-pink-500/10 border border-pink-500/20 p-2">
                    <DoorOpen className="h-4 w-4 text-pink-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Left Late */}
            <Card className="card-premium hover-lift">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Left Late</p>
                    <p className="mt-1 text-2xl font-bold text-indigo-600">{totals.totalLeftLately}</p>
                  </div>
                  <div className="shrink-0 rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-2">
                    <Clock className="h-4 w-4 text-indigo-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}


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
          <TablePagination 
            rowsPerPageOptions={[25, 50, 100]} 
            component="div" 
            count={attendanceData?.pagination.totalRecords || 0} 
            rowsPerPage={rowsPerPage} 
            page={currentPage - 1} 
            onPageChange={(event, newPage) => setCurrentPage(newPage + 1)} 
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setCurrentPage(1); // Reset to first page when changing rows per page
            }} 
          />
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