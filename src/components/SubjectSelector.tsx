import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataCardView } from '@/components/ui/data-card-view';
import { useAuth, type UserRole } from '@/contexts/AuthContext';
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
    currentClassId
  } = useAuth();
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
  return <div className="space-y-4 sm:space-y-6 p-3 sm:p-0">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-16">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Select Subject
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Choose a subject to manage lectures and attendance
          </p>
          {selectedInstitute && <p className="text-xs sm:text-sm text-blue-600 mt-2">
              Institute: {selectedInstitute.name}
            </p>}
          {selectedClass && <p className="text-xs sm:text-sm text-green-600 mt-1">
              Class: {selectedClass.name}
            </p>}
        </div>
        <Button onClick={() => fetchSubjectsByRole(currentPage, pageSize, true)} disabled={isLoading} variant="outline" size="sm" className="w-full sm:w-auto">
          {isLoading ? <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              <span className="hidden sm:inline">Loading...</span>
            </> : <>
              <RefreshCw className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </>}
        </Button>
      </div>

      {subjectsData.length === 0 && !isLoading ? <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            No subjects found for this class
          </p>
        </div> : <div className="max-h-[600px] overflow-y-auto">
          <div className={`grid grid-cols-1 md:grid-cols-2 ${sidebarCollapsed ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4 md:gap-6 p-2 md:p-4 mb-16`}>
            {subjectsData.map(subject => {
              const showMore = expandedSubjectId === subject.id;
              
              return (
                <div 
                  key={subject.id} 
                  className="relative flex w-full flex-col rounded-xl bg-white dark:bg-gray-800 bg-clip-border text-gray-700 dark:text-gray-300 shadow-md transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
                >
                  {/* Subject Image - Gradient Header with -mt-6 offset */}
                  <div className="relative mx-4 -mt-6 h-40 overflow-hidden rounded-xl bg-clip-border text-white shadow-lg shadow-blue-gray-500/40 bg-gradient-to-r from-blue-500 to-blue-600">
                    {subject.imgUrl ? (
                      <img 
                        src={getImageUrl(subject.imgUrl)} 
                        alt={subject.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-blue-500 to-blue-600">
                        <BookOpen className="w-16 h-16 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    {/* Subject Name */}
                    <h5 className="mb-2 block font-sans text-xl font-semibold leading-snug tracking-normal text-blue-gray-900 dark:text-white antialiased">
                      {subject.name}
                    </h5>

                    {/* Subject Code and Category */}
                    <div className="flex items-center justify-start gap-2 mb-4">
                      <Badge variant={subject.category === 'Core' ? 'default' : 'secondary'} className="text-xs">
                        {subject.category}
                      </Badge>
                    </div>

                    {/* Additional Info - Shown when Read More is clicked */}
                    {showMore && (
                      <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-300 space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-semibold">Code:</span> {subject.code}
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-semibold">Description:</span> {subject.description || 'No description available'}
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-semibold">Credits:</span>
                          <span>{subject.creditHours}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-semibold">Type:</span>
                          <span>{subject.subjectType}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-semibold">Basket:</span>
                          <span>{subject.basketCategory}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-semibold">Status:</span>
                          <Badge variant={subject.isActive ? 'default' : 'secondary'} className="text-xs">
                            {subject.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="p-6 pt-0 space-y-2">
                    <button
                      onClick={() => setExpandedSubjectId(showMore ? null : subject.id)}
                      className="select-none rounded-lg bg-gray-100 dark:bg-gray-700 py-3 px-6 w-full text-center align-middle font-sans text-xs font-bold uppercase text-gray-900 dark:text-white shadow-md transition-all hover:shadow-lg focus:opacity-[0.85] focus:shadow-none active:opacity-[0.85] active:shadow-none"
                    >
                      {showMore ? 'Hide Details' : 'Read More'}
                    </button>
                    
                    <button 
                      onClick={() => handleSelectSubject(subject)}
                      className="select-none rounded-lg bg-blue-500 py-3 px-6 w-full text-center align-middle font-sans text-xs font-bold uppercase text-white shadow-md shadow-blue-500/20 transition-all hover:shadow-lg hover:shadow-blue-500/40 focus:opacity-[0.85] focus:shadow-none active:opacity-[0.85] active:shadow-none"
                    >
                      Select Subject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination - Always show when data is loaded */}
          {dataLoaded && totalPages > 0 && (
            <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 mt-6 pb-4 px-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)} 
                disabled={currentPage <= 1 || isLoading}
                className="w-full sm:w-auto"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages} ({totalItems} total)
              </span>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)} 
                disabled={currentPage >= totalPages || isLoading}
                className="w-full sm:w-auto"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              
              <select 
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-background text-foreground w-full sm:w-auto"
                disabled={isLoading}
              >
                <option value={10}>10 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
          )}
        </div>}
    </div>;
};
export default SubjectSelector;