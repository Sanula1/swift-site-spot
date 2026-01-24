import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Calendar, Clock, MapPin, User, RefreshCw, AlertTriangle, TrendingUp, UserCheck, UserX, Filter, Building2, BookOpen, GraduationCap, ChevronLeft, ChevronRight, CalendarDays, Zap, LogOut, DoorOpen, List, PieChart, CalendarRange } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRefreshWithCooldown } from '@/hooks/useRefreshWithCooldown';
import { studentAttendanceApi, type StudentAttendanceRecord, type StudentAttendanceResponse } from '@/api/studentAttendance.api';
import { AttendanceStatus, ATTENDANCE_STATUS_CONFIG, normalizeAttendanceSummary, ATTENDANCE_CHART_COLORS } from '@/types/attendance.types';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const MyAttendance = () => {
  const { user, selectedInstitute, selectedClass, selectedSubject, currentInstituteId, currentClassId, currentSubjectId } = useAuth();
  const params = useParams();
  const { toast } = useToast();
  const [attendanceData, setAttendanceData] = useState<StudentAttendanceResponse | null>(null);
  const [activeTab, setActiveTab] = useState('records');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  
  const instituteId = params.instituteId || currentInstituteId || selectedInstitute?.id;
  const classId = params.classId || currentClassId || selectedClass?.id;
  const subjectId = params.subjectId || currentSubjectId || selectedSubject?.id;
  
  const getContextLevel = () => {
    if (subjectId && classId && instituteId) return 'subject';
    if (classId && instituteId) return 'class';
    if (instituteId) return 'institute';
    return 'all';
  };
  
  const contextLevel = getContextLevel();
  
  const getYesterday = () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  };
  
  const getTomorrow = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  };

  const getMinDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getYesterday());
  const [endDate, setEndDate] = useState(getTomorrow());
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const { refresh, isRefreshing, canRefresh, cooldownRemaining } = useRefreshWithCooldown(10);

  const loadStudentAttendance = async (forceRefresh = false) => {
    if (!user?.id || !instituteId) {
      toast({
        title: "Missing Context",
        description: "Please select an institute to view attendance",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await studentAttendanceApi.getAttendance({
        studentId: user.id,
        instituteId,
        classId,
        subjectId,
        startDate,
        endDate,
        page: currentPage,
        limit,
        userId: user.id,
        role: 'Student'
      }, forceRefresh);
      
      setAttendanceData(response);
    } catch (error) {
      console.error('Error loading student attendance:', error);
      toast({
        title: "Error",
        description: "Failed to load attendance data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id && instituteId) {
      loadStudentAttendance();
    }
  }, [user?.id, currentPage, limit, instituteId, classId, subjectId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusStyles = (status: string) => {
    const normalizedStatus = status?.toLowerCase() as AttendanceStatus;
    const config = ATTENDANCE_STATUS_CONFIG[normalizedStatus] || ATTENDANCE_STATUS_CONFIG.present;
    
    const iconMap: Record<AttendanceStatus, React.ReactNode> = {
      present: <UserCheck className="h-4 w-4" />,
      absent: <UserX className="h-4 w-4" />,
      late: <Clock className="h-4 w-4" />,
      left: <LogOut className="h-4 w-4" />,
      left_early: <DoorOpen className="h-4 w-4" />,
      left_lately: <Clock className="h-4 w-4" />
    };

    const dotColorMap: Record<AttendanceStatus, string> = {
      present: 'bg-emerald-500',
      absent: 'bg-red-500',
      late: 'bg-amber-500',
      left: 'bg-purple-500',
      left_early: 'bg-pink-500',
      left_lately: 'bg-indigo-500'
    };

    return {
      bg: config.bgColor,
      text: config.color,
      icon: iconMap[normalizedStatus] || <User className="h-4 w-4" />,
      dot: dotColorMap[normalizedStatus] || 'bg-muted-foreground'
    };
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

  // Create attendance map for calendar
  const attendanceMap = useMemo(() => {
    const map: Record<string, AttendanceStatus> = {};
    if (attendanceData?.data) {
      attendanceData.data.forEach((record) => {
        const dateKey = new Date(record.date).toISOString().split('T')[0];
        map[dateKey] = record.status?.toLowerCase() as AttendanceStatus;
      });
    }
    return map;
  }, [attendanceData]);

  const getDateStatus = (day: number): AttendanceStatus | null => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return attendanceMap[dateStr] || null;
  };

  const getDateStatusColor = (status: AttendanceStatus | null): string => {
    if (!status) return 'bg-muted/50 text-muted-foreground';
    
    const colorMap: Record<AttendanceStatus, string> = {
      present: 'bg-emerald-500 text-white',
      absent: 'bg-red-500 text-white',
      late: 'bg-amber-500 text-white',
      left: 'bg-purple-500 text-white',
      left_early: 'bg-pink-500 text-white',
      left_lately: 'bg-indigo-500 text-white'
    };
    
    return colorMap[status] || 'bg-muted/50 text-muted-foreground';
  };

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

  // Pie chart data
  const pieChartData = useMemo(() => {
    const summary = attendanceData?.summary ? normalizeAttendanceSummary(attendanceData.summary) : null;
    if (!summary) return [];

    const data = [
      { name: 'Present', value: summary.totalPresent, color: ATTENDANCE_CHART_COLORS.present },
      { name: 'Absent', value: summary.totalAbsent, color: ATTENDANCE_CHART_COLORS.absent },
      { name: 'Late', value: summary.totalLate, color: ATTENDANCE_CHART_COLORS.late },
      { name: 'Left', value: summary.totalLeft, color: ATTENDANCE_CHART_COLORS.left },
      { name: 'Left Early', value: summary.totalLeftEarly, color: ATTENDANCE_CHART_COLORS.left_early },
      { name: 'Left Late', value: summary.totalLeftLately, color: ATTENDANCE_CHART_COLORS.left_lately },
    ].filter(item => item.value > 0);

    return data;
  }, [attendanceData]);

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-muted-foreground">Please log in to view your attendance records.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const summary = attendanceData?.summary ? normalizeAttendanceSummary(attendanceData.summary) : null;
  const totalRecords = summary ? 
    (summary.totalPresent + summary.totalAbsent + summary.totalLate + summary.totalLeft + summary.totalLeftEarly + summary.totalLeftLately) : 0;

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Modern Header with Context Breadcrumb */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 md:p-8 border border-primary/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                <CalendarDays className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Attendance</h1>
              </div>
            </div>
            
            {/* Context Breadcrumb */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {selectedInstitute && (
                <Badge variant="outline" className="bg-background/60 backdrop-blur-sm border-border/50 gap-1.5 py-1.5 px-3">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  {selectedInstitute.name}
                </Badge>
              )}
              {selectedClass && (
                <>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline" className="bg-background/60 backdrop-blur-sm border-border/50 gap-1.5 py-1.5 px-3">
                    <GraduationCap className="h-3.5 w-3.5 text-primary" />
                    {selectedClass.name}
                  </Badge>
                </>
              )}
              {selectedSubject && (
                <>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline" className="bg-background/60 backdrop-blur-sm border-border/50 gap-1.5 py-1.5 px-3">
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    {selectedSubject.name}
                  </Badge>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2 bg-background/50 backdrop-blur-sm hover:bg-background/80"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            <Button 
              onClick={() => loadStudentAttendance(false)} 
              disabled={loading}
              variant="outline"
              size="sm"
              className="gap-2 bg-background/50 backdrop-blur-sm hover:bg-background/80"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-primary" />
              Filters & Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  min={getMinDate()}
                  max={endDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  min={startDate}
                  max={getMaxDate()}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Records Per Page</label>
                <select 
                  className="w-full h-10 px-3 border border-input rounded-md bg-background text-sm"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <Button onClick={() => loadStudentAttendance(false)} disabled={loading} className="md:col-span-2 gap-2">
                <Zap className="h-4 w-4" />
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Navigation - Arrow Style (Manual Navigation) */}
      <div className="w-full">
        {/* Arrow Navigation Header */}
        <div className="flex items-center justify-center gap-4 py-4">
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
            className="h-10 w-10 rounded-full bg-muted/50 hover:bg-muted disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          {/* Tab Dots Indicator */}
          <div className="flex items-center gap-2">
            {[
              { id: 'records', icon: List, label: 'Records' },
              { id: 'calendar', icon: CalendarRange, label: 'Calendar' },
              { id: 'statistics', icon: PieChart, label: 'Statistics' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300
                  ${activeTab === tab.id
                    ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }
                `}
              >
                <tab.icon className="h-4 w-4" />
                <span className="text-sm font-medium hidden sm:inline">{tab.label}</span>
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
            className="h-10 w-10 rounded-full bg-muted/50 hover:bg-muted disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Down Arrow Indicator */}
        <div className="flex justify-center pb-2">
          <div className="animate-bounce text-muted-foreground/50">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12l7 7 7-7"/>
            </svg>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="hidden" />

        {/* Tab 1: Records (Original List View) */}
        <TabsContent value="records" className="mt-6 space-y-6">
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <CardContent className="relative pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Present</p>
                      <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{summary.totalPresent}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/10">
                      <UserCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                  {totalRecords > 0 && (
                    <div className="mt-3 h-1.5 bg-emerald-500/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${(summary.totalPresent / totalRecords) * 100}%` }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-red-500/10 to-red-500/5">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <CardContent className="relative pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Absent</p>
                      <p className="text-3xl font-bold text-red-600 dark:text-red-400">{summary.totalAbsent}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-red-500/10">
                      <UserX className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                  {totalRecords > 0 && (
                    <div className="mt-3 h-1.5 bg-red-500/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500 rounded-full transition-all duration-500"
                        style={{ width: `${(summary.totalAbsent / totalRecords) * 100}%` }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <CardContent className="relative pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Late</p>
                      <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{summary.totalLate}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-500/10">
                      <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                  {totalRecords > 0 && (
                    <div className="mt-3 h-1.5 bg-amber-500/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${(summary.totalLate / totalRecords) * 100}%` }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500/10 to-purple-500/5">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <CardContent className="relative pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Left</p>
                      <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{summary.totalLeft}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-purple-500/10">
                      <LogOut className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  {totalRecords > 0 && (
                    <div className="mt-3 h-1.5 bg-purple-500/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${(summary.totalLeft / totalRecords) * 100}%` }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-pink-500/10 to-pink-500/5">
                <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <CardContent className="relative pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Left Early</p>
                      <p className="text-3xl font-bold text-pink-600 dark:text-pink-400">{summary.totalLeftEarly}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-pink-500/10">
                      <DoorOpen className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                    </div>
                  </div>
                  {totalRecords > 0 && (
                    <div className="mt-3 h-1.5 bg-pink-500/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-pink-500 rounded-full transition-all duration-500"
                        style={{ width: `${(summary.totalLeftEarly / totalRecords) * 100}%` }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-indigo-500/10 to-indigo-500/5">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <CardContent className="relative pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Left Late</p>
                      <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{summary.totalLeftLately}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-indigo-500/10">
                      <Clock className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </div>
                  {totalRecords > 0 && (
                    <div className="mt-3 h-1.5 bg-indigo-500/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${(summary.totalLeftLately / totalRecords) * 100}%` }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary/10 to-primary/5">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <CardContent className="relative pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Rate</p>
                      <p className="text-3xl font-bold text-primary">{summary.attendanceRate}%</p>
                    </div>
                    <div className="p-3 rounded-xl bg-primary/10">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 bg-primary/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${summary.attendanceRate}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Attendance Records Table */}
          <Card className="border-border/50">
            <CardHeader className="border-b border-border/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <CardTitle className="text-lg font-semibold">Attendance Records</CardTitle>
                {attendanceData?.pagination && (
                  <p className="text-sm text-muted-foreground">
                    Page {attendanceData.pagination.currentPage} of {attendanceData.pagination.totalPages} 
                    <span className="hidden sm:inline"> • {attendanceData.pagination.totalRecords} total records</span>
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-muted-foreground">Loading attendance...</span>
                </div>
              ) : attendanceData?.data && attendanceData.data.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableHead className="font-semibold">Date & Time</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold">Institute</TableHead>
                          {contextLevel === 'class' || contextLevel === 'subject' ? (
                            <TableHead className="font-semibold">Class</TableHead>
                          ) : null}
                          {contextLevel === 'subject' ? (
                            <TableHead className="font-semibold">Subject</TableHead>
                          ) : null}
                          <TableHead className="font-semibold hidden md:table-cell">Location</TableHead>
                          <TableHead className="font-semibold hidden lg:table-cell">Method</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceData.data.map((record, index) => {
                          const statusStyles = getStatusStyles(record.status);
                          return (
                            <TableRow 
                              key={`${record.studentId}-${record.date}-${index}`} 
                              className="group hover:bg-muted/30 transition-colors"
                            >
                              <TableCell className="py-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-lg ${statusStyles.bg} border flex items-center justify-center shrink-0`}>
                                    <span className={`text-xs font-bold ${statusStyles.text}`}>
                                      {new Date(record.date).getDate()}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{formatDate(record.date)}</p>
                                    <p className="text-xs text-muted-foreground">{formatTime(record.date)}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={`${statusStyles.bg} ${statusStyles.text} border gap-1.5 font-medium`}>
                                  {statusStyles.icon}
                                  {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <p className="font-medium text-sm">{record.instituteName || 'N/A'}</p>
                              </TableCell>
                              {contextLevel === 'class' || contextLevel === 'subject' ? (
                                <TableCell>
                                  <p className="font-medium text-sm">{record.className || 'N/A'}</p>
                                </TableCell>
                              ) : null}
                              {contextLevel === 'subject' ? (
                                <TableCell>
                                  <p className="font-medium text-sm">{record.subjectName || 'N/A'}</p>
                                </TableCell>
                              ) : null}
                              <TableCell className="hidden md:table-cell">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                                  <span className="max-w-[150px] truncate" title={record.location}>
                                    {record.location || 'N/A'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <Badge variant="outline" className="text-xs font-normal">
                                  {record.markingMethod}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {attendanceData.pagination && attendanceData.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-border/50">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-2">
                        {Array.from({ length: Math.min(5, attendanceData.pagination.totalPages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          );
                        })}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(attendanceData.pagination.totalPages, prev + 1))}
                        disabled={currentPage === attendanceData.pagination.totalPages}
                        className="gap-1"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold mb-1">No Attendance Records</h3>
                    <p className="text-sm text-muted-foreground">No attendance records found for the selected date range</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Calendar View */}
        <TabsContent value="calendar" className="mt-6">
          <Card className="border-border/50">
            <CardHeader className="border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <CalendarRange className="h-5 w-5 text-primary" />
                  Attendance Calendar
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium min-w-[140px] text-center">
                    {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              {/* Legend */}
              <div className="flex flex-wrap gap-3 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-emerald-500" />
                  <span className="text-sm">Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500" />
                  <span className="text-sm">Absent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-amber-500" />
                  <span className="text-sm">Late</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-purple-500" />
                  <span className="text-sm">Left</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-pink-500" />
                  <span className="text-sm">Left Early</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-indigo-500" />
                  <span className="text-sm">Left Late</span>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 md:gap-2">
                {/* Week Day Headers */}
                {weekDays.map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
                
                {/* Calendar Days */}
                {getCalendarDays.map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="aspect-square" />;
                  }
                  
                  const status = getDateStatus(day);
                  const statusColor = getDateStatusColor(status);
                  const isToday = new Date().getDate() === day && 
                                  new Date().getMonth() === calendarMonth.getMonth() && 
                                  new Date().getFullYear() === calendarMonth.getFullYear();
                  
                  return (
                    <div 
                      key={day}
                      className={`
                        aspect-square flex items-center justify-center rounded-lg text-sm font-medium
                        transition-all duration-200 cursor-default
                        ${statusColor}
                        ${isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                      `}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Statistics View */}
        <TabsContent value="statistics" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <Card className="border-border/50">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-primary" />
                  Attendance Distribution
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
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number, name: string) => [`${value} days`, name]}
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
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Statistics */}
            <Card className="border-border/50">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Monthly Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                {summary && totalRecords > 0 ? (
                  <div className="space-y-4">
                    {/* Attendance Rate */}
                    <div className="text-center p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
                      <p className="text-sm text-muted-foreground mb-2">Overall Attendance Rate</p>
                      <p className="text-5xl font-bold text-primary">{summary.attendanceRate}%</p>
                    </div>

                    {/* Stats Breakdown */}
                    <div className="space-y-3">
                      {[
                        { label: 'Present', count: summary.totalPresent, color: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' },
                        { label: 'Absent', count: summary.totalAbsent, color: 'bg-red-500', textColor: 'text-red-600 dark:text-red-400' },
                        { label: 'Late', count: summary.totalLate, color: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400' },
                        { label: 'Left', count: summary.totalLeft, color: 'bg-purple-500', textColor: 'text-purple-600 dark:text-purple-400' },
                        { label: 'Left Early', count: summary.totalLeftEarly, color: 'bg-pink-500', textColor: 'text-pink-600 dark:text-pink-400' },
                        { label: 'Left Late', count: summary.totalLeftLately, color: 'bg-indigo-500', textColor: 'text-indigo-600 dark:text-indigo-400' },
                      ].map((item) => {
                        const percentage = totalRecords > 0 ? ((item.count / totalRecords) * 100).toFixed(1) : '0';
                        return (
                          <div key={item.label} className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${item.color}`} />
                            <span className="flex-1 text-sm font-medium">{item.label}</span>
                            <span className={`font-semibold ${item.textColor}`}>{item.count}</span>
                            <span className="text-sm text-muted-foreground w-16 text-right">({percentage}%)</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Total */}
                    <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                      <span className="font-medium">Total Records</span>
                      <span className="text-xl font-bold">{totalRecords}</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground py-16">
                    No statistics available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyAttendance;
