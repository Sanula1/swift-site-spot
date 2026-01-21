import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useRef } from 'react';
import { cachedApiClient } from '@/api/cachedClient';
import { toast } from 'sonner';

/**
 * Hook to sync URL params with AuthContext
 * Loads institute/class/subject data based on URL and validates access
 * 
 * CRITICAL FIX: Now fetches institute data from API when navigating directly via URL
 */
export const useRouteContext = () => {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [isValidating, setIsValidating] = useState(true);
  const fetchInProgressRef = useRef<{ [key: string]: boolean }>({});
  
  const { 
    selectedInstitute,
    selectedClass,
    selectedSubject,
    selectedChild,
    selectedOrganization,
    selectedTransport,
    setSelectedInstitute,
    setSelectedClass,
    setSelectedSubject,
    user,
    loadUserInstitutes
  } = useAuth();

  useEffect(() => {
    if (!user) {
      setIsValidating(false);
      return;
    }

    const syncContextFromUrl = async () => {
      // Sync URL params to context
      const urlInstituteId = params.instituteId;
      const urlClassId = params.classId;
      const urlSubjectId = params.subjectId;

      // ✅ Parents page is class-scoped only: if URL includes subject, strip it.
      if (location.pathname.includes('/parents') && urlSubjectId) {
        const newPath = location.pathname.replace(`/subject/${urlSubjectId}`, '');
        if (newPath !== location.pathname) {
          navigate(newPath + location.search, { replace: true });
          return;
        }
      }

      // STEP 1: Institute selection from URL
      if (urlInstituteId && (!selectedInstitute || selectedInstitute.id?.toString() !== urlInstituteId)) {
        // Prevent duplicate fetch for same institute
        const fetchKey = `institute_${urlInstituteId}`;
        if (fetchInProgressRef.current[fetchKey]) {
          return;
        }

        // First, try to find in user's existing institutes array
        let instituteFound = false;
        if (user?.institutes?.length > 0) {
          const institute = user.institutes.find(inst => inst.id?.toString() === urlInstituteId);
          if (institute) {
            console.log('🏢 Found institute in user.institutes:', institute.name);
            setSelectedInstitute(institute);
            instituteFound = true;
            if (!urlClassId) setSelectedClass(null);
            if (!urlSubjectId) setSelectedSubject(null);
          }
        }

        // If not found in user.institutes, fetch from API
        if (!instituteFound) {
          fetchInProgressRef.current[fetchKey] = true;
          console.log('🔍 Institute not in user.institutes, fetching from API...', urlInstituteId);
          
          try {
            // First, ensure user institutes are loaded (they might not be loaded yet)
            const institutes = await loadUserInstitutes();
            
            // Now try to find the institute again
            const institute = institutes?.find(inst => inst.id?.toString() === urlInstituteId);
            
            if (institute) {
              console.log('✅ Institute loaded from API:', institute.name);
              setSelectedInstitute(institute);
              if (!urlClassId) setSelectedClass(null);
              if (!urlSubjectId) setSelectedSubject(null);
            } else {
              // Institute not found - user doesn't have access
              console.warn('⚠️ User does not have access to institute:', urlInstituteId);
              toast.error('You do not have access to this institute');
              navigate('/select-institute', { replace: true });
              fetchInProgressRef.current[fetchKey] = false;
              return;
            }
          } catch (error) {
            console.error('❌ Error loading institute:', error);
            toast.error('Failed to load institute data');
            navigate('/select-institute', { replace: true });
          } finally {
            fetchInProgressRef.current[fetchKey] = false;
          }
        }
      }

      // STEP 2: ASYNC class selection (non-blocking background load)
      if (urlClassId && urlInstituteId && (!selectedClass || selectedClass.id?.toString() !== urlClassId)) {
        // Prevent duplicate fetch
        const fetchKey = `class_${urlInstituteId}_${urlClassId}`;
        if (fetchInProgressRef.current[fetchKey]) {
          return;
        }

        // Instant placeholder based only on URL id
        setSelectedClass({
          id: urlClassId,
          name: selectedClass?.name || `Class ${urlClassId}`,
          code: selectedClass?.code || '',
          description: selectedClass?.description || '',
          grade: selectedClass?.grade ?? 0,
          specialty: selectedClass?.specialty || ''
        });

        fetchInProgressRef.current[fetchKey] = true;
        cachedApiClient.get(`/institutes/${urlInstituteId}/classes/${urlClassId}`)
          .then(classData => {
            if (classData) {
              setSelectedClass({
                id: classData.id || classData.classId || urlClassId,
                name: classData.name || classData.className || selectedClass?.name || `Class ${urlClassId}`,
                code: classData.code || '',
                description: classData.description || '',
                grade: classData.grade ?? selectedClass?.grade ?? 0,
                specialty: classData.specialty || classData.section || selectedClass?.specialty || ''
              });
              if (!urlSubjectId) setSelectedSubject(null);
            }
          })
          .catch((error) => {
            console.error('Error loading class:', error);
          })
          .finally(() => {
            fetchInProgressRef.current[fetchKey] = false;
          });
      }

      // STEP 3: ASYNC subject selection (non-blocking background load)
      if (urlSubjectId && urlClassId && urlInstituteId && (!selectedSubject || selectedSubject.id?.toString() !== urlSubjectId)) {
        // Prevent duplicate fetch
        const fetchKey = `subject_${urlInstituteId}_${urlClassId}_${urlSubjectId}`;
        if (fetchInProgressRef.current[fetchKey]) {
          return;
        }

        fetchInProgressRef.current[fetchKey] = true;
        cachedApiClient.get(`/classes/${urlClassId}/subjects/${urlSubjectId}`)
          .then(subject => {
            if (subject) {
              setSelectedSubject({
                id: subject.id || subject.subjectId,
                name: subject.name || subject.subjectName,
                code: subject.code,
                description: subject.description,
                isActive: subject.isActive
              });
            }
          })
          .catch((error) => {
            console.error('Error loading subject:', error);
          })
          .finally(() => {
            fetchInProgressRef.current[fetchKey] = false;
          });
      }

      // Done validating
      setIsValidating(false);
    };

    syncContextFromUrl();
  }, [
    params.instituteId,
    params.classId,
    params.subjectId,
    user?.id,
    user?.institutes?.length
  ]);

  return {
    instituteId: params.instituteId,
    classId: params.classId,
    subjectId: params.subjectId,
    childId: params.childId,
    organizationId: params.organizationId,
    transportId: params.transportId,
    isValidating
  };
};
