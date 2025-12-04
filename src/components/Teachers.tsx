import React, { useState } from 'react';
import DataTable from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { DataCardView } from '@/components/ui/data-card-view';
import { RefreshCw, Filter, Eye, Edit, Trash2 } from 'lucide-react';
import { useAuth, type UserRole } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { AccessControl } from '@/utils/permissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import CreateTeacherForm from '@/components/forms/CreateTeacherForm';
import { getBaseUrl } from '@/contexts/utils/auth.api';
import TeacherProfile from '@/components/TeacherProfile';
import { enhancedCachedClient } from '@/api/enhancedCachedClient';
import { CACHE_TTL } from '@/config/cacheTTL';

const mockTeachers = [
  {
    id: '1',
    employeeId: 'EMP001',
    name: 'Dr. Alice Johnson',
    email: 'alice.johnson@institute.edu',
    phone: '+1 (555) 111-2222',
    subjects: 'Mathematics, Statistics',
    classes: 'Grade 10-A, Grade 11-S',
    qualification: 'PhD in Mathematics',
    experience: '12 years',
    joinDate: '2020-08-15',
    status: 'Active'
  },
  {
    id: '2',
    employeeId: 'EMP002',
    name: 'Prof. Robert Brown',
    email: 'robert.brown@institute.edu',
    phone: '+1 (555) 222-3333',
    subjects: 'Physics, Chemistry',
    classes: 'Grade 11-S, Grade 12-S',
    qualification: 'MSc in Physics',
    experience: '8 years',
    joinDate: '2022-01-10',
    status: 'Active'
  },
  {
    id: '3',
    employeeId: 'EMP003',
    name: 'Ms. Emily Davis',
    email: 'emily.davis@institute.edu',
    phone: '+1 (555) 333-4444',
    subjects: 'English Literature',
    classes: 'Grade 10-A, Grade 10-B',
    qualification: 'MA in English',
    experience: '6 years',
    joinDate: '2021-09-01',
    status: 'On Leave'
  }
];

const Teachers = () => {
  const { user, selectedInstitute, selectedClass, selectedSubject, currentInstituteId, currentClassId, currentSubjectId } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [teachersData, setTeachersData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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

  const handleLoadData = async (forceRefresh = false) => {
    setIsLoading(true);
    console.log('Loading teachers data...');
    console.log(`Current context - Institute: ${selectedInstitute?.name}, Class: ${selectedClass?.name}, Subject: ${selectedSubject?.name}`);
    
    try {
      const userRole = useInstituteRole();
      
      // For InstituteAdmin, use the new API endpoint to get institute teachers
      if (userRole === 'InstituteAdmin' && currentInstituteId) {
        console.log('Loading institute teachers for InstituteAdmin...');
        
        // Use enhanced cached client with context
        const apiData = await enhancedCachedClient.get(
          `/institute-users/institute/${currentInstituteId}/teachers`,
          {},
          {
            ttl: CACHE_TTL.TEACHERS,
            forceRefresh,
            userId: user?.id,
            instituteId: currentInstituteId,
            role: userRole
          }
        );
        
        console.log('API Response:', apiData);
        
        // Transform the API data to match the expected format
        const transformedData = apiData.map((item: any) => ({
          id: item.userId,
          employeeId: item.userIdByInstitute || `EMP${item.userId}`,
          name: item.user.name,
          email: item.user.email,
          phone: item.user.phoneNumber || 'N/A',
          subjects: 'N/A', // This would need to come from a different endpoint
          classes: 'N/A', // This would need to come from a different endpoint
          qualification: 'N/A', // This would need additional data
          experience: 'N/A', // This would need additional data
          joinDate: new Date(item.user.createdAt).toLocaleDateString() || 'N/A',
          status: item.status,
          imageUrl: item.user.imageUrl
        }));
        
        setTeachersData(transformedData);
        setDataLoaded(true);
        toast({
          title: "Data Loaded",
          description: `Successfully loaded ${transformedData.length} teachers from institute.`
        });
        
        return;
      }
      
      // For other roles, use mock data with filters
      const params = buildQueryParams();
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Filter mock data based on filters
      let filteredData = mockTeachers;
      
      if (searchTerm) {
        filteredData = filteredData.filter(teacher =>
          teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          teacher.subjects.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      if (statusFilter !== 'all') {
        filteredData = filteredData.filter(teacher => teacher.status === statusFilter);
      }
      
      if (subjectFilter !== 'all') {
        filteredData = filteredData.filter(teacher =>
          teacher.subjects.toLowerCase().includes(subjectFilter.toLowerCase())
        );
      }
      
      setTeachersData(filteredData);
      setDataLoaded(true);
      toast({
        title: "Data Loaded",
        description: `Successfully loaded ${filteredData.length} teachers.`
      });
    } catch (error) {
      console.error('Error loading teachers:', error);
      toast({
        title: "Load Failed",
        description: "Failed to load teachers data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const teachersColumns = [
    { key: 'employeeId', header: 'Employee ID' },
    { key: 'name', header: 'Full Name' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'subjects', header: 'Subjects' },
    { key: 'classes', header: 'Classes' },
    { key: 'qualification', header: 'Qualification' },
    { key: 'experience', header: 'Experience' },
    { key: 'joinDate', header: 'Join Date' },
    { 
      key: 'status', 
      header: 'Status',
      render: (value: any) => (
        <Badge variant={
          value === 'Active' || value === 'ACTIVE' ? 'default' : 
          value === 'On Leave' ? 'secondary' : 
          'destructive'
        }>
          {value}
        </Badge>
      )
    }
  ];

  const handleAddTeacher = () => {
    console.log('Add new teacher');
  };

  const handleEditTeacher = (teacher: any) => {
    console.log('Edit teacher:', teacher);
    setSelectedTeacher(teacher);
    setIsEditDialogOpen(true);
  };

  const handleUpdateTeacher = (teacherData: any) => {
    console.log('Updating teacher:', teacherData);
    
    // In real scenario, would include context in request body:
    // const requestBody = buildRequestBody(teacherData);
    
    toast({
      title: "Teacher Updated",
      description: `Teacher ${teacherData.name} has been updated successfully.`
    });
    setIsEditDialogOpen(false);
    setSelectedTeacher(null);
  };

  const handleDeleteTeacher = (teacher: any) => {
    console.log('Delete teacher:', teacher);
    toast({
      title: "Teacher Deleted",
      description: `Teacher ${teacher.name} has been deleted.`,
      variant: "destructive"
    });
  };

  const handleViewTeacher = (teacher: any) => {
    console.log('View teacher details:', teacher);
    toast({
      title: "View Teacher",
      description: `Viewing teacher: ${teacher.name}`
    });
  };

  const handleCreateTeacher = (teacherData: any) => {
    console.log('Creating teacher:', teacherData);
    
    // In real scenario, would include context in request body:
    // const requestBody = buildRequestBody(teacherData);
    
    toast({
      title: "Teacher Created",
      description: `Teacher ${teacherData.name} has been created successfully.`
    });
    setIsCreateDialogOpen(false);
  };

  const userRole = useInstituteRole();
  const canAdd = AccessControl.hasPermission(userRole, 'create-teacher');
  const canEdit = AccessControl.hasPermission(userRole, 'edit-teacher');
  const canDelete = AccessControl.hasPermission(userRole, 'delete-teacher');

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
    
    let title = 'Teachers Management';
    if (contexts.length > 0) {
      title += ` (${contexts.join(' → ')})`;
    }
    
    return title;
  };

  const customActions = [
    {
      label: 'View',
      action: (teacher: any) => handleViewTeacher(teacher),
      icon: <Eye className="h-3 w-3" />,
      variant: 'outline' as const
    },
    ...(canEdit ? [{
      label: 'Edit',
      action: (teacher: any) => handleEditTeacher(teacher),
      icon: <Edit className="h-3 w-3" />,
      variant: 'outline' as const
    }] : []),
    ...(canDelete ? [{
      label: 'Delete',
      action: (teacher: any) => handleDeleteTeacher(teacher),
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
            Click the button below to load teachers data
          </p>
          <Button 
            onClick={() => handleLoadData(false)} 
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
              Manage teaching staff, assignments, and professional information
            </p>
          </div>

          {/* Show Teacher Profile when institute, class, and subject are selected */}
          {currentInstituteId && currentClassId && currentSubjectId && (
            <div className="mb-6">
              <TeacherProfile 
                instituteId={currentInstituteId}
                classId={currentClassId}
                subjectId={currentSubjectId}
              />
            </div>
          )}

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
              onClick={() => handleLoadData(true)} 
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
                  Search Teachers
                </label>
                <Input
                  placeholder="Search teachers..."
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
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="On Leave">On Leave</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Subject
                </label>
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                    <SelectItem value="Physics">Physics</SelectItem>
                    <SelectItem value="Chemistry">Chemistry</SelectItem>
                    <SelectItem value="English">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Mobile View Content - Always Card View */}
          <div className="md:hidden">
            <DataCardView
              data={teachersData}
              columns={teachersColumns}
              customActions={customActions}
              allowEdit={false}
              allowDelete={false}
            />
          </div>

          {/* Desktop View */}
          <div className="hidden md:block">
            <DataTable
              title="Teachers"
              data={teachersData}
              columns={teachersColumns}
              onAdd={canAdd ? () => setIsCreateDialogOpen(true) : undefined}
              onEdit={canEdit ? handleEditTeacher : undefined}
              onDelete={canDelete ? handleDeleteTeacher : undefined}
              onView={handleViewTeacher}
              searchPlaceholder="Search teachers..."
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
            <DialogTitle>Create New Teacher</DialogTitle>
          </DialogHeader>
          <CreateTeacherForm
            onSubmit={handleCreateTeacher}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Teacher</DialogTitle>
          </DialogHeader>
          <CreateTeacherForm
            initialData={selectedTeacher}
            onSubmit={handleUpdateTeacher}
            onCancel={() => {
              setIsEditDialogOpen(false);
              setSelectedTeacher(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Teachers;
