import * as React from 'react';
import { useState, useCallback, useEffect, useMemo } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Users, MapPin, Calendar, Clock, ChevronLeft, ChevronRight, List, CalendarRange, PieChart, UserCheck, UserX, TrendingUp, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { useRefreshWithCooldown } from '@/hooks/useRefreshWithCooldown';
import { useToast } from '@/hooks/use-toast';
import { instituteStudentsApi, StudentAttendanceRecord, StudentAttendanceResponse } from '@/api/instituteStudents.api';
import { childAttendanceApi, ChildAttendanceRecord } from '@/api/childAttendance.api';
import AttendanceFilters, { AttendanceFilterParams } from '@/components/AttendanceFilters';
import { getAttendanceStatusConfig, AttendanceStatus, ATTENDANCE_CHART_COLORS, normalizeAttendanceSummary } from '@/types/attendance.types';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

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
  const [activeTab, setActiveTab] = useState('records');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  
  // Enhanced pagination state with default of 50 and available options [25, 50, 100]
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalRecords, setTotalRecords] = useState(0);
  const rowsPerPageOptions = [25, 50, 100];
  
  // Calculate default 5-day date range dynamically
  const getDefaultDateRange = () => {
    const today = new Date();
    const fiveDaysAgo = new Date(today);
    fiveDaysAgo.setDate(today.getDate() - 4); // 5 days including today
    return {
      startDate: fiveDaysAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  };
  
  const [filters, setFilters] = useState<AttendanceFilterParams>(() => getDefaultDateRange());
  const [attendanceSummary, setAttendanceSummary] = useState<any>(null);

  // Get institute role
  const userRoleAuth = useInstituteRole();
  
  // Check permissions and get view type based on role and context
  const getPermissionInfo = () => {
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
    
    if (userRole === 'Student') {
      return {
        hasPermission: false,
        title: 'Attendance Access Restricted',
        viewType: 'none',
        description: 'Attendance viewing is not available for students'
      };
    }
    
    if ((userRole === 'InstituteAdmin' || userRole === 'AttendanceMarker') && currentInstituteId && !currentClassId) {
      return {
        hasPermission: true,
        title: 'Institute Student Attendance Overview',
        viewType: 'institute',
        description: 'View all students attendance records for the selected institute'
      };
    }
    
    if ((userRole === 'InstituteAdmin' || userRole === 'Teacher' || userRole === 'AttendanceMarker') && 
        currentInstituteId && currentClassId && !currentSubjectId) {
      return {
        hasPermission: true,
        title: 'Class Student Attendance Overview',
        viewType: 'class',
        description: 'View student attendance records for the selected class'
      };
    }
    
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
        format: (value) => {
          const config = getAttendanceStatusConfig(value);
          return (
            <Badge className={`${config.bgColor} ${config.color} border`}>
              {config.icon} {config.label}
            </Badge>
          );
        }
      },
      { id: 'location', label: 'Location', minWidth: 200 },
      { id: 'markingMethod', label: 'Method', minWidth: 120 }
    ];
  };

  // Calendar helpers
  const getCalendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();
    
    const days: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  }, [calendarMonth]);

  // Daily attendance summary for calendar
  const dailyAttendanceMap = useMemo(() => {
    const map: Record<string, { present: number; absent: number; late: number; total: number }> = {};
    if (studentAttendanceRecords) {
      studentAttendanceRecords.forEach((record) => {
        const dateKey = new Date(record.date).toISOString().split('T')[0];
        if (!map[dateKey]) {
          map[dateKey] = { present: 0, absent: 0, late: 0, total: 0 };
        }
        const status = record.status?.toLowerCase() as AttendanceStatus;
        if (status === 'present') map[dateKey].present++;
        else if (status === 'absent') map[dateKey].absent++;
        else if (status === 'late') map[dateKey].late++;
        map[dateKey].total++;
      });
    }
    return map;
  }, [studentAttendanceRecords]);

  const getDayStats = (day: number) => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dailyAttendanceMap[dateStr] || null;
  };

  // 5-day statistics for pie chart
  const last5DaysStats = useMemo(() => {
    const stats = { present: 0, absent: 0, late: 0 };
    const today = new Date();
    const last5Days: string[] = [];
    
    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      last5Days.push(date.toISOString().split('T')[0]);
    }
    
    if (studentAttendanceRecords) {
      studentAttendanceRecords.forEach((record) => {
        const dateKey = new Date(record.date).toISOString().split('T')[0];
        if (last5Days.includes(dateKey)) {
          const status = record.status?.toLowerCase() as AttendanceStatus;
          if (status === 'present') stats.present++;
          else if (status === 'absent') stats.absent++;
          else if (status === 'late') stats.late++;
        }
      });
    }
    
    return stats;
  }, [studentAttendanceRecords]);

  const pieChartData = useMemo(() => {
    const total = last5DaysStats.present + last5DaysStats.absent + last5DaysStats.late;
    if (total === 0) return [];
    
    return [
      { name: 'Present', value: last5DaysStats.present, color: ATTENDANCE_CHART_COLORS.present, percentage: ((last5DaysStats.present / total) * 100).toFixed(1) },
      { name: 'Absent', value: last5DaysStats.absent, color: ATTENDANCE_CHART_COLORS.absent, percentage: ((last5DaysStats.absent / total) * 100).toFixed(1) },
      { name: 'Late', value: last5DaysStats.late, color: ATTENDANCE_CHART_COLORS.late, percentage: ((last5DaysStats.late / total) * 100).toFixed(1) },
    ].filter(item => item.value > 0);
  }, [last5DaysStats]);

  // Bar chart data for 5 days
  const barChartData = useMemo(() => {
    const today = new Date();
    const data: { day: string; present: number; absent: number; late: number }[] = [];
    
    for (let i = 4; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      const dayStats = dailyAttendanceMap[dateKey] || { present: 0, absent: 0, late: 0 };
      
      data.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        present: dayStats.present,
        absent: dayStats.absent,
        late: dayStats.late
      });
    }
    
    return data;
  }, [dailyAttendanceMap]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCalendarMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
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
    setFilters(getDefaultDateRange()); // Reset to default 5-day range
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
        setAttendanceSummary(response.summary ? normalizeAttendanceSummary(response.summary) : null);
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
  }, [currentInstituteId, currentClassId, currentSubjectId, viewType, hasPermission, page, rowsPerPage, filters, toast, user?.id, userRoleAuth]);

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

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Current Selection: <span className="font-medium text-foreground">{getCurrentSelection()}</span>
          </p>
          {/* Dynamic Data Range Display */}
          <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              <CalendarRange className="h-3 w-3 mr-1" />
              {filters.startDate && filters.endDate 
                ? `${filters.startDate} to ${filters.endDate}`
                : 'No date range selected'}
            </Badge>
            <Badge variant="secondary">
              {totalRecords} {totalRecords === 1 ? 'record' : 'records'} across {Math.ceil(totalRecords / rowsPerPage) || 1} {Math.ceil(totalRecords / rowsPerPage) === 1 ? 'page' : 'pages'}
            </Badge>
          </div>
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
              <span className="hidden sm:inline">Refresh Data</span>
              <span className="sm:hidden">Refresh</span>
            </>
          )}
        </Button>
      </header>

      {/* Filters Section */}
      <AttendanceFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
      />

      {/* Tab Navigation - Pill Style with Arrows */}
      <div className="w-full">
        <div className="flex items-center justify-center gap-2 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const tabs = ['records', 'calendar', 'statistics'];
              const currentIndex = tabs.indexOf(activeTab);
              if (currentIndex > 0) {
                setActiveTab(tabs[currentIndex - 1]);
              }
            }}
            disabled={activeTab === 'records'}
            className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </Button>

          {/* Pill Tab Buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1">
            {[
              { id: 'records', icon: List, label: 'Records' },
              { id: 'calendar', icon: CalendarRange, label: 'Calendar' },
              { id: 'statistics', icon: PieChart, label: 'Statistics' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                  ${activeTab === tab.id 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }
                `}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const tabs = ['records', 'calendar', 'statistics'];
              const currentIndex = tabs.indexOf(activeTab);
              if (currentIndex < tabs.length - 1) {
                setActiveTab(tabs[currentIndex + 1]);
              }
            }}
            disabled={activeTab === 'statistics'}
            className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </Button>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-2 pb-4">
          {['records', 'calendar', 'statistics'].map((tab) => (
            <div
              key={tab}
              className={`h-2 w-2 rounded-full transition-all ${
                activeTab === tab ? 'bg-primary w-6' : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="hidden" />

        {/* Tab 1: Records */}
        <TabsContent value="records" className="mt-0 space-y-6">
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
                    <p className="text-lg font-medium text-foreground">{page + 1} of {Math.ceil(totalRecords / rowsPerPage) || 1}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Table - Full Page Height */}
          <Paper sx={{ width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 400px)', minHeight: '400px' }}>
            <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
              <Table stickyHeader aria-label="attendance table" sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow>
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        align={column.align}
                        sx={{ 
                          minWidth: column.minWidth,
                          fontWeight: 'bold',
                          backgroundColor: 'hsl(var(--muted))',
                          color: 'hsl(var(--foreground))',
                          borderBottom: '2px solid hsl(var(--border))',
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          padding: { xs: '8px 6px', sm: '12px 16px' },
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {column.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayData.length > 0 ? (
                    displayData.map((record, index) => (
                      <TableRow 
                        hover 
                        role="checkbox" 
                        tabIndex={-1} 
                        key={index}
                        sx={{
                          '&:hover': {
                            backgroundColor: 'hsl(var(--muted) / 0.5)'
                          }
                        }}
                      >
                        {columns.map((column) => {
                          const value = (record as any)[column.id];
                          return (
                            <TableCell 
                              key={column.id} 
                              align={column.align}
                              sx={{
                                fontSize: { xs: '0.7rem', sm: '0.875rem' },
                                padding: { xs: '6px 4px', sm: '12px 16px' },
                                borderBottom: '1px solid hsl(var(--border))',
                                color: 'hsl(var(--foreground))'
                              }}
                            >
                              {column.format ? column.format(value, record) : value}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} align="center" sx={{ py: 8 }}>
                        <div className="py-8 text-center text-muted-foreground">
                          <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                          <p className="text-base sm:text-lg">No attendance records found</p>
                          <p className="text-xs sm:text-sm mt-1">{getCurrentSelection()}</p>
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
              sx={{
                borderTop: '1px solid hsl(var(--border))',
                '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                  fontSize: { xs: '0.7rem', sm: '0.875rem' }
                },
                '.MuiTablePagination-select': {
                  fontSize: { xs: '0.7rem', sm: '0.875rem' }
                },
                '.MuiTablePagination-actions': {
                  marginLeft: { xs: '4px', sm: '20px' }
                }
              }}
            />
          </Paper>
        </TabsContent>

        {/* Tab 2: Calendar View */}
        <TabsContent value="calendar" className="mt-0">
          <Card className="border-border/50">
            <CardHeader className="border-b border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <CalendarRange className="h-5 w-5 text-primary" />
                  Attendance Calendar
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium min-w-[140px] text-center text-sm sm:text-base">
                    {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6">
              {/* Status Legend with Counts - Mobile Optimized */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Present</span>
                    <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{last5DaysStats.present}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-red-700 dark:text-red-400">Absent</span>
                    <span className="text-sm font-bold text-red-800 dark:text-red-300">{last5DaysStats.absent}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Late</span>
                    <span className="text-sm font-bold text-amber-800 dark:text-amber-300">{last5DaysStats.late}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-orange-700 dark:text-orange-400">Left</span>
                    <span className="text-sm font-bold text-orange-800 dark:text-orange-300">0</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-purple-700 dark:text-purple-400">Left Early</span>
                    <span className="text-sm font-bold text-purple-800 dark:text-purple-300">0</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-800">
                  <div className="w-3 h-3 rounded-full bg-pink-500" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-pink-700 dark:text-pink-400">Left Late</span>
                    <span className="text-sm font-bold text-pink-800 dark:text-pink-300">0</span>
                  </div>
                </div>
              </div>

              {/* Calendar Grid - Responsive */}
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1 md:gap-2">
                {/* Week Day Headers */}
                {weekDays.map(day => (
                  <div key={day} className="text-center text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground py-1 sm:py-2">
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day.charAt(0)}</span>
                  </div>
                ))}
                
                {/* Calendar Days */}
                {getCalendarDays.map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="aspect-square" />;
                  }
                  
                  const stats = getDayStats(day);
                  const isToday = new Date().getDate() === day && 
                                  new Date().getMonth() === calendarMonth.getMonth() && 
                                  new Date().getFullYear() === calendarMonth.getFullYear();
                  
                  return (
                    <div 
                      key={day}
                      className={`
                        aspect-square flex flex-col items-center justify-center rounded-md sm:rounded-lg text-xs sm:text-sm
                        transition-all duration-200 cursor-default p-0.5 sm:p-1
                        ${stats ? 'bg-muted/50' : 'bg-muted/20'}
                        ${isToday ? 'ring-2 ring-primary ring-offset-1 sm:ring-offset-2 ring-offset-background' : ''}
                      `}
                    >
                      <span className="font-medium text-[10px] sm:text-xs md:text-sm mb-0.5">{day}</span>
                      {stats && (
                        <div className="flex flex-wrap gap-0.5 justify-center text-[8px] sm:text-[10px]">
                          {stats.present > 0 && (
                            <span className="bg-emerald-500 text-white px-0.5 sm:px-1 rounded text-[6px] sm:text-[8px] md:text-[10px]">{stats.present}</span>
                          )}
                          {stats.absent > 0 && (
                            <span className="bg-red-500 text-white px-0.5 sm:px-1 rounded text-[6px] sm:text-[8px] md:text-[10px]">{stats.absent}</span>
                          )}
                          {stats.late > 0 && (
                            <span className="bg-amber-500 text-white px-0.5 sm:px-1 rounded text-[6px] sm:text-[8px] md:text-[10px]">{stats.late}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Statistics View */}
        <TabsContent value="statistics" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 5-Day Pie Chart */}
            <Card className="border-border/50">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-primary" />
                  Last 5 Days Attendance Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                {pieChartData.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percentage }) => `${name} ${percentage}%`}
                          labelLine={false}
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number, name: string) => [`${value} students`, name]}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available for last 5 days
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 5-Day Summary Stats */}
            <Card className="border-border/50">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  5-Day Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
                      <UserCheck className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
                      <p className="text-3xl font-bold text-emerald-600">{last5DaysStats.present}</p>
                      <p className="text-sm text-muted-foreground">Present</p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5">
                      <UserX className="h-8 w-8 mx-auto mb-2 text-red-600" />
                      <p className="text-3xl font-bold text-red-600">{last5DaysStats.absent}</p>
                      <p className="text-sm text-muted-foreground">Absent</p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5">
                      <Clock className="h-8 w-8 mx-auto mb-2 text-amber-600" />
                      <p className="text-3xl font-bold text-amber-600">{last5DaysStats.late}</p>
                      <p className="text-sm text-muted-foreground">Late</p>
                    </div>
                  </div>

                  {/* Percentage Bars */}
                  <div className="space-y-3">
                    {pieChartData.map((item) => (
                      <div key={item.name} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="flex-1 text-sm font-medium">{item.name}</span>
                        <span className="font-semibold">{item.value}</span>
                        <span className="text-sm text-muted-foreground w-16 text-right">({item.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 5-Day Bar Chart */}
          <Card className="border-border/50">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Daily Attendance Trend (Last 5 Days)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              {barChartData.some(d => d.present > 0 || d.absent > 0 || d.late > 0) ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="day" className="text-xs" />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="present" name="Present" fill={ATTENDANCE_CHART_COLORS.present} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="absent" name="Absent" fill={ATTENDANCE_CHART_COLORS.absent} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="late" name="Late" fill={ATTENDANCE_CHART_COLORS.late} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available for last 5 days
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Attendance;