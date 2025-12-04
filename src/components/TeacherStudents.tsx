import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RefreshCw, Users, Mail, Phone, Search, Filter, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { useToast } from '@/hooks/use-toast';
import { DataCardView } from '@/components/ui/data-card-view';
import DataTable from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import AssignStudentsDialog from '@/components/forms/AssignStudentsDialog';
import ImagePreviewModal from '@/components/ImagePreviewModal';
import { enhancedCachedClient } from '@/api/enhancedCachedClient';
import { CACHE_TTL } from '@/config/cacheTTL';
import { getImageUrl } from '@/utils/imageUrlHelper';

interface ClassSubjectStudent {
  id: string;
  name: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  phoneNumber?: string;
  imageUrl?: string;
  dateOfBirth?: string;
  userIdByInstitute?: string | null;
  fatherId?: string;
  motherId?: string;
  guardianId?: string;
}

interface ClassSubjectStudentsResponse {
  data: ClassSubjectStudent[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const TeacherStudents = () => {
  const { user, selectedInstitute, selectedClass, selectedSubject } = useAuth();
  const effectiveRole = useInstituteRole();
  const { toast } = useToast();
  
  const [students, setStudents] = useState<ClassSubjectStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [imagePreview, setImagePreview] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: ''
  });

  // Role check - only InstituteAdmin and Teacher can access this component
  if (!effectiveRole || !['InstituteAdmin', 'Teacher'].includes(effectiveRole)) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">
          Access denied. This section is only available for teachers and institute admins.
        </p>
      </div>
    );
  }

  const fetchClassStudents = async (forceRefresh = false) => {
    if (!selectedInstitute?.id || !selectedClass?.id) {
      return;
    }

    setLoading(true);
    try {
      const data: ClassSubjectStudentsResponse = await enhancedCachedClient.get(
        `/institute-users/institute/${selectedInstitute.id}/users/STUDENT/class/${selectedClass.id}`,
        {},
        {
          ttl: CACHE_TTL.STUDENTS,
          forceRefresh,
          userId: user?.id,
          role: effectiveRole,
          instituteId: selectedInstitute.id,
          classId: selectedClass.id
        }
      );
      
      setStudents(data.data);
      setDataLoaded(true);
      
      toast({
        title: "Class Students Loaded",
        description: `Successfully loaded ${data.data.length} students.`
      });
    } catch (error) {
      console.error('Error fetching class students:', error);
      toast({
        title: "Error",
        description: "Failed to load class students",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjectStudents = async (forceRefresh = false) => {
    if (!selectedInstitute?.id || !selectedClass?.id || !selectedSubject?.id) {
      return;
    }

    setLoading(true);
    try {
      const data: ClassSubjectStudentsResponse = await enhancedCachedClient.get(
        `/institute-users/institute/${selectedInstitute.id}/users/STUDENT/class/${selectedClass.id}/subject/${selectedSubject.id}`,
        {},
        {
          ttl: CACHE_TTL.STUDENTS,
          forceRefresh,
          userId: user?.id,
          role: effectiveRole,
          instituteId: selectedInstitute.id,
          classId: selectedClass.id,
          subjectId: selectedSubject.id
        }
      );
      
      setStudents(data.data);
      setDataLoaded(true);
      
      toast({
        title: "Subject Students Loaded",
        description: `Successfully loaded ${data.data.length} students.`
      });
    } catch (error) {
      console.error('Error fetching subject students:', error);
      toast({
        title: "Error",
        description: "Failed to load subject students",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-load data when context changes (uses cache if available)
  useEffect(() => {
    if (selectedInstitute && selectedClass) {
      if (selectedSubject) {
        // Load subject students automatically from cache
        fetchSubjectStudents(false);
      } else {
        // Load class students automatically from cache
        fetchClassStudents(false);
      }
    }
  }, [selectedInstitute?.id, selectedClass?.id, selectedSubject?.id]);

  const studentColumns = [
    {
      key: 'student',
      header: 'Student',
      render: (value: any, row: ClassSubjectStudent) => (
        <div className="flex items-center space-x-3">
          <div 
            className="cursor-pointer flex-shrink-0"
            onClick={() => {
              if (row.imageUrl) {
                setImagePreview({ 
                  isOpen: true, 
                  url: row.imageUrl, 
                  title: row.name 
                });
              }
            }}
          >
            <Avatar className="h-8 w-8 sm:h-10 sm:w-10 hover:opacity-80 transition-opacity">
              <AvatarImage src={getImageUrl(row.imageUrl || '')} alt={row.name} />
              <AvatarFallback className="text-xs">
                {row.name.split(' ').map(n => n.charAt(0)).join('')}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{row.name}</p>
            <p className="text-sm text-muted-foreground truncate">ID: {row.userIdByInstitute || row.id}</p>
          </div>
        </div>
      )
    },
    {
      key: 'contact',
      header: 'Contact Information',
      render: (value: any, row: ClassSubjectStudent) => (
        <div className="space-y-1">
          <div className="flex items-center text-sm">
            <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">{row.email || 'N/A'}</span>
          </div>
          <div className="flex items-center text-sm">
            <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">{row.phoneNumber || 'N/A'}</span>
          </div>
        </div>
      )
    },
    {
      key: 'address',
      header: 'Address',
      render: (value: any, row: ClassSubjectStudent) => (
        <div className="space-y-1 text-sm">
          <p className="truncate">{row.addressLine1 || 'N/A'}</p>
          {row.addressLine2 && (
            <p className="text-muted-foreground truncate">{row.addressLine2}</p>
          )}
        </div>
      )
    },
    {
      key: 'dateOfBirth',
      header: 'Date of Birth',
      render: (value: any, row: ClassSubjectStudent) => (
        <div className="text-sm">
          {row.dateOfBirth 
            ? new Date(row.dateOfBirth).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })
            : 'N/A'
          }
        </div>
      )
    },
    {
      key: 'guardians',
      header: 'Parent/Guardian',
      render: (value: any, row: ClassSubjectStudent) => (
        <div className="space-y-1">
          {row.fatherId && (
            <Badge variant="outline" className="text-xs">
              Father: {row.fatherId}
            </Badge>
          )}
          {row.motherId && (
            <Badge variant="outline" className="text-xs">
              Mother: {row.motherId}
            </Badge>
          )}
          {row.guardianId && (
            <Badge variant="outline" className="text-xs">
              Guardian: {row.guardianId}
            </Badge>
          )}
          {!row.fatherId && !row.motherId && !row.guardianId && (
            <span className="text-sm text-muted-foreground">N/A</span>
          )}
        </div>
      )
    }
  ];

  const filteredStudents = students.filter(student => {
    const name = student.name.toLowerCase();
    const email = (student.email || '').toLowerCase();
    const matchesSearch = !searchTerm || name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getTitle = () => {
    if (selectedSubject) {
      return `Students - ${selectedSubject.name}`;
    }
    if (selectedClass) {
      return `Students`;
    }
    return 'Students';
  };

  const getCurrentSelection = () => {
    const parts = [];
    if (selectedInstitute) parts.push(`Institute: ${selectedInstitute.name}`);
    if (selectedClass) parts.push(`Class: ${selectedClass.name}`);
    if (selectedSubject) parts.push(`Subject: ${selectedSubject.name}`);
    return parts.join(' → ');
  };

  const getLoadFunction = () => {
    return selectedSubject 
      ? () => fetchSubjectStudents(true)  // Force refresh from backend
      : () => fetchClassStudents(true);   // Force refresh from backend
  };

  const getLoadButtonText = () => {
    if (selectedSubject) {
      return loading ? 'Loading Subject Students...' : 'Load My Subject Students';
    }
    return loading ? 'Loading Class Students...' : 'Load My Class Students';
  };

  if (!selectedInstitute || !selectedClass) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center py-12">
          <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-4">
            Select Class
          </h2>
          <p className="text-muted-foreground">
            Please select an institute and class to view your students.
          </p>
        </div>
      </div>
    );
  }

  if (!dataLoaded) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center py-12">
          <Users className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold mb-4">
            {getTitle()}
          </h2>
          <p className="text-muted-foreground mb-2">
            Current Selection: {getCurrentSelection()}
          </p>
          <p className="text-muted-foreground mb-6">
            Click the button below to load your students
          </p>
          <Button 
            onClick={getLoadFunction()} 
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {getLoadButtonText()}
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                {getLoadButtonText()}
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {getTitle()}
          </h1>
          <p className="text-muted-foreground mt-1">
            Current Selection: {getCurrentSelection()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {students.length} Students
          </Badge>
          <Button
            onClick={() => setShowAssignDialog(true)}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Assign Students
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button 
            onClick={getLoadFunction()} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filter Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Students Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm 
                ? 'No students match your current filters.' 
                : 'No students are enrolled in this selection.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <DataTable
              title=""
              data={filteredStudents}
              columns={studentColumns}
              searchPlaceholder="Search students..."
              allowAdd={false}
              allowEdit={false}
              allowDelete={false}
            />
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden">
            <DataCardView
              data={filteredStudents}
              columns={studentColumns}
              allowEdit={false}
              allowDelete={false}
            />
          </div>
        </>
      )}

      {/* Assign Students Dialog */}
      <AssignStudentsDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        onAssignmentComplete={() => {
          getLoadFunction()(); // Refresh the list
        }}
      />

      <ImagePreviewModal
        isOpen={imagePreview.isOpen}
        onClose={() => setImagePreview({ isOpen: false, url: '', title: '' })}
        imageUrl={imagePreview.url}
        title={imagePreview.title}
      />
    </div>
  );
};

export default TeacherStudents;
