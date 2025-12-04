import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, FileText, Eye, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import { homeworkSubmissionsApi, HomeworkSubmission } from '@/api/homeworkSubmissions.api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import MUITable from '@/components/ui/mui-table';
import { usePagination } from '@/hooks/usePagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PDFViewer } from '@/components/ui/pdf-viewer';
const StudentHomeworkSubmissions = () => {
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('submissionDate');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [showFilters, setShowFilters] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState('');
  const [selectedPdfTitle, setSelectedPdfTitle] = useState('');
  const {
    toast
  } = useToast();
  const {
    user,
    selectedInstitute,
    selectedClass,
    selectedSubject
  } = useAuth();

  // Use pagination hook with default limit of 50
  const {
    pagination,
    actions,
    getApiParams
  } = usePagination({
    defaultLimit: 50,
    availableLimits: [25, 50, 100]
  });
  const fetchSubmissions = async () => {
    if (!selectedInstitute || !selectedClass || !selectedSubject || !user?.id) {
      console.log('Missing required selection:', {
        selectedInstitute,
        selectedClass,
        selectedSubject,
        userId: user?.id
      });
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const apiParams = getApiParams();
      const params = {
        page: apiParams.page,
        limit: apiParams.limit,
        sortBy,
        sortOrder,
        userId: user.id,
        role: 'Student'
      };
      const response = await homeworkSubmissionsApi.getStudentSubmissions(selectedInstitute.id, selectedClass.id, selectedSubject.id, user.id, params);
      setSubmissions(response.data);
      actions.setTotalCount(response.meta.total);
    } catch (error) {
      console.error('Error fetching student submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load homework submissions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchSubmissions();
  }, [pagination.page, pagination.limit, sortBy, sortOrder, selectedInstitute, selectedClass, selectedSubject, user?.id]);
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    actions.setPage(0);
    fetchSubmissions();
  };
  const resetFilters = () => {
    setSearchTerm('');
    setSortBy('submissionDate');
    setSortOrder('DESC');
    actions.setPage(0);
  };
  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const filteredSubmissions = submissions.filter(submission => searchTerm === '' || submission.homework?.title.toLowerCase().includes(searchTerm.toLowerCase()) || submission.homework?.description.toLowerCase().includes(searchTerm.toLowerCase()));

  // Define columns for MUI table
  const columns = [{
    id: 'title',
    label: 'Homework Title',
    minWidth: 200,
    format: (value: any, row: HomeworkSubmission) => row.homework?.title || '-'
  }, {
    id: 'description',
    label: 'Description',
    minWidth: 250,
    format: (value: any, row: HomeworkSubmission) => <div className="line-clamp-2 text-sm">
          {row.homework?.description || '-'}
        </div>
  }, {
    id: 'submissionDate',
    label: 'Submission Date',
    minWidth: 150,
    format: (value: any, row: HomeworkSubmission) => <div className="flex items-center gap-1 text-sm">
          <Calendar className="h-4 w-4" />
          {format(new Date(row.submissionDate), 'MMM dd, yyyy')}
        </div>
  }, {
    id: 'updatedAt',
    label: 'Last Updated',
    minWidth: 150,
    format: (value: any, row: HomeworkSubmission) => <div className="flex items-center gap-1 text-sm">
          <Clock className="h-4 w-4" />
          {format(new Date(row.updatedAt), 'MMM dd, yyyy HH:mm')}
        </div>
  }, {
    id: 'remarks',
    label: 'Remarks',
    minWidth: 200,
    format: (value: any, row: HomeworkSubmission) => row.remarks ? <div className="p-2 bg-muted rounded text-sm line-clamp-2">
            {row.remarks}
          </div> : '-'
  }];
  const customActions = [...(filteredSubmissions.some(s => s.teacherCorrectionFileUrl) ? [{
    label: 'View Correction',
    action: (row: HomeworkSubmission) => {
      if (row.teacherCorrectionFileUrl) {
        setSelectedPdfUrl(row.teacherCorrectionFileUrl);
        setSelectedPdfTitle('Teacher Correction');
        setPdfModalOpen(true);
      }
    },
    icon: <Eye className="h-4 w-4" />,
    variant: 'destructive' as const
  }] : []), ...(filteredSubmissions.some(s => s.fileUrl) ? [{
    label: 'View My Submission',
    action: (row: HomeworkSubmission) => {
      if (row.fileUrl) {
        setSelectedPdfUrl(row.fileUrl);
        setSelectedPdfTitle('My Submission');
        setPdfModalOpen(true);
      }
    },
    icon: <Eye className="h-4 w-4" />,
    variant: 'default' as const
  }] : [])];
  if (loading) {
    return <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>;
  }
  return <div className="space-y-6">
      {/* Current Selection Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Institute: </span>
              <span className="font-semibold">{selectedInstitute?.name}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Class: </span>
              <span className="font-semibold">{selectedClass?.name}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Subject: </span>
              <span className="font-semibold">{selectedSubject?.name}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Homework Submissions</h2>
          <p className="text-muted-foreground">
            View your homework submissions and teacher corrections
          </p>
        </div>
        <div className="flex items-center gap-2">
          
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input placeholder="Search homework..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sort By</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="submissionDate">Submission Date</SelectItem>
                      <SelectItem value="createdAt">Created Date</SelectItem>
                      <SelectItem value="updatedAt">Updated Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Order</label>
                  <Select value={sortOrder} onValueChange={(value: 'ASC' | 'DESC') => setSortOrder(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DESC">Newest First</SelectItem>
                      <SelectItem value="ASC">Oldest First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Per Page</label>
                  <Select value={pagination.limit.toString()} onValueChange={value => actions.setLimit(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 items</SelectItem>
                      <SelectItem value="50">50 items</SelectItem>
                      <SelectItem value="100">100 items</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2 flex items-end">
                  <div className="flex gap-2 w-full">
                    <Button type="submit" className="flex-1">
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </Button>
                    <Button type="button" variant="outline" onClick={resetFilters}>
                      Reset
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>}

      {/* MUI Table for Students */}
      <MUITable title="Homework Submissions" columns={columns} data={filteredSubmissions} customActions={customActions} page={pagination.page} rowsPerPage={pagination.limit} totalCount={pagination.totalCount} onPageChange={actions.setPage} onRowsPerPageChange={actions.setLimit} rowsPerPageOptions={[25, 50, 100]} allowAdd={false} allowEdit={false} allowDelete={false} />

      {/* Empty State */}
      {filteredSubmissions.length === 0 && !loading && <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Submissions Found</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm ? 'No homework submissions match your search criteria.' : 'You haven\'t submitted any homework yet.'}
            </p>
          </CardContent>
        </Card>}
      
      {/* PDF Viewer Modal */}
      <Dialog open={pdfModalOpen} onOpenChange={setPdfModalOpen}>
        <DialogContent className="max-w-5xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedPdfTitle}</DialogTitle>
          </DialogHeader>
          <div className="w-full h-[calc(90vh-80px)]">
            {selectedPdfUrl && <PDFViewer url={selectedPdfUrl} title={selectedPdfTitle} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};
export default StudentHomeworkSubmissions;