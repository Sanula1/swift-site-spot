import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataCardView } from '@/components/ui/data-card-view';
import { useAuth, type UserRole } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getImageUrl } from '@/utils/imageUrlHelper';
import { BookOpen, Clock, CheckCircle, RefreshCw, User, School, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getBaseUrl } from '@/contexts/utils/auth.api';
import { instituteApi } from '@/api/institute.api';
import { useApiRequest } from '@/hooks/useApiRequest';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { enhancedCachedClient } from '@/api/enhancedCachedClient';
import { CACHE_TTL } from '@/config/cacheTTL';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import ChildCurrentSelection from '@/components/ChildCurrentSelection';
interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  category?: string;
  creditHours?: number;
  isActive?: boolean;
  subjectType?: string;
  basketCategory?: string;
  instituteType?: string;
  imgUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}
interface StudentSubjectData {
  instituteId: string;
  classId: string;
  subjectId: string;
  subject: Subject;
}
interface ClassSubjectData {
  instituteId: string;
  classId: string;
  subjectId: string;
  teacherId?: string;
  subject: Subject;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
interface SubjectCardData {
  id: string;
  name: string;
  code: string;
  description: string;
  category: string;
  creditHours: number;
  isActive: boolean;
  subjectType: string;
  basketCategory: string;
  instituteType: string;
  imgUrl?: string;
  createdAt: string;
  updatedAt: string;
}
const SubjectSelector = () => {
  const {
    user,
    selectedInstitute,
    selectedClass,
    setSelectedSubject,
    currentInstituteId,
    currentClassId,
    isViewingAsParent,
    selectedChild
  } = useAuth();
  const navigate = useNavigate();
  const instituteRole = useInstituteRole();
  const { navigateToPage } = useAppNavigation();
  const {
    toast
  } = useToast();
  const [subjectsData, setSubjectsData] = useState<SubjectCardData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Sidebar collapse awareness for grid columns
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    typeof document !== 'undefined' && document.documentElement.classList.contains('sidebar-collapsed')
  );
  useEffect(() => {
    const handler = () => setSidebarCollapsed(document.documentElement.classList.contains('sidebar-collapsed'));
    window.addEventListener('sidebar:state', handler as any);
    return () => window.removeEventListener('sidebar:state', handler as any);
  }, []);
  const getAuthToken = () => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('authToken');
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
  const fetchSubjectsByRole = async (page: number = 1, limit: number = 10, forceRefresh = false) => {
    setIsLoading(true);
    console.log('Loading subjects data for teacher');
    try {
      let endpoint: string;
      const params = { page: page.toString(), limit: limit.toString() };

      // Determine endpoint based on role
      if (instituteRole === 'InstituteAdmin' || instituteRole === 'AttendanceMarker') {
        if (!currentInstituteId || !currentClassId) {
          throw new Error('Missing required parameters for institute admin/attendance marker subject fetch');
        }
        endpoint = `/institutes/${currentInstituteId}/classes/${currentClassId}/subjects`;
      } else if (instituteRole === 'Teacher') {
        if (!currentInstituteId || !currentClassId || !user.id) {
          throw new Error('Missing required parameters for teacher subject fetch');
        }
        endpoint = `/institutes/${currentInstituteId}/classes/${currentClassId}/subjects/teacher/${user.id}`;
      } else if (instituteRole === 'Student') {
        if (!currentInstituteId || !currentClassId || !user.id) {
          throw new Error('Missing required parameters for student subject fetch');
        }
        endpoint = `/institute-class-subject-students/${currentInstituteId}/student-subjects/class/${currentClassId}/student/${user.id}`;
      } else {
        // For other roles, use the original subjects endpoint
        endpoint = '/subjects';
      }

      console.log('Fetching from endpoint:', endpoint);
      
      // Use enhanced cached client
      const result = await enhancedCachedClient.get(
        endpoint,
        params,
        {
          ttl: CACHE_TTL.SUBJECTS,
          forceRefresh,
          userId: user?.id,
          role: instituteRole,
          instituteId: currentInstituteId,
          classId: currentClassId
        }
      );

      console.log('Raw API response:', result);
      let subjects: SubjectCardData[] = [];
      if (instituteRole === 'InstituteAdmin' || instituteRole === 'Teacher' || instituteRole === 'AttendanceMarker') {
        // Handle the new API response format for Institute Admin and Teacher
        if (Array.isArray(result)) {
          // Direct array response
          subjects = result.map((item: any) => ({
            id: item.subject.id,
            name: item.subject.name,
            code: item.subject.code,
            description: item.subject.description || '',
            category: item.subject.category || '',
            creditHours: item.subject.creditHours || 0,
            isActive: item.subject.isActive,
            subjectType: item.subject.subjectType || '',
            basketCategory: item.subject.basketCategory || '',
            instituteType: item.subject.instituteType || '',
            imgUrl: item.subject.imgUrl,
            createdAt: item.subject.createdAt,
            updatedAt: item.subject.updatedAt
          }));
        } else if (result.data && Array.isArray(result.data)) {
          subjects = result.data.map((item: any) => ({
            id: item.subject.id,
            name: item.subject.name,
            code: item.subject.code,
            description: item.subject.description || '',
            category: item.subject.category || '',
            creditHours: item.subject.creditHours || 0,
            isActive: item.subject.isActive,
            subjectType: item.subject.subjectType || '',
            basketCategory: item.subject.basketCategory || '',
            instituteType: item.subject.instituteType || '',
            imgUrl: item.subject.imgUrl,
            createdAt: item.subject.createdAt,
            updatedAt: item.subject.updatedAt
          }));
        }

        // Deduplicate and ensure stable ordering
        const uniqueSubjects = Array.from(new Map(subjects.map((s) => [s.id, s])).values());
        uniqueSubjects.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        // Use server pagination if provided, otherwise slice client-side
        const hasServerPagination = Boolean(result && (result.total || result.totalPages || result.page || result.limit));
        let totalSubjects = uniqueSubjects.length;
        let totalPagesFromApi = Math.max(1, Math.ceil(totalSubjects / limit));
        let displaySubjects = uniqueSubjects;

        if (hasServerPagination && result.data && Array.isArray(result.data)) {
          totalSubjects = result.total || uniqueSubjects.length;
          totalPagesFromApi = result.totalPages || Math.max(1, Math.ceil(totalSubjects / limit));
          // displaySubjects already corresponds to current page from server
          displaySubjects = uniqueSubjects;
        } else {
          const startIndex = (Math.max(1, page) - 1) * limit;
          const endIndex = startIndex + limit;
          displaySubjects = uniqueSubjects.slice(startIndex, endIndex);
        }

        setSubjectsData(displaySubjects);
        setTotalItems(totalSubjects);
        setTotalPages(totalPagesFromApi);
        setCurrentPage(result.page || page);
      } else if (instituteRole === 'Student') {
        // Handle the new API response format for students
        if (result.data && Array.isArray(result.data)) {
          subjects = result.data.map((item: any) => ({
            id: item.subject.id,
            name: item.subject.name,
            code: item.subject.code,
            description: item.subject.description || '',
            category: item.subject.category || '',
            creditHours: item.subject.creditHours || 0,
            isActive: item.subject.isActive,
            subjectType: item.subject.subjectType || '',
            basketCategory: item.subject.basketCategory || '',
            instituteType: item.subject.instituteType || '',
            imgUrl: item.subject.imgUrl,
            createdAt: item.subject.createdAt,
            updatedAt: item.subject.updatedAt
          }));
        }

        // For students, use the pagination data from the API response
        const totalSubjects = result.total || 0;
        const totalPages = Math.ceil(totalSubjects / limit);
        setSubjectsData(subjects);
        setTotalItems(totalSubjects);
        setTotalPages(totalPages);
        setCurrentPage(page);
      } else {
        // Handle the original response for other roles
        if (Array.isArray(result)) {
          subjects = result;
        } else if (result.data && Array.isArray(result.data)) {
          subjects = result.data;
        }

        // Apply pagination for other roles
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedSubjects = subjects.slice(startIndex, endIndex);
        const totalSubjects = subjects.length;
        const totalPages = Math.ceil(totalSubjects / limit);
        setSubjectsData(paginatedSubjects);
        setTotalItems(totalSubjects);
        setTotalPages(totalPages);
        setCurrentPage(page);
      }
      setDataLoaded(true);
      toast({
        title: "Subjects Loaded",
        description: `Successfully loaded ${subjects.length} subjects.`
      });
    } catch (error) {
      console.error('Failed to load subjects:', error);
      toast({
        title: "Load Failed",
        description: error instanceof Error ? error.message : "Failed to load subjects data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-load subjects when class changes (uses cache if available)
  useEffect(() => {
    if (currentInstituteId && selectedClass?.id && !dataLoaded) {
      console.log('Auto-loading subjects from cache for class:', selectedClass.id);
      fetchSubjectsByRole(1, pageSize);
    }
  }, [currentInstituteId, selectedClass?.id]);

  const handleSelectSubject = (subject: SubjectCardData) => {
    console.log('Selecting subject:', subject);
    setSelectedSubject({
      id: subject.id,
      name: subject.name,
      code: subject.code,
      description: subject.description,
      category: subject.category,
      creditHours: subject.creditHours,
      isActive: subject.isActive,
      subjectType: subject.subjectType,
      basketCategory: subject.basketCategory,
      instituteType: subject.instituteType,
      imgUrl: subject.imgUrl
    });
    
    toast({
      title: "Subject Selected",
      description: `Selected ${subject.name} (${subject.code})`
    });
    
    // When parent is viewing child's data, navigate to child's dashboard
    if (isViewingAsParent && selectedChild) {
      console.log('Parent viewing child - navigating to child dashboard');
      navigate(`/child/${selectedChild.id}/dashboard`);
      return;
    }
    
    // Auto-navigate to dashboard after selection
    navigateToPage('dashboard');
  };
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      console.log('Changing page from', currentPage, 'to', newPage);
      fetchSubjectsByRole(newPage, pageSize);
    }
  };
  const handlePageSizeChange = (newPageSize: number) => {
    console.log('Changing page size from', pageSize, 'to', newPageSize);
    setPageSize(newPageSize);
    fetchSubjectsByRole(1, newPageSize);
  };
  if (!user) {
    return <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Please log in to view subjects.</p>
      </div>;
  }
  if (!currentInstituteId) {
    return <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Please select an institute first.</p>
      </div>;
  }
  if ((['Student','InstituteAdmin','Teacher','AttendanceMarker'].includes(instituteRole)) && !currentClassId) {
    return <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Please select a class first.</p>
      </div>;
  }
  const isTuitionInstitute = selectedInstitute?.type === 'tuition_institute';
  const subjectLabel = isTuitionInstitute ? 'Sub Class' : 'Subject';
  const subjectLabelPlural = isTuitionInstitute ? 'Sub Classes' : 'Subject';

  return <div className="space-y-2 sm:space-y-4 p-1 sm:p-2 md:p-0">
      {/* Show Current Child Selection for Parent flow */}
      {isViewingAsParent && <ChildCurrentSelection className="mb-3" />}
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1.5 sm:gap-2 mb-2 sm:mb-4">
        <div className="flex-1">
          <h1 className="text-sm sm:text-base md:text-lg font-semibold text-foreground mb-0.5">
            Select {subjectLabelPlural}
          </h1>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Choose a {subjectLabel.toLowerCase()} to manage lectures and attendance
          </p>
          {selectedInstitute && <p className="text-[9px] sm:text-[10px] text-primary mt-0.5">
              Institute: {selectedInstitute.name}
            </p>}
          {selectedClass && <p className="text-[9px] sm:text-[10px] text-green-600 dark:text-green-400 mt-0.5">
              Class: {selectedClass.name}
            </p>}
        </div>
        <Button onClick={() => fetchSubjectsByRole(currentPage, pageSize, true)} disabled={isLoading} variant="outline" size="sm" className="w-full sm:w-auto h-6 sm:h-7 text-[10px] sm:text-xs px-2">
          {isLoading ? <>
              <RefreshCw className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1 animate-spin" />
              <span className="hidden sm:inline">Loading...</span>
            </> : <>
              <RefreshCw className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
              <span className="hidden sm:inline">Refresh</span>
            </>}
        </Button>
      </div>

      {subjectsData.length === 0 && !isLoading ? <div className="text-center py-10">
          <p className="text-muted-foreground">
            No subjects found for this class
          </p>
        </div> : <div>
          {/* Unified Card View - Same size on all devices */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${sidebarCollapsed ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-x-3 gap-y-8 sm:gap-x-4 sm:gap-y-10 pt-3 md:pt-6 mb-8`}>
            {subjectsData.map(subject => {
              const showMore = expandedSubjectId === subject.id;
              
              return (
                <div 
                  key={subject.id} 
                  className="relative flex w-full flex-col rounded-lg bg-card bg-clip-border text-card-foreground shadow-sm hover:shadow-md transition-all duration-300"
                >
                  {/* Subject Image - Gradient Header */}
                  <div className="relative mx-3 -mt-5 h-28 overflow-hidden rounded-lg bg-clip-border text-white shadow-md shadow-primary/30 bg-gradient-to-r from-primary to-primary/80">
                    {subject.imgUrl ? (
                      <img 
                        src={getImageUrl(subject.imgUrl)} 
                        alt={subject.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-primary to-primary/80">
                        <BookOpen className="w-8 h-8 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    {/* Subject Name */}
                    <h5 className="mb-1.5 block font-sans text-sm font-semibold leading-snug tracking-normal text-foreground antialiased line-clamp-2">
                      {subject.name}
                    </h5>

                    {/* Subject Code and Category */}
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      <Badge variant={subject.category === 'Core' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                        {subject.category}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {subject.code}
                      </Badge>
                    </div>

                    {/* Description */}
                    <p className="block font-sans text-xs font-light leading-relaxed text-muted-foreground antialiased line-clamp-2">
                      {subject.description || 'No description available'}
                    </p>

                    {/* Additional Info - Shown when Read More is clicked */}
                    {showMore && (
                      <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300 space-y-1.5 border-t border-border pt-2">
                        {subject.creditHours > 0 && (
                          <div className="text-xs">
                            <span className="font-semibold text-foreground">Credits:</span>
                            <span className="text-muted-foreground ml-1.5">{subject.creditHours}</span>
                          </div>
                        )}
                        {subject.subjectType && (
                          <div className="text-xs">
                            <span className="font-semibold text-foreground">Type:</span>
                            <span className="text-muted-foreground ml-1.5">{subject.subjectType}</span>
                          </div>
                        )}
                        {subject.basketCategory && (
                          <div className="text-xs">
                            <span className="font-semibold text-foreground">Basket:</span>
                            <span className="text-muted-foreground ml-1.5">{subject.basketCategory}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="p-4 pt-0 space-y-2">
                    <button
                      onClick={() => setExpandedSubjectId(showMore ? null : subject.id)}
                      className="w-full select-none rounded-md bg-muted py-2 px-4 text-center align-middle font-sans text-[10px] font-semibold uppercase text-foreground shadow-sm transition-all hover:shadow active:opacity-90"
                    >
                      {showMore ? 'Show Less' : 'Read More'}
                    </button>
                    
                    <button 
                      onClick={() => handleSelectSubject(subject)}
                      className="w-full select-none rounded-md bg-primary py-2 px-4 text-center align-middle font-sans text-[10px] font-semibold uppercase text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:shadow-md hover:shadow-primary/30 active:opacity-90"
                    >
                      Select {subjectLabel}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {dataLoaded && totalPages > 0 && (
            <div className="flex flex-col items-center gap-4 mt-6 pb-6 px-4">
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => handlePageChange(currentPage - 1)} 
                  disabled={currentPage <= 1 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Prev
                </Button>
                
                <span className="text-sm text-muted-foreground font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                
                <Button 
                  variant="outline" 
                  onClick={() => handlePageChange(currentPage + 1)} 
                  disabled={currentPage >= totalPages || isLoading}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              
              <span className="text-sm text-muted-foreground">
                {totalItems} {subjectLabelPlural.toLowerCase()} total
              </span>
            </div>
          )}
        </div>}
    </div>;
};
export default SubjectSelector;