import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Video, User, Calendar, ChevronDown, ChevronUp, Play, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import VideoPreviewDialog from '@/components/VideoPreviewDialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import CreateStructuredLectureForm from '@/components/forms/CreateStructuredLectureForm';
import UpdateStructuredLectureForm from '@/components/forms/UpdateStructuredLectureForm';
import DeleteStructuredLectureDialog from '@/components/forms/DeleteStructuredLectureDialog';
import { StructuredLecture } from '@/api/structuredLectures.api';

interface Attachment {
  documentName: string;
  documentUrl: string;
}

interface Lecture {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  grade: number;
  lessonNumber?: number;
  lectureNumber?: number;
  videoUrl: string | null;
  lectureVideoUrl?: string | null;
  thumbnailUrl: string | null;
  coverImageUrl?: string | null;
  attachments: Attachment[] | null;
  documentUrls?: string[] | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  provider?: string;
}

const FreeLectures = () => {
  const { selectedInstitute, selectedClass, selectedSubject, selectedClassGrade } = useAuth();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedLessons, setExpandedLessons] = useState<Record<string, boolean>>({});
  const [expandedLectures, setExpandedLectures] = useState<Record<string, boolean>>({});
  const [videoPreview, setVideoPreview] = useState<{ open: boolean; url: string; title: string }>({ 
    open: false, 
    url: '', 
    title: '' 
  });

  // CRUD state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  const [deletingLecture, setDeletingLecture] = useState<Lecture | null>(null);

  // Role-based access control
  const instituteUserType = selectedInstitute?.instituteUserType || (selectedInstitute as any)?.userRole;
  const isInstituteAdmin = instituteUserType === 'INSTITUTEADMIN' || instituteUserType === 'INSTITUTE_ADMIN';
  const isTeacher = instituteUserType === 'TEACHER';
  const canManageLectures = isInstituteAdmin || isTeacher;

  // Track current context to prevent unnecessary reloads
  const contextKey = `${selectedSubject?.id}-${selectedClassGrade}`;
  const [lastLoadedContext, setLastLoadedContext] = useState<string>('');

  // Group lectures by lesson number or topic
  const lecturesByLesson = React.useMemo(() => {
    const grouped = new Map<string, Lecture[]>();
    const unassigned: Lecture[] = [];
    
    lectures.forEach(lecture => {
      const lessonKey = lecture.lessonNumber 
        ? `Lesson ${lecture.lessonNumber}` 
        : (lecture.title || '').trim() || 'Untitled Topic';
      const existing = grouped.get(lessonKey) || [];
      grouped.set(lessonKey, [...existing, lecture]);
    });
    
    return { grouped, unassigned };
  }, [lectures]);

  // Get available lessons
  const availableLessons = React.useMemo(() => {
    return Array.from(lecturesByLesson.grouped.keys()).sort((a, b) => {
      // Sort "Lesson X" numerically
      const numA = a.match(/Lesson (\d+)/)?.[1];
      const numB = b.match(/Lesson (\d+)/)?.[1];
      if (numA && numB) return parseInt(numA) - parseInt(numB);
      return a.localeCompare(b);
    });
  }, [lecturesByLesson]);
  
  const totalLessons = availableLessons.length;

  // Auto-load free lectures when subject is selected
  useEffect(() => {
    if (selectedSubject && (selectedClassGrade !== null && selectedClassGrade !== undefined) && contextKey !== lastLoadedContext) {
      setLastLoadedContext(contextKey);
      fetchFreeLectures(false);
    }
  }, [contextKey]);

  const handleLoadLectures = () => {
    if (selectedSubject && (selectedClassGrade !== null && selectedClassGrade !== undefined)) {
      fetchFreeLectures(true);
    }
  };

  const fetchFreeLectures = async (forceRefresh = false) => {
    if (!selectedSubject || selectedClassGrade === null || selectedClassGrade === undefined) return;

    setLoading(true);
    setError(null);

    try {
      const baseUrl = import.meta.env.VITE_LMS_BASE_URL || 'https://lmsapi.suraksha.lk';
      const grade = selectedClassGrade || selectedClass?.grade || 10;
      const endpoint = `/api/structured-lectures/subject/${selectedSubject.id}?grade=${grade}`;
      
      const token = localStorage.getItem('access_token');
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          setLectures([]);
          setError(null);
          return;
        }
        if (response.status === 401) {
          setError('Authentication required. Please log in again.');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: Lecture[] = await response.json();
      setLectures(data);
    } catch (err: any) {
      console.error('Error fetching free lectures:', err);
      
      if (err.message?.includes('404')) {
        setLectures([]);
        setError(null);
        return;
      }
      
      setError('Error loading free lectures. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLecture = (videoUrl: string, title: string) => {
    if (videoUrl) {
      setVideoPreview({ open: true, url: videoUrl, title });
    }
  };

  const toggleLessonExpansion = (lessonKey: string) => {
    setExpandedLessons(prev => ({
      ...prev,
      [lessonKey]: !prev[lessonKey]
    }));
  };

  const toggleLectureExpansion = (lectureId: string) => {
    setExpandedLectures(prev => ({
      ...prev,
      [lectureId]: !prev[lectureId]
    }));
  };

  const handleCreateSuccess = () => {
    setShowCreateDialog(false);
    fetchFreeLectures(true);
  };

  const handleUpdateSuccess = () => {
    setEditingLecture(null);
    fetchFreeLectures(true);
  };

  const handleDeleteSuccess = () => {
    setDeletingLecture(null);
    fetchFreeLectures(true);
  };

  // Convert Lecture to StructuredLecture for forms
  const toStructuredLecture = (lecture: Lecture): StructuredLecture => ({
    id: lecture.id,
    instituteId: selectedInstitute?.id || '',
    classId: selectedClass?.id || '',
    subjectId: lecture.subjectId,
    grade: lecture.grade,
    lessonNumber: lecture.lessonNumber || 1,
    lectureNumber: lecture.lectureNumber || 1,
    title: lecture.title,
    description: lecture.description,
    lectureVideoUrl: lecture.videoUrl || lecture.lectureVideoUrl || undefined,
    coverImageUrl: lecture.thumbnailUrl || lecture.coverImageUrl || undefined,
    documentUrls: lecture.documentUrls || lecture.attachments?.map(a => a.documentUrl),
    provider: lecture.provider,
    isActive: lecture.isActive,
    createdBy: lecture.createdBy,
    createdAt: lecture.createdAt,
    updatedAt: lecture.updatedAt
  });

  if (!selectedSubject || selectedClassGrade === null || selectedClassGrade === undefined) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a subject to view free lectures.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with CRUD actions */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold">
              Lectures ({selectedInstitute?.name} → {selectedClass?.name} → {selectedSubject.name})
            </h1>
            <p className="text-sm text-muted-foreground">
              Grade {selectedClassGrade} • {lectures.length} lectures available
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLoadLectures}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            {canManageLectures && (
              <Button onClick={() => setShowCreateDialog(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Lecture
              </Button>
            )}
          </div>
        </div>
        
        {/* Load Lectures Button - Only show if no data loaded */}
        {lectures.length === 0 && !loading && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <p className="text-sm text-muted-foreground">Click the button below to load lectures data</p>
              <Button 
                onClick={handleLoadLectures}
                disabled={loading}
                size="sm"
              >
                <Video className="h-4 w-4 mr-2" />
                Load Data
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Subject Overview */}
      {lectures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Subject Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{lectures.length}</div>
                <div className="text-sm text-muted-foreground">Total Lectures</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{totalLessons}</div>
                <div className="text-sm text-muted-foreground">Total Lessons</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{lectures.filter(l => l.isActive).length}</div>
                <div className="text-sm text-muted-foreground">Active Lectures</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{selectedClassGrade}</div>
                <div className="text-sm text-muted-foreground">Grade Level</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lectures List */}
      {lectures.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>There are no free lectures for this subject!</p>
              {canManageLectures && (
                <Button 
                  onClick={() => setShowCreateDialog(true)} 
                  className="mt-4"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Lecture
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {availableLessons.map((lessonKey) => {
            const lessonLectures = lecturesByLesson.grouped.get(lessonKey) || [];
            const activeCount = lessonLectures.filter(l => l.isActive).length;
            const isExpanded = expandedLessons[lessonKey];
            
            return (
              <Card key={lessonKey}>
                <button
                  onClick={() => toggleLessonExpansion(lessonKey)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="text-lg font-bold px-3 py-1">
                      {lessonLectures.length}
                    </Badge>
                    <div className="text-left">
                      <h3 className="font-bold text-lg">{lessonKey}</h3>
                      <p className="text-sm text-muted-foreground">
                        {activeCount} active lectures
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {lessonLectures.map((lecture, index) => (
                        <Card key={lecture.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                          <div className="relative aspect-video bg-muted">
                            {(lecture.thumbnailUrl || lecture.coverImageUrl) ? (
                              <img 
                                src={lecture.thumbnailUrl || lecture.coverImageUrl || ''} 
                                alt={lecture.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Video className="h-12 w-12 text-muted-foreground/50" />
                              </div>
                            )}
                            <Badge variant="outline" className="absolute top-2 left-2 bg-background/90 backdrop-blur">
                              {lecture.lectureNumber || index + 1}
                            </Badge>
                            <Badge 
                              variant={lecture.isActive ? "default" : "secondary"} 
                              className="absolute top-2 right-2 bg-background/90 backdrop-blur"
                            >
                              {lecture.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <CardContent className="p-4 space-y-3">
                            <h4 className="font-semibold text-lg mb-1 line-clamp-2">{lecture.title}</h4>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {lecture.createdBy}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {lecture.createdAt ? format(new Date(lecture.createdAt), 'MMM dd, yyyy') : 'Jan 01, 1970'}
                              </span>
                            </div>

                            {lecture.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {lecture.description}
                              </p>
                            )}

                            {expandedLectures[lecture.id] && (
                              <div className="space-y-2 pt-2 border-t mt-2">
                                {lecture.description && (
                                  <p className="text-xs text-muted-foreground whitespace-pre-line">
                                    {lecture.description}
                                  </p>
                                )}

                                {(lecture.attachments || lecture.documentUrls) && (
                                  <div className="space-y-2">
                                    <h5 className="text-sm font-semibold text-foreground">Documents</h5>
                                    {(lecture.attachments || []).map((attachment, idx) => (
                                      <a
                                        key={idx}
                                        href={attachment.documentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors group"
                                      >
                                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                          <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                          </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                            {attachment.documentName}
                                          </p>
                                          <p className="text-xs text-muted-foreground">Click to open</p>
                                        </div>
                                      </a>
                                    ))}
                                    {(lecture.documentUrls || []).map((url, idx) => (
                                      <a
                                        key={`doc-${idx}`}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-xs text-primary hover:underline"
                                      >
                                        Document {idx + 1}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex flex-col gap-2 mt-2">
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => toggleLectureExpansion(lecture.id)}
                                >
                                  {expandedLectures[lecture.id] ? 'Hide details' : 'View more'}
                                </Button>
                                <Button
                                  onClick={() => handleJoinLecture(lecture.videoUrl || lecture.lectureVideoUrl || '', lecture.title)}
                                  disabled={!lecture.isActive || !(lecture.videoUrl || lecture.lectureVideoUrl)}
                                  size="sm"
                                  className="flex-1"
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  Watch
                                </Button>
                              </div>
                              
                              {/* Admin/Teacher Actions */}
                              {canManageLectures && (
                                <div className="flex gap-2 pt-2 border-t">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => setEditingLecture(lecture)}
                                  >
                                    <Pencil className="h-4 w-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 text-destructive hover:text-destructive"
                                    onClick={() => setDeletingLecture(lecture)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
          
          {/* Render unassigned lectures */}
          {lecturesByLesson.unassigned.length > 0 && (
            <Card>
              <div className="px-6 py-4 border-b">
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="text-sm">
                    Other Lectures
                  </Badge>
                  <div>
                    <h3 className="font-semibold">General Lectures</h3>
                    <p className="text-sm text-muted-foreground">
                      {lecturesByLesson.unassigned.length} lectures available
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lecturesByLesson.unassigned.map((lecture, index) => (
                    <Card key={lecture.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="relative aspect-video bg-muted">
                        {(lecture.thumbnailUrl || lecture.coverImageUrl) ? (
                          <img 
                            src={lecture.thumbnailUrl || lecture.coverImageUrl || ''} 
                            alt={lecture.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="h-12 w-12 text-muted-foreground/50" />
                          </div>
                        )}
                        <Badge variant="outline" className="absolute top-2 left-2 bg-background/90 backdrop-blur">
                          {index + 1}
                        </Badge>
                        <Badge 
                          variant={lecture.isActive ? "default" : "secondary"} 
                          className="absolute top-2 right-2 bg-background/90 backdrop-blur"
                        >
                          {lecture.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <CardContent className="p-4 space-y-3">
                        <h4 className="font-semibold text-lg mb-1 line-clamp-2">{lecture.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {lecture.createdBy}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {lecture.createdAt ? format(new Date(lecture.createdAt), 'MMM dd, yyyy') : 'Jan 01, 1970'}
                          </span>
                        </div>
                        
                        {lecture.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {lecture.description}
                          </p>
                        )}
                        
                        <div className="flex flex-col gap-2 mt-2">
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleJoinLecture(lecture.videoUrl || lecture.lectureVideoUrl || '', lecture.title)}
                              disabled={!lecture.isActive || !(lecture.videoUrl || lecture.lectureVideoUrl)}
                              className="flex-1"
                              size="sm"
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Watch Lecture
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => toggleLectureExpansion(lecture.id)}
                            >
                              {expandedLectures[lecture.id] ? 'Hide details' : 'View more'}
                            </Button>
                          </div>
                          
                          {/* Admin/Teacher Actions */}
                          {canManageLectures && (
                            <div className="flex gap-2 pt-2 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => setEditingLecture(lecture)}
                              >
                                <Pencil className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-destructive hover:text-destructive"
                                onClick={() => setDeletingLecture(lecture)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Video Preview Dialog */}
      <VideoPreviewDialog
        open={videoPreview.open}
        onOpenChange={(open) => {
          if (!open) setVideoPreview({ open: false, url: '', title: '' });
        }}
        url={videoPreview.url}
        title={videoPreview.title}
      />

      {/* Create Lecture Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <CreateStructuredLectureForm
            onClose={() => setShowCreateDialog(false)}
            onSuccess={handleCreateSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Update Lecture Dialog */}
      <Dialog open={!!editingLecture} onOpenChange={(open) => !open && setEditingLecture(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {editingLecture && (
            <UpdateStructuredLectureForm
              lecture={toStructuredLecture(editingLecture)}
              onClose={() => setEditingLecture(null)}
              onSuccess={handleUpdateSuccess}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Lecture Dialog */}
      {deletingLecture && (
        <DeleteStructuredLectureDialog
          lecture={toStructuredLecture(deletingLecture)}
          open={!!deletingLecture}
          onOpenChange={(open) => !open && setDeletingLecture(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
};

export default FreeLectures;
