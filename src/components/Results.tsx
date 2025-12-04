import React, { useState, useEffect } from 'react';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import DataTable from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataCardView } from '@/components/ui/data-card-view';
import { RefreshCw, Filter, TrendingUp, Award, BookOpen, Calendar, Eye, Edit, Trash2 } from 'lucide-react';
import { useAuth, type UserRole } from '@/contexts/AuthContext';
import { AccessControl } from '@/utils/permissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import CreateResultForm from '@/components/forms/CreateResultForm';
import { getBaseUrl } from '@/contexts/utils/auth.api';

const mockResults = [
  {
    id: '1',
    studentName: 'Alice Johnson',
    subject: 'Mathematics',
    examType: 'Midterm',
    score: 88,
    grade: 'B+',
    date: '2024-03-15',
    status: 'Pass'
  },
  {
    id: '2',
    studentName: 'Bob Williams',
    subject: 'Physics',
    examType: 'Final',
    score: 92,
    grade: 'A-',
    date: '2024-05-20',
    status: 'Pass'
  },
  {
    id: '3',
    studentName: 'Charlie Brown',
    subject: 'English',
    examType: 'Quiz',
    score: 76,
    grade: 'C',
    date: '2024-04-01',
    status: 'Fail'
  }
];

const Results = () => {
  const { user, selectedInstitute, selectedClass, selectedSubject, currentInstituteId, currentClassId, currentSubjectId } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [resultsData, setResultsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');

  const getAuthToken = () => {
    const token = localStorage.getItem('access_token') || 
                  localStorage.getItem('token') || 
                  localStorage.getItem('authToken');
    return token;
  };

  const getApiHeaders = () => {
    const token = getAuthToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  };

  const buildQueryParams = () => {
    const params = new URLSearchParams();

    // Add context-aware filtering
    if (currentInstituteId) {
      params.append('instituteId', currentInstituteId);
    }

    if (currentClassId) {
      params.append('classId', currentClassId);
    }

    if (currentSubjectId) {
      params.append('subjectId', currentSubjectId);
    }

    return params;
  };

  const buildRequestBody = (additionalData: any = {}) => {
    const body: any = { ...additionalData };

    if (currentInstituteId) {
      body.instituteId = currentInstituteId;
    }

    if (currentClassId) {
      body.classId = currentClassId;
    }

    if (currentSubjectId) {
      body.subjectId = currentSubjectId;
    }

    return body;
  };

  const handleLoadData = async () => {
    setIsLoading(true);
    console.log('Loading results data...');
    console.log(`Current context - Institute: ${selectedInstitute?.name}, Class: ${selectedClass?.name}, Subject: ${selectedSubject?.name}`);
    
    try {
      const baseUrl = getBaseUrl();
      const headers = getApiHeaders();
      const params = buildQueryParams();
      
      // For now, simulate API call with mock data but in real scenario would be:
      // const url = params.toString() ? `${baseUrl}/results?${params}` : `${baseUrl}/results`;
      // const response = await fetch(url, { method: 'GET', headers });
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Filter mock data based on filters
      let filteredData = mockResults;
      
      if (searchTerm) {
        filteredData = filteredData.filter(result =>
          result.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          result.subject.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      if (statusFilter !== 'all') {
        filteredData = filteredData.filter(result => result.status === statusFilter);
      }
      
      if (typeFilter !== 'all') {
        filteredData = filteredData.filter(result => result.examType === typeFilter);
      }
      
      if (subjectFilter !== 'all') {
        filteredData = filteredData.filter(result =>
          result.subject.toLowerCase().includes(subjectFilter.toLowerCase())
        );
      }
      
      setResultsData(filteredData);
      setDataLoaded(true);
      toast({
        title: "Data Loaded",
        description: `Successfully loaded ${filteredData.length} results.`
      });
    } catch (error) {
      toast({
        title: "Load Failed",
        description: "Failed to load results data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddResult = () => {
    console.log('Add new result');
  };

  const handleEditResult = (result: any) => {
    console.log('Edit result:', result);
    setSelectedResult(result);
    setIsEditDialogOpen(true);
  };

  const handleUpdateResult = (resultData: any) => {
    console.log('Updating result:', resultData);
    
    // In real scenario, would include context in request body:
    // const requestBody = buildRequestBody(resultData);
    
    toast({
      title: "Result Updated",
      description: `Result for ${resultData.studentName} has been updated successfully.`
    });
    setIsEditDialogOpen(false);
    setSelectedResult(null);
  };

  const handleDeleteResult = (result: any) => {
    console.log('Delete result:', result);
    toast({
      title: "Result Deleted",
      description: `Result for ${result.studentName} has been deleted.`,
      variant: "destructive"
    });
  };

  const handleViewResult = (result: any) => {
    console.log('View result details:', result);
    toast({
      title: "View Result",
      description: `Viewing result for: ${result.studentName}`
    });
  };

  const handleCreateResult = (resultData: any) => {
    console.log('Creating result:', resultData);
    
    // In real scenario, would include context in request body:
    // const requestBody = buildRequestBody(resultData);
    
    toast({
      title: "Result Created",
      description: `Result for ${resultData.studentName} has been created successfully.`
    });
    setIsCreateDialogOpen(false);
  };

  const userRole = useInstituteRole();
  const canAdd = AccessControl.hasPermission(userRole, 'create-result');
  const canEdit = AccessControl.hasPermission(userRole, 'edit-result');
  const canDelete = AccessControl.hasPermission(userRole, 'delete-result');

  const getContextTitle = () => {
    const contexts = [];
    
    if (selectedInstitute) {
      contexts.push(selectedInstitute.name);
    }
    
    if (selectedClass) {
      contexts.push(selectedClass.name);
    }
    
    if (selectedSubject) {
      contexts.push(selectedSubject.name);
    }
    
    let title = 'Academic Results';
    if (contexts.length > 0) {
      title += ` (${contexts.join(' → ')})`;
    }
    
    return title;
  };

  const resultsColumns = [
    { key: 'studentName', header: 'Student Name' },
    { key: 'subject', header: 'Subject' },
    { key: 'examType', header: 'Exam Type' },
    { key: 'score', header: 'Score' },
    { key: 'grade', header: 'Grade' },
    { key: 'date', header: 'Date' },
    { 
      key: 'status', 
      header: 'Status',
      render: (value: any) => (
        <Badge variant={
          value === 'Pass' ? 'default' : 
          value === 'Fail' ? 'destructive' : 
          'secondary'
        }>
          {value}
        </Badge>
      )
    }
  ];

  const customActions = [
    {
      label: 'View',
      action: (result: any) => handleViewResult(result),
      icon: <Eye className="h-3 w-3" />,
      variant: 'outline' as const
    },
    ...(canEdit ? [{
      label: 'Edit',
      action: (result: any) => handleEditResult(result),
      icon: <Edit className="h-3 w-3" />,
      variant: 'outline' as const
    }] : []),
    ...(canDelete ? [{
      label: 'Delete',
      action: (result: any) => handleDeleteResult(result),
      icon: <Trash2 className="h-3 w-3" />,
      variant: 'destructive' as const
    }] : [])
  ];

  return (
    <div className="space-y-6">
      {!dataLoaded ? (
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {getContextTitle()}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Click the button below to load academic results data
          </p>
          <Button 
            onClick={handleLoadData} 
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Loading Data...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Load Data
              </>
            )}
          </Button>
        </div>
      ) : (
        <>
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {getContextTitle()}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Track student performance, generate reports, and analyze trends
            </p>
          </div>

          <div className="flex items-center justify-between mb-6">
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
            </div>
            
            <Button 
              onClick={handleLoadData} 
              disabled={isLoading}
              variant="outline"
              size="sm"
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

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border mb-6">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Search Results
                </label>
                <Input
                  placeholder="Search results..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Status
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Pass">Pass</SelectItem>
                    <SelectItem value="Fail">Fail</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Exam Type
                </label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Exam Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Midterm">Midterm</SelectItem>
                    <SelectItem value="Final">Final</SelectItem>
                    <SelectItem value="Quiz">Quiz</SelectItem>
                    <SelectItem value="Assignment">Assignment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Subject
                </label>
                <Select value={subjectFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                    <SelectItem value="Physics">Physics</SelectItem>
                    <SelectItem value="English">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Mobile View Content - Always Card View */}
          <div className="md:hidden">
            <DataCardView
              data={resultsData}
              columns={resultsColumns}
              customActions={customActions}
              allowEdit={false}
              allowDelete={false}
            />
          </div>

          {/* Desktop View */}
          <div className="hidden md:block">
            <DataTable
              title="Academic Results"
              data={resultsData}
              columns={resultsColumns}
              onAdd={canAdd ? () => setIsCreateDialogOpen(true) : undefined}
              onEdit={canEdit ? handleEditResult : undefined}
              onDelete={canDelete ? handleDeleteResult : undefined}
              onView={handleViewResult}
              searchPlaceholder="Search results..."
              allowAdd={canAdd}
              allowEdit={canEdit}
              allowDelete={canDelete}
            />
          </div>
        </>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Result</DialogTitle>
          </DialogHeader>
          <CreateResultForm
            onSubmit={handleCreateResult}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Result</DialogTitle>
          </DialogHeader>
          <CreateResultForm
            initialData={selectedResult}
            onSubmit={handleUpdateResult}
            onCancel={() => {
              setIsEditDialogOpen(false);
              setSelectedResult(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Results;
