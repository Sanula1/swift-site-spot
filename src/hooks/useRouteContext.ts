import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { cachedApiClient } from '@/api/cachedClient';
import { toast } from 'sonner';

/**
 * Hook to sync URL params with AuthContext
 * Loads institute/class/subject data based on URL and validates access
 */
export const useRouteContext = () => {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [isValidating, setIsValidating] = useState(true);
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
    user
  } = useAuth();

  useEffect(() => {
    if (!user) {
      setIsValidating(false);
      return;
    }

    // INSTANT: Set validating to false immediately - don't block UI
    setIsValidating(false);

    // Sync URL params to context
    const urlInstituteId = params.instituteId;
    const urlClassId = params.classId;
    const urlSubjectId = params.subjectId;

    // ✅ Parents page is class-scoped only: if URL includes subject, strip it.
    // Example: /institute/1/class/1/subject/1/parents -> /institute/1/class/1/parents
    if (location.pathname.includes('/parents') && urlSubjectId) {
      const newPath = location.pathname.replace(`/subject/${urlSubjectId}`, '');
      if (newPath !== location.pathname) {
        navigate(newPath + location.search, { replace: true });
        return;
      }
    }

    // STEP 1: SYNCHRONOUS institute selection from URL
    if (urlInstituteId && (!selectedInstitute || selectedInstitute.id?.toString() !== urlInstituteId)) {
      if (user?.institutes?.length > 0) {
        const institute = user.institutes.find(inst => inst.id?.toString() === urlInstituteId);
        if (institute) {
          setSelectedInstitute(institute);
          if (!urlClassId) setSelectedClass(null);
          if (!urlSubjectId) setSelectedSubject(null);
        }
      }
    }

    // STEP 2: ASYNC class selection (non-blocking background load)
    // Immediately set a lightweight placeholder so sidebar/navigation update without waiting for API
    if (urlClassId && urlInstituteId && (!selectedClass || selectedClass.id?.toString() !== urlClassId)) {
      // Instant placeholder based only on URL id (will be refined once API returns)
      setSelectedClass({
        id: urlClassId,
        name: selectedClass?.name || `Class ${urlClassId}`,
        code: selectedClass?.code || '',
        description: selectedClass?.description || '',
        grade: selectedClass?.grade ?? 0,
        specialty: selectedClass?.specialty || ''
      });

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
        .catch(() => {});
    }

    // STEP 3: ASYNC subject selection (non-blocking background load)
    if (urlSubjectId && urlClassId && urlInstituteId && (!selectedSubject || selectedSubject.id?.toString() !== urlSubjectId)) {
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
        .catch(() => {});
    }
  }, [
    params.instituteId,
    params.classId,
    params.subjectId,
    user?.id
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
