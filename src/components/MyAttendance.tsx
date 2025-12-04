import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, MapPin, User, RefreshCw, AlertTriangle, TrendingUp, UserCheck, UserX, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRefreshWithCooldown } from '@/hooks/useRefreshWithCooldown';
import { studentAttendanceApi, type StudentAttendanceRecord, type StudentAttendanceResponse } from '@/api/studentAttendance.api';
import { useApiRequest } from '@/hooks/useApiRequest';

const MyAttendance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [attendanceData, setAttendanceData] = useState<StudentAttendanceResponse | null>(null);
  const [startDate, setStartDate] = useState('2025-09-01');
  const [endDate, setEndDate] = useState('2025-09-27');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [showFilters, setShowFilters] = useState(false);

  const { execute: fetchAttendance, loading } = useApiRequest(studentAttendanceApi.getStudentAttendance);
  const { refresh, isRefreshing, canRefresh, cooldownRemaining } = useRefreshWithCooldown(10);

  const loadStudentAttendance = async (forceRefresh = false) => {
    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "Please log in to view attendance",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Loading attendance for student:', user.id);
      const response = await fetchAttendance({
        studentId: user.id,
        startDate,
        endDate,
        page: currentPage,
        limit,
        userId: user.id,
        role: 'Student'
      }, forceRefresh);
      
      console.log('Student attendance API response:', response);
      setAttendanceData(response);
      
      toast({
        title: response.success ? "Attendance Loaded" : "Partial Load",
        description: response.message || `Loaded ${response.data?.length || 0} attendance records`,
      });
    } catch (error) {
      console.error('Error loading student attendance:', error);
      toast({
        title: "Error",
        description: "Failed to load attendance data",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadStudentAttendance();
    }
  }, [user?.id, currentPage, limit]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
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

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present':
        return <UserCheck className="h-4 w-4" />;
      case 'absent':
        return <UserX className="h-4 w-4" />;
      case 'late':
        return <Clock className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-muted-foreground">
              Please log in to view your attendance records.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Attendance</h1>
          <p className="text-muted-foreground">
            Your attendance records and statistics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button 
            onClick={() => loadStudentAttendance(false)} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Date Filters and Page Settings */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Filters & Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div>
                <label className="text-sm font-medium mb-2 block">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Records Per Page</label>
                <select 
                  className="w-full p-2 border border-input rounded-md"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <Button onClick={() => loadStudentAttendance(false)} disabled={loading} className="md:col-span-2">
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {attendanceData?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Late</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {attendanceData.summary.totalLate}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {attendanceData.summary.attendanceRate}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* API Status Info */}
      {attendanceData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Response Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant={attendanceData.success ? "default" : "destructive"}>
                  {attendanceData.success ? "Success" : "Error"}
                </Badge>
                <span className="text-muted-foreground">{attendanceData.message}</span>
              </div>
              <div>
                <span className="font-medium">Total Records: </span>
                <span>{attendanceData.pagination.totalRecords}</span>
              </div>
              <div>
                <span className="font-medium">Records Per Page: </span>
                <span>{attendanceData.pagination.recordsPerPage}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
          {attendanceData?.pagination && (
            <p className="text-sm text-muted-foreground">
              Page {attendanceData.pagination.currentPage} of {attendanceData.pagination.totalPages} 
              ({attendanceData.pagination.totalRecords} total records)
            </p>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading attendance...</span>
            </div>
          ) : attendanceData?.data && attendanceData.data.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Institute</TableHead>
                      <TableHead>Class & Subject</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Marked By</TableHead>
                      <TableHead>Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceData.data.map((record) => (
                      <TableRow key={record.attendanceId}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{formatDate(record.markedAt)}</span>
                            <span className="text-sm text-muted-foreground">{formatTime(record.markedAt)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(record.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(record.status)}
                              {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{record.instituteName}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{record.className}</span>
                            <span className="text-sm text-muted-foreground">{record.subjectName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="max-w-[150px] truncate" title={record.address}>
                              {record.address}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{record.markedBy}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {record.markingMethod}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {attendanceData.pagination && attendanceData.pagination.totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={!attendanceData.pagination.hasPrevPage || loading}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {attendanceData.pagination.totalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={!attendanceData.pagination.hasNextPage || loading}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Attendance Records</h3>
              <p className="text-muted-foreground">
                No attendance records found for the selected date range.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyAttendance;