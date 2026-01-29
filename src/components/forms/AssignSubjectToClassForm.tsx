import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle, Key, Unlock, BookOpen, GraduationCap, Users, Search, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { TeacherAutocomplete } from '@/components/ui/teacher-autocomplete';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { useToast } from '@/hooks/use-toast';
import { getBaseUrl } from '@/contexts/utils/auth.api';
import { enhancedCachedClient } from '@/api/enhancedCachedClient';
import { CACHE_TTL } from '@/config/cacheTTL';

interface AssignSubjectToClassFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
  category: string;
  creditHours: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ClassOption {
  id: string;
  name: string;
  code: string;
  grade: number;
  specialty: string;
}

interface AssignResponse {
  success: boolean;
  message: string;
  assignedCount: number;
  skippedCount: number;
}

const AssignSubjectToClassForm: React.FC<AssignSubjectToClassFormProps> = ({
  onSuccess,
  onCancel
}) => {
  const { currentInstituteId, user, selectedInstitute } = useAuth();
  const userRole = useInstituteRole();
  const { toast } = useToast();

  // Check if user is InstituteAdmin or Teacher
  if (userRole !== 'Teacher' && userRole !== 'InstituteAdmin') {
    return (
      <div className="p-4 sm:p-6 text-center">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access Denied: This feature is only available for Institute Admins and Teachers.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [defaultTeacherId, setDefaultTeacherId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [classesLoading, setClassesLoading] = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [classSearchQuery, setClassSearchQuery] = useState('');
  const [showClassSelector, setShowClassSelector] = useState(true);
  const [assignResult, setAssignResult] = useState<AssignResponse | null>(null);
  // Per-subject enrollment settings: { subjectId: { enabled: boolean, key: string } }
  const [subjectEnrollmentSettings, setSubjectEnrollmentSettings] = useState<Record<string, { enabled: boolean; key: string }>>({});

  // Helper functions for per-subject enrollment
  const getSubjectEnrollment = (subjectId: string) => {
    return subjectEnrollmentSettings[subjectId] || { enabled: false, key: '' };
  };

  const updateSubjectEnrollment = (subjectId: string, field: 'enabled' | 'key', value: boolean | string) => {
    setSubjectEnrollmentSettings(prev => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId] || { enabled: false, key: '' },
        [field]: value
      }
    }));
  };

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

  const handleLoadSubjects = async (forceRefresh = false) => {
    if (!currentInstituteId) {
      toast({
        title: "Error",
        description: "Please select an institute first.",
        variant: "destructive"
      });
      return;
    }

    setSubjectsLoading(true);
    try {
      const params: Record<string, any> = { 
        page: '1', 
        limit: '50',
        instituteId: currentInstituteId
      };
      
      const result: Subject[] = await enhancedCachedClient.get(
        '/subjects',
        params,
        {
          ttl: CACHE_TTL.SUBJECTS,
          forceRefresh,
          userId: user?.id,
          role: userRole,
          instituteId: currentInstituteId
        }
      );
      
      setSubjects(result.filter(subject => subject.isActive));
    } catch (error) {
      console.error('Error loading subjects:', error);
      toast({
        title: "Load Failed",
        description: "Failed to load subjects data.",
        variant: "destructive"
      });
    } finally {
      setSubjectsLoading(false);
    }
  };

  const handleLoadClasses = async (forceRefresh = false) => {
    if (!currentInstituteId) {
      toast({
        title: "Error",
        description: "Please select an institute first.",
        variant: "destructive"
      });
      return;
    }

    setClassesLoading(true);
    try {
      let classData: any[] = [];
      
      if (userRole === 'Teacher' && user?.id) {
        const result = await enhancedCachedClient.get(
          `/institute-classes/${currentInstituteId}/teacher/${user.id}`,
          { page: '1', limit: '10' },
          {
            ttl: CACHE_TTL.CLASSES,
            forceRefresh,
            userId: user?.id,
            role: userRole,
            instituteId: currentInstituteId
          }
        );
        
        classData = result.data || [];
      } else if (userRole === 'InstituteAdmin') {
        const result = await enhancedCachedClient.get(
          `/institute-classes/institute/${currentInstituteId}`,
          {},
          {
            ttl: CACHE_TTL.CLASSES,
            forceRefresh,
            userId: user?.id,
            role: userRole,
            instituteId: currentInstituteId
          }
        );
        
        classData = result || [];
      }
      
      let mappedClasses: any[] = [];
      
      if (userRole === 'Teacher') {
        mappedClasses = classData.map((item: any) => ({
          id: item.class.id,
          name: item.class.name,
          code: item.class.code,
          grade: item.class.grade,
          specialty: item.class.specialty
        }));
      } else {
        mappedClasses = classData.map((cls: any) => ({
          id: cls.id,
          name: cls.name,
          code: cls.code,
          grade: cls.grade,
          specialty: cls.specialty
        }));
      }
      
      setClasses(mappedClasses);
      setShowClassSelector(false);
    } catch (error) {
      console.error('Error loading classes:', error);
      toast({
        title: "Load Failed",
        description: "Failed to load classes data.",
        variant: "destructive"
      });
    } finally {
      setClassesLoading(false);
    }
  };

  const handleSubjectChange = (subjectId: string, checked: boolean) => {
    if (checked) {
      setSelectedSubjectIds(prev => [...prev, subjectId]);
    } else {
      setSelectedSubjectIds(prev => prev.filter(id => id !== subjectId));
    }
  };

  const handleAssignSubjects = async () => {
    if (!selectedClassId) {
      toast({
        title: "Error",
        description: "Please select a class.",
        variant: "destructive"
      });
      return;
    }

    if (selectedSubjectIds.length === 0) {
      toast({
        title: "Error", 
        description: "Please select at least one subject.",
        variant: "destructive"
      });
      return;
    }

    if (!currentInstituteId) {
      toast({
        title: "Error",
        description: "Institute not selected.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const baseUrl = getBaseUrl();
      const headers = getApiHeaders();
      
      // API expects subjectIds as array of strings
      const requestBody = {
        subjectIds: selectedSubjectIds,
        defaultTeacherId: defaultTeacherId || user?.id || undefined
      };

      const url = `${baseUrl}/institutes/${currentInstituteId}/classes/${selectedClassId}/subjects/bulk`;
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to assign subjects: ${response.status}`);
      }
      
      const result: AssignResponse = await response.json();
      setAssignResult(result);

      toast({
        title: "Assignment Complete",
        description: result.message
      });

      if (result.assignedCount > 0) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (error) {
      console.error('Error assigning subjects:', error);
      toast({
        title: "Assignment Failed",
        description: "Failed to assign subjects to class.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter subjects based on search query
  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subject.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subject.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedClass = classes.find(cls => cls.id === selectedClassId);

  return (
    <div className="space-y-4 sm:space-y-6 max-h-[80vh] overflow-hidden flex flex-col">
      {showClassSelector ? (
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <GraduationCap className="h-5 w-5 text-primary" />
              Select Class
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6 sm:py-8">
              <p className="text-sm text-muted-foreground mb-4">
                Click below to load available classes
              </p>
              <Button 
                onClick={() => handleLoadClasses(false)}
                disabled={classesLoading}
                size="lg"
                className="w-full sm:w-auto"
              >
                {classesLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading Classes...
                  </>
                ) : (
                  <>
                    <GraduationCap className="h-4 w-4 mr-2" />
                    Load Classes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4 sm:space-y-5 pr-1">
          {/* Class Selection */}
          <div className="space-y-3">
            <Label htmlFor="class-select" className="text-sm font-medium flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              Select Class
            </Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a class..." />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2 sticky top-0 bg-popover">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search classes..."
                      className="pl-8"
                      value={classSearchQuery}
                      onChange={(e) => setClassSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <ScrollArea className="max-h-48">
                  {classes
                    .filter((cls) => 
                      cls.name.toLowerCase().includes(classSearchQuery.toLowerCase()) ||
                      cls.code.toLowerCase().includes(classSearchQuery.toLowerCase()) ||
                      String(cls.grade).includes(classSearchQuery)
                    )
                    .map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{cls.name}</span>
                          <Badge variant="secondary" className="text-xs">{cls.code}</Badge>
                          <Badge variant="outline" className="text-xs">Grade {cls.grade}</Badge>
                        </span>
                      </SelectItem>
                    ))}
                </ScrollArea>
              </SelectContent>
            </Select>
          </div>

          {/* Selected Class Card */}
          {selectedClass && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-3 px-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    {selectedClass.code}
                  </Badge>
                  <span className="font-medium text-sm">{selectedClass.name}</span>
                  <Badge variant="outline" className="text-xs">Grade {selectedClass.grade}</Badge>
                  {selectedClass.specialty && (
                    <Badge variant="secondary" className="text-xs">{selectedClass.specialty}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Teacher Selection */}
          <div className="space-y-3">
            <Label htmlFor="teacher-id" className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Default Teacher
              <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <TeacherAutocomplete
              value={defaultTeacherId}
              onChange={(teacherId) => setDefaultTeacherId(teacherId)}
              placeholder="Search teacher by name..."
            />
          </div>

          {/* Subject Selection */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Select Subjects to Assign
              </Label>
              {subjects.length === 0 && (
                <Button 
                  onClick={() => handleLoadSubjects(false)}
                  disabled={subjectsLoading}
                  size="sm"
                  variant="outline"
                >
                  {subjectsLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-3 w-3 mr-1.5" />
                      Load Subjects
                    </>
                  )}
                </Button>
              )}
            </div>
            
            {subjects.length > 0 && (
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search subjects by name, category, or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            )}
            
            {subjects.length > 0 ? (
              <ScrollArea className="h-48 sm:h-56 border rounded-lg">
                <div className="p-2 space-y-1">
                  {filteredSubjects.map((subject) => (
                    <div 
                      key={subject.id} 
                      className={`flex items-center gap-3 p-2.5 rounded-md cursor-pointer transition-colors hover:bg-accent/50 ${
                        selectedSubjectIds.includes(subject.id) ? 'bg-primary/10 border border-primary/20' : 'border border-transparent'
                      }`}
                      onClick={() => handleSubjectChange(subject.id, !selectedSubjectIds.includes(subject.id))}
                    >
                      <Checkbox
                        id={subject.id}
                        checked={selectedSubjectIds.includes(subject.id)}
                        onCheckedChange={(checked) => handleSubjectChange(subject.id, checked as boolean)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{subject.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{subject.code}</p>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {subject.category}
                        </Badge>
                        <Badge variant="secondary" className="text-xs whitespace-nowrap">
                          <Clock className="h-3 w-3 mr-1" />
                          {subject.creditHours}h
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {filteredSubjects.length === 0 && searchQuery && (
                    <p className="text-center text-muted-foreground py-6 text-sm">
                      No subjects found matching "{searchQuery}"
                    </p>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="border rounded-lg p-6 sm:p-8 text-center bg-muted/30">
                <BookOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Click "Load Subjects" to view available subjects
                </p>
              </div>
            )}
            
            {selectedSubjectIds.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="default" className="rounded-full">
                    {selectedSubjectIds.length}
                  </Badge>
                  <span className="text-muted-foreground">subject(s) selected</span>
                </div>

                {/* Per-Subject Enrollment Settings */}
                <Card className="border-dashed">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Key className="h-4 w-4 text-primary" />
                      Enrollment Settings
                      <span className="text-muted-foreground font-normal">(Per Subject)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <p className="text-xs text-muted-foreground mb-3">
                      Configure self-enrollment for each selected subject
                    </p>
                    <ScrollArea className="max-h-48">
                      <div className="space-y-3">
                        {selectedSubjectIds.map((subjectId) => {
                          const subject = subjects.find(s => s.id === subjectId);
                          const enrollment = getSubjectEnrollment(subjectId);
                          if (!subject) return null;
                          
                          return (
                            <div 
                              key={subjectId} 
                              className="p-3 rounded-lg border bg-card space-y-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <BookOpen className="h-4 w-4 text-primary shrink-0" />
                                  <span className="font-medium text-sm truncate">{subject.name}</span>
                                  <Badge variant="outline" className="text-xs shrink-0">{subject.code}</Badge>
                                </div>
                                <Switch
                                  checked={enrollment.enabled}
                                  onCheckedChange={(checked) => updateSubjectEnrollment(subjectId, 'enabled', checked)}
                                />
                              </div>
                              
                              {enrollment.enabled && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                                  <div className="flex items-center gap-2">
                                    {enrollment.key ? (
                                      <Badge variant="secondary" className="text-xs">
                                        <Key className="h-3 w-3 mr-1" />
                                        Key Required
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                                        <Unlock className="h-3 w-3 mr-1" />
                                        Open
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="relative">
                                    <Key className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                      placeholder="e.g., MATH-2026 (empty = open)"
                                      value={enrollment.key}
                                      onChange={(e) => updateSubjectEnrollment(subjectId, 'key', e.target.value.toUpperCase())}
                                      maxLength={50}
                                      className="pl-8 h-9 text-sm"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Assignment Result */}
          {assignResult && (
            <Alert className={assignResult.success ? "border-emerald-500/30 bg-emerald-500/10" : "border-destructive/30 bg-destructive/10"}>
              {assignResult.success ? (
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              <AlertDescription className="text-sm">
                <div className="space-y-1">
                  <p className="font-medium">{assignResult.message}</p>
                  {assignResult.assignedCount > 0 && (
                    <p className="text-emerald-600">✓ {assignResult.assignedCount} subjects assigned successfully</p>
                  )}
                  {assignResult.skippedCount > 0 && (
                    <p className="text-amber-600">⚠ {assignResult.skippedCount} subjects were skipped (already assigned)</p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Footer Actions */}
      {!showClassSelector && (
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t bg-background sticky bottom-0">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssignSubjects}
            disabled={isLoading || !selectedClassId || selectedSubjectIds.length === 0}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Assign {selectedSubjectIds.length > 0 ? `${selectedSubjectIds.length} ` : ''}Subjects
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AssignSubjectToClassForm;
