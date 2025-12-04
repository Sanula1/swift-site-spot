import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
  const { currentInstituteId, user, selectedInstitute, selectedInstituteType } = useAuth();
  const userRole = useInstituteRole();
  const { toast } = useToast();

  // Check if user is InstituteAdmin or Teacher
  if (userRole !== 'Teacher' && userRole !== 'InstituteAdmin') {
    return (
      <div className="p-6 text-center">
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
  const [showClassSelector, setShowClassSelector] = useState(true);
  const [assignResult, setAssignResult] = useState<AssignResponse | null>(null);

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
    setSubjectsLoading(true);
    try {
      const params: Record<string, any> = { page: '1', limit: '50' };
      if (selectedInstituteType) {
        params.instituteType = selectedInstituteType;
      }
      
      // Use enhanced cached client
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
        // Use teacher-specific API for Teachers with caching
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
        // Use regular API for InstituteAdmin with caching
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
        // For teachers, map from class-subject assignments
        mappedClasses = classData.map((item: any) => ({
          id: item.class.id,
          name: item.class.name,
          code: item.class.code,
          grade: item.class.grade,
          specialty: item.class.specialty
        }));
      } else {
        // For InstituteAdmin, map directly from classes
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
    <div className="space-y-6">
      {showClassSelector ? (
        <Card>
          <CardHeader>
            <CardTitle>Select Class or Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Button 
                onClick={() => handleLoadClasses(false)}
                disabled={classesLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {classesLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading Classes...
                  </>
                ) : (
                  'Load Classes'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            <div>
              <Label htmlFor="class-select">Select Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a class..." />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} ({cls.code}) - Grade {cls.grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedClass && (
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{selectedClass.code}</Badge>
                    <span className="font-medium">{selectedClass.name}</span>
                    <Badge variant="outline">Grade {selectedClass.grade}</Badge>
                    {selectedClass.specialty && (
                      <Badge variant="outline">{selectedClass.specialty}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div>
              <Label htmlFor="teacher-id">Default Teacher ID (Optional)</Label>
              <Input
                id="teacher-id"
                type="text"
                value={defaultTeacherId}
                onChange={(e) => setDefaultTeacherId(e.target.value)}
                placeholder="Enter teacher ID or leave empty"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Select Subjects to Assign</Label>
                {subjects.length === 0 && (
                  <Button 
                    onClick={() => handleLoadSubjects(false)}
                    disabled={subjectsLoading}
                    variant="outline"
                    size="sm"
                  >
                    {subjectsLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load Subjects'
                    )}
                  </Button>
                )}
              </div>
              
              {subjects.length > 0 && (
                <div className="mb-3">
                  <Input
                    placeholder="Search subjects by name, category, or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
              )}
              
              {subjects.length > 0 ? (
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                  {filteredSubjects.map((subject) => (
                    <div key={subject.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={subject.id}
                        checked={selectedSubjectIds.includes(subject.id)}
                        onCheckedChange={(checked) => 
                          handleSubjectChange(subject.id, checked as boolean)
                        }
                      />
                      <Label 
                        htmlFor={subject.id} 
                        className="flex-1 text-sm cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{subject.name}</span>
                          </div>
                          <div className="flex gap-1">
                            <Badge variant="outline" className="text-xs">
                              {subject.category}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {subject.creditHours}h
                            </Badge>
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                  {filteredSubjects.length === 0 && searchQuery && (
                    <p className="text-center text-gray-500 py-4">
                      No subjects found matching "{searchQuery}"
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-2 border rounded-md p-8 text-center text-gray-500">
                  Click "Load Subjects" to view available subjects
                </div>
              )}
              
              {selectedSubjectIds.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {selectedSubjectIds.length} subject(s) selected
                </p>
              )}
            </div>
          </div>

          {assignResult && (
            <Alert className={assignResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              {assignResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className="text-sm">
                <div className="space-y-1">
                  <p>{assignResult.message}</p>
                  {assignResult.assignedCount > 0 && (
                    <p className="text-green-700">✓ {assignResult.assignedCount} subjects assigned successfully</p>
                  )}
                  {assignResult.skippedCount > 0 && (
                    <p className="text-yellow-700">⚠ {assignResult.skippedCount} subjects were skipped (already assigned)</p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignSubjects}
              disabled={isLoading || !selectedClassId || selectedSubjectIds.length === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Subjects'
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default AssignSubjectToClassForm;