import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useMemo, useState, useRef } from 'react';
import { cachedApiClient } from '@/api/cachedClient';
import { toast } from 'sonner';
import { parseContextIds } from '@/utils/pageNavigation';

/**
 * Hook to sync URL params with AuthContext
 * Loads institute/class/subject/child data based on URL and validates access
 * 
 * CRITICAL: Handles direct URL navigation correctly for all context types
 */
export const useRouteContext = () => {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [isValidating, setIsValidating] = useState(true);
  const fetchInProgressRef = useRef<{ [key: string]: boolean }>({});

  // IMPORTANT: Our main route uses a wildcard (e.g. "/institute/:instituteId/*"),
  // so react-router's useParams() will NOT reliably provide classId/subjectId.
  // Always derive those IDs from the full pathname.
  const urlContextIds = useMemo(() => parseContextIds(location.pathname), [location.pathname]);
  const urlInstituteId = params.instituteId ?? urlContextIds.instituteId;
  const urlClassId = urlContextIds.classId;
  const urlSubjectId = urlContextIds.subjectId;
  const urlChildId = urlContextIds.childId;
  const urlOrganizationId = urlContextIds.organizationId;
  const urlTransportId = urlContextIds.transportId;

  // Prevent redirect loops: routing-driven clearing should react to ROUTE changes,
  // not transient selection state changes during clicks.
  const latestSelectionRef = useRef({
    selectedInstitute: null as any,
    selectedClass: null as any,
    selectedSubject: null as any,
    selectedChild: null as any,
    isViewingAsParent: false
  });
  
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
    setSelectedChild,
    user,
    loadUserInstitutes,
    isViewingAsParent
  } = useAuth();

  // Keep latest selections in a ref so the route sync effect can avoid depending
  // on selection state (which was causing auto-navigation / flicker loops).
  useEffect(() => {
    latestSelectionRef.current = {
      selectedInstitute,
      selectedClass,
      selectedSubject,
      selectedChild,
      isViewingAsParent
    };
  }, [selectedInstitute, selectedClass, selectedSubject, selectedChild, isViewingAsParent]);

  /**
   * Keep AuthContext selection in sync with route changes (especially browser/hardware back).
   *
   * IMPORTANT:
   * - Institute context SHOULD follow /institute/... URLs
   * - Parent-viewing-child flow uses /child/:childId/* URLs (institute/class/subject selection is NOT encoded)
   *   so we clear selection based on the child step routes.
   */
  useEffect(() => {
    const {
      selectedInstitute: latestInstitute,
      selectedClass: latestClass,
      selectedSubject: latestSubject,
      selectedChild: latestChild,
      isViewingAsParent: latestIsViewingAsParent
    } = latestSelectionRef.current;

    const path = location.pathname;
    const isChildRoute = path.startsWith('/child/');
    const isInstituteRoute = path.startsWith('/institute/');

    // 1) Leaving child routes => clear selectedChild (prevents stale "Child" + stale institute role)
    if (!isChildRoute && latestIsViewingAsParent && latestChild) {
      setSelectedChild(null, false);
    }

    // 2) Child flow step routes must control what selections are allowed
    if (isChildRoute) {
      // /child/:id/select-institute => clear institute + deeper
      if (path.includes('/select-institute')) {
        if (latestInstitute) setSelectedInstitute(null);
        if (latestClass) setSelectedClass(null);
        if (latestSubject) setSelectedSubject(null);
        return;
      }

      // /child/:id/select-class => clear class + subject (keep institute)
      if (path.includes('/select-class')) {
        if (latestClass) setSelectedClass(null);
        if (latestSubject) setSelectedSubject(null);
        return;
      }

      // /child/:id/select-subject => clear subject (keep institute + class)
      if (path.includes('/select-subject')) {
        if (latestSubject) setSelectedSubject(null);
        return;
      }

      return;
    }

    // 3) Non-child routes: Institute context must follow the URL params
    if (!isInstituteRoute) {
      // When leaving /institute/... routes (e.g. to /dashboard), clear stale selections.
      if (latestInstitute) {
        setSelectedInstitute(null); // also clears class/subject
      } else {
        // Safety: if institute already null but class/subject linger, clear them.
        if (latestClass) setSelectedClass(null);
        if (latestSubject) setSelectedSubject(null);
      }
      return;
    }

    // 4) On /institute/... routes: selection step routes control what is allowed.
    // IMPORTANT: this runs on ROUTE changes (not selection changes) to avoid click-trigger loops.
    if (path.includes('/select-class')) {
      if (latestClass) setSelectedClass(null);
      if (latestSubject) setSelectedSubject(null);
      return;
    }

    if (path.includes('/select-subject')) {
      if (latestSubject) setSelectedSubject(null);
      return;
    }

    // 5) Non-selection institute routes: if URL doesn't have class/subject, clear them
    if (!urlClassId && latestClass) setSelectedClass(null);
    if (!urlSubjectId && latestSubject) setSelectedSubject(null);
  }, [
    location.pathname,
    urlClassId,
    urlSubjectId,
    setSelectedChild,
    setSelectedInstitute,
    setSelectedClass,
    setSelectedSubject
  ]);

  useEffect(() => {
    if (!user) {
      setIsValidating(false);
      return;
    }

    const syncContextFromUrl = async () => {
      // Sync URL params to context
      const urlInstituteIdLocal = urlInstituteId;
      const urlClassIdLocal = urlClassId;
      const urlSubjectIdLocal = urlSubjectId;
      const urlChildIdLocal = urlChildId;

      // ✅ Parents page is class-scoped only: if URL includes subject, strip it.
      if (location.pathname.includes('/parents') && urlSubjectIdLocal) {
        const newPath = location.pathname.replace(`/subject/${urlSubjectIdLocal}`, '');
        if (newPath !== location.pathname) {
          navigate(newPath + location.search, { replace: true });
          return;
        }
      }

      // STEP 0: Child selection from URL (for Parent viewing child)
      if (urlChildIdLocal && (!selectedChild || selectedChild.id?.toString() !== urlChildIdLocal)) {
        const fetchKey = `child_${urlChildIdLocal}`;
        if (!fetchInProgressRef.current[fetchKey]) {
          fetchInProgressRef.current[fetchKey] = true;
        console.log('👶 Setting child context from URL:', urlChildIdLocal);
          
          // Try to load child data from user's children
          try {
            const response = await cachedApiClient.get('/parents/children');
            const children = response?.data || response || [];
            const child = children.find((c: any) => c.id?.toString() === urlChildIdLocal || c.userId?.toString() === urlChildIdLocal);
            
            if (child) {
              console.log('✅ Found child data:', child);
              setSelectedChild(child, true); // Enable viewAsParent mode
            } else {
              console.log('⚠️ Child not found in parent\'s children list');
            }
          } catch (error) {
            console.error('Error loading child data:', error);
          } finally {
            fetchInProgressRef.current[fetchKey] = false;
          }
        }
      }

      // STEP 1: Institute selection from URL
      if (urlInstituteIdLocal && (!selectedInstitute || selectedInstitute.id?.toString() !== urlInstituteIdLocal)) {
        // Prevent duplicate fetch for same institute
        const fetchKey = `institute_${urlInstituteIdLocal}`;
        if (fetchInProgressRef.current[fetchKey]) {
          return;
        }

        // First, try to find in user's existing institutes array
        let instituteFound = false;
        if (user?.institutes?.length > 0) {
          const institute = user.institutes.find(inst => inst.id?.toString() === urlInstituteIdLocal);
          if (institute) {
            console.log('🏢 Found institute in user.institutes:', institute.name);
            setSelectedInstitute(institute);
            instituteFound = true;
            if (!urlClassIdLocal) setSelectedClass(null);
            if (!urlSubjectIdLocal) setSelectedSubject(null);
          }
        }

        // If not found in user.institutes, fetch from API
        if (!instituteFound) {
          fetchInProgressRef.current[fetchKey] = true;
          console.log('🔍 Institute not in user.institutes, fetching from API...', urlInstituteIdLocal);
          
          try {
            // First, ensure user institutes are loaded (they might not be loaded yet)
            const institutes = await loadUserInstitutes();
            
            // Now try to find the institute again
            const institute = institutes?.find(inst => inst.id?.toString() === urlInstituteIdLocal);
            
            if (institute) {
              console.log('✅ Institute loaded from API:', institute.name);
              setSelectedInstitute(institute);
              if (!urlClassIdLocal) setSelectedClass(null);
              if (!urlSubjectIdLocal) setSelectedSubject(null);
            } else {
              // Institute not found - user doesn't have access
              console.warn('⚠️ User does not have access to institute:', urlInstituteIdLocal);
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
      if (urlClassIdLocal && urlInstituteIdLocal && (!selectedClass || selectedClass.id?.toString() !== urlClassIdLocal)) {
        // Prevent duplicate fetch
        const fetchKey = `class_${urlInstituteIdLocal}_${urlClassIdLocal}`;
        if (fetchInProgressRef.current[fetchKey]) {
          return;
        }

        // Instant placeholder based only on URL id
        setSelectedClass({
          id: urlClassIdLocal,
          name: selectedClass?.name || `Class ${urlClassIdLocal}`,
          code: selectedClass?.code || '',
          description: selectedClass?.description || '',
          grade: selectedClass?.grade ?? 0,
          specialty: selectedClass?.specialty || ''
        });

        fetchInProgressRef.current[fetchKey] = true;
        cachedApiClient.get(`/institutes/${urlInstituteIdLocal}/classes/${urlClassIdLocal}`)
          .then(classData => {
            if (classData) {
              setSelectedClass({
                id: classData.id || classData.classId || urlClassIdLocal,
                name: classData.name || classData.className || selectedClass?.name || `Class ${urlClassIdLocal}`,
                code: classData.code || '',
                description: classData.description || '',
                grade: classData.grade ?? selectedClass?.grade ?? 0,
                specialty: classData.specialty || classData.section || selectedClass?.specialty || ''
              });
              if (!urlSubjectIdLocal) setSelectedSubject(null);
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
      if (urlSubjectIdLocal && urlClassIdLocal && urlInstituteIdLocal && (!selectedSubject || selectedSubject.id?.toString() !== urlSubjectIdLocal)) {
        // Prevent duplicate fetch
        const fetchKey = `subject_${urlInstituteIdLocal}_${urlClassIdLocal}_${urlSubjectIdLocal}`;
        if (fetchInProgressRef.current[fetchKey]) {
          return;
        }

        fetchInProgressRef.current[fetchKey] = true;
        cachedApiClient.get(`/classes/${urlClassIdLocal}/subjects/${urlSubjectIdLocal}`)
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
    urlInstituteId,
    urlClassId,
    urlSubjectId,
    urlChildId,
    location.pathname,
    user?.id,
    user?.institutes?.length
  ]);

  return {
    instituteId: urlInstituteId,
    classId: urlClassId,
    subjectId: urlSubjectId,
    childId: urlChildId,
    organizationId: urlOrganizationId,
    transportId: urlTransportId,
    isValidating
  };
};
