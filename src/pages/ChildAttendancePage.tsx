import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar, RefreshCw, UserCheck, UserX, Clock, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { childAttendanceApi, type ChildAttendanceResponse } from '@/api/childAttendance.api';
import { format, subDays, addDays } from 'date-fns';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';

const ChildAttendancePage = () => {
  const { selectedChild } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState<ChildAttendanceResponse | null>(null);
  const today = new Date();
  const [startDate, setStartDate] = useState(format(subDays(today, 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(today, 1), 'yyyy-MM-dd'));
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  const loadAttendance = async () => {
    if (!selectedChild?.id) {
      toast({
        title: "No Child Selected",
        description: "Please select a child to view attendance",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await childAttendanceApi.getChildAttendance({
        studentId: selectedChild.id,
        startDate,
        endDate,
        page: 1,
        limit: 100
      });
      
      setAttendanceData(response);
      toast({
        title: "Success",
        description: `Loaded ${response.data?.length || 0} attendance records`,
      });
    } catch (error) {
      console.error('Error loading attendance:', error);
      toast({
        title: "Error",
        description: "Failed to load attendance data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'late':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
        return null;
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  return (
    <div className="h-screen flex flex-col space-y-4 p-4 overflow-hidden">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Attendance Records
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b">
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
            </div>
          )}
          <Button onClick={loadAttendance} disabled={loading} className="w-full">
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Calendar className="h-4 w-4 mr-2" />
            )}
            Load Attendance
          </Button>
        </CardContent>
      </Card>

      {attendanceData?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Present</CardTitle>
              <UserCheck className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {attendanceData.summary.totalPresent}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Absent</CardTitle>
              <UserX className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {attendanceData.summary.totalAbsent}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Late</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {attendanceData.summary.totalLate}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {attendanceData.summary.attendanceRate}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {attendanceData && (
          <Card className="flex-1 overflow-hidden flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle>Records ({attendanceData.pagination.totalRecords})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
            {attendanceData.data && attendanceData.data.length > 0 ? (
                <Paper sx={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                    <Table stickyHeader aria-label="attendance records table">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Institute</TableCell>
                        <TableCell>Class</TableCell>
                        <TableCell>Subject</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Method</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {attendanceData.data
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((record) => (
                          <TableRow hover key={record.attendanceId}>
                            <TableCell>{new Date(record.markedAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(record.status)}>
                                <div className="flex items-center gap-1">
                                  {getStatusIcon(record.status)}
                                  {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                </div>
                              </Badge>
                            </TableCell>
                            <TableCell>{record.instituteName}</TableCell>
                            <TableCell>{record.className}</TableCell>
                            <TableCell>{record.subjectName}</TableCell>
                            <TableCell>{record.address}</TableCell>
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
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  component="div"
                  count={attendanceData.data.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                />
              </Paper>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No attendance records found for the selected date range.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ChildAttendancePage;
