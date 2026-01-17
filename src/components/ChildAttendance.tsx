import React, { useState, useEffect } from 'react';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, MapPin, User, RefreshCw, AlertTriangle, TrendingUp, UserCheck, UserX, LogOut, DoorOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { childAttendanceApi, type ChildAttendanceRecord, type ChildAttendanceResponse } from '@/api/childAttendance.api';
import { useApiRequest } from '@/hooks/useApiRequest';
import { AttendanceStatus, ATTENDANCE_STATUS_CONFIG, normalizeAttendanceSummary } from '@/types/attendance.types';

const ChildAttendance = () => {
  const { selectedChild, user } = useAuth();
  const userRole = useInstituteRole();
  const { toast } = useToast();
  const [attendanceData, setAttendanceData] = useState<ChildAttendanceResponse | null>(null);
  const [startDate, setStartDate] = useState('2025-09-01');
  const [endDate, setEndDate] = useState('2025-09-07');
  const [currentPage, setCurrentPage] = useState(0);
  const [limit, setLimit] = useState(50);
  const [rowsPerPageOptions] = useState([25, 50, 100]);

  const { execute: fetchAttendance, loading } = useApiRequest(childAttendanceApi.getChildAttendance);

  const loadChildAttendance = async () => {
    if (!selectedChild?.id) {
      toast({
        title: "No Child Selected",
        description: "Please select a child to view attendance",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Loading attendance for child:', selectedChild.id);
      const response = await fetchAttendance({
        studentId: selectedChild.id,
        startDate,
        endDate,
        page: currentPage + 1, // API expects 1-based pagination
        limit,
        userId: user?.id,
        role: userRole || 'User'
      });
      
      console.log('Child attendance API response:', response);
      setAttendanceData(response);
      
      toast({
        title: response.success ? "Attendance Loaded" : "Partial Load",
        description: response.message || `Loaded ${response.data?.length || 0} attendance records`,
      });
    } catch (error) {
      console.error('Error loading child attendance:', error);
      toast({
        title: "Error",
        description: "Failed to load attendance data",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (selectedChild?.id) {
      loadChildAttendance();
    }
  }, [selectedChild?.id, currentPage]);

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
    const config = ATTENDANCE_STATUS_CONFIG[status?.toLowerCase() as AttendanceStatus];
    if (!config) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    return `${config.bgColor} ${config.color}`;
  };

  const getStatusIcon = (status: string) => {
    const normalizedStatus = status?.toLowerCase() as AttendanceStatus;
    const iconMap: Record<AttendanceStatus, React.ReactNode> = {
      present: <UserCheck className="h-4 w-4" />,
      absent: <UserX className="h-4 w-4" />,
      late: <Clock className="h-4 w-4" />,
      left: <LogOut className="h-4 w-4" />,
      left_early: <DoorOpen className="h-4 w-4" />,
      left_lately: <Clock className="h-4 w-4" />
    };
    return iconMap[normalizedStatus] || <User className="h-4 w-4" />;
  };


  if (!selectedChild) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Child Selected</h3>
            <p className="text-muted-foreground">
              Please select a child to view their attendance records.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 min-h-screen flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Child Attendance</h1>
          <p className="text-muted-foreground">
            Viewing attendance for: <span className="font-semibold">{(selectedChild as any).name}</span>
          </p>
        </div>
        <Button 
          onClick={loadChildAttendance} 
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

      {/* Date Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Date Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
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
            <Button onClick={loadChildAttendance} disabled={loading}>
              Apply Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {attendanceData?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Present</CardTitle>
              <UserCheck className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {attendanceData.summary.totalPresent || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Absent</CardTitle>
              <UserX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {attendanceData.summary.totalAbsent || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Late</CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {attendanceData.summary.totalLate || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Left</CardTitle>
              <LogOut className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {attendanceData.summary.totalLeft || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Left Early</CardTitle>
              <DoorOpen className="h-4 w-4 text-pink-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-pink-600">
                {attendanceData.summary.totalLeftEarly || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Left Late</CardTitle>
              <Clock className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">
                {attendanceData.summary.totalLeftLately || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {attendanceData.summary.attendanceRate || 0}%
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
              API Response Status
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

      {/* Attendance Records MUI Table */}
      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
          {attendanceData?.pagination && (
            <p className="text-sm text-muted-foreground">
              Page {attendanceData.pagination.currentPage} of {attendanceData.pagination.totalPages} 
              ({attendanceData.pagination.totalRecords} total records)
            </p>
          )}
        </CardHeader>
        <CardContent className="p-0 flex-1 min-h-0">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading attendance...</span>
            </div>
          ) : attendanceData?.data && attendanceData.data.length > 0 ? (
            <Paper sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <TableContainer sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                <Table stickyHeader aria-label="attendance table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date & Time</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Institute</TableCell>
                      <TableCell>Class & Subject</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Marked By</TableCell>
                      <TableCell>Method</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {attendanceData.data
                      .slice(currentPage * limit, currentPage * limit + limit)
                      .map((record) => (
                      <TableRow hover role="checkbox" tabIndex={-1} key={record.attendanceId}>
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
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={rowsPerPageOptions}
                component="div"
                count={attendanceData.data.length}
                rowsPerPage={limit}
                page={currentPage}
                onPageChange={(event: unknown, newPage: number) => {
                  setCurrentPage(newPage);
                }}
                onRowsPerPageChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  setLimit(parseInt(event.target.value, 10));
                  setCurrentPage(0);
                }}
              />
            </Paper>
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

export default ChildAttendance;