import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { enrollmentApi, ApiError, EnrollmentSettingsResponse } from '@/api/enrollment.api';
import { studentsApi } from '@/api/students.api';
import { Settings, Copy, Users, UserPlus, Loader2, Key, Lock, Unlock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TeacherEnrollmentManagerProps {
  instituteId: string;
  classId: string;
  subjectId: string;
  subjectName?: string;
  className?: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  imageUrl?: string;
}

const TeacherEnrollmentManager: React.FC<TeacherEnrollmentManagerProps> = ({
  instituteId,
  classId,
  subjectId,
  subjectName = "Subject",
  className = "Class"
}) => {
  const [settings, setSettings] = useState<EnrollmentSettingsResponse | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadEnrollmentSettings();
    loadAvailableStudents();
  }, [instituteId, classId, subjectId]);

  const loadEnrollmentSettings = async () => {
    try {
      setIsLoadingSettings(true);
      const result = await enrollmentApi.getEnrollmentSettings(instituteId, classId, subjectId);
      setSettings(result);
    } catch (error) {
      console.error('Failed to load enrollment settings:', error);
      toast({
        title: "Error",
        description: "Failed to load enrollment settings",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const loadAvailableStudents = async () => {
    try {
      setIsLoadingStudents(true);
      // This would need to be implemented to get students not enrolled in the subject
      // For now, using mock data structure
      const mockStudents: Student[] = [
        { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        { id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
        { id: '3', firstName: 'Mike', lastName: 'Johnson', email: 'mike@example.com' },
      ];
      setAvailableStudents(mockStudents);
    } catch (error) {
      console.error('Failed to load available students:', error);
      toast({
        title: "Error",
        description: "Failed to load available students",
        variant: "destructive",
      });
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const [showKeyInput, setShowKeyInput] = useState(false);
  const [customKey, setCustomKey] = useState('');

  const toggleEnrollment = async (enabled: boolean) => {
    setIsLoading(true);
    try {
      const result = await enrollmentApi.updateEnrollmentSettings(
        instituteId,
        classId,
        subjectId,
        enabled,
        enabled ? undefined : '' // Clear key when disabling
      );
      setSettings(result);
      toast({
        title: "Settings Updated",
        description: `Enrollment ${enabled ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      console.error('Failed to update enrollment settings:', error);
      if (error instanceof ApiError) {
        toast({
          title: "Update Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update enrollment settings",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateEnrollmentKey = async (key: string) => {
    setIsLoading(true);
    try {
      const result = await enrollmentApi.updateEnrollmentSettings(
        instituteId,
        classId,
        subjectId,
        true,
        key || undefined // Empty = open enrollment, value = key-required
      );
      setSettings(result);
      setShowKeyInput(false);
      setCustomKey('');
      toast({
        title: "Key Updated",
        description: key ? "Enrollment key set successfully" : "Switched to open enrollment",
      });
    } catch (error) {
      console.error('Failed to update enrollment key:', error);
      if (error instanceof ApiError) {
        toast({
          title: "Update Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update enrollment key",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const assignStudents = async () => {
    if (selectedStudents.length === 0) {
      toast({
        title: "No Students Selected",
        description: "Please select students to assign",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await enrollmentApi.teacherAssignStudents(
        instituteId,
        classId,
        subjectId,
        selectedStudents
      );
      
      if (result.failedCount > 0) {
        toast({
          title: "Partial Success",
          description: `${result.successCount} assigned, ${result.failedCount} failed`,
        });
      } else {
        toast({
          title: "Assignment Successful",
          description: `Successfully assigned ${result.successCount} students`,
        });
      }
      
      setSelectedStudents([]);
      loadAvailableStudents(); // Refresh the list
      loadEnrollmentSettings(); // Update enrollment count
    } catch (error) {
      console.error('Failed to assign students:', error);
      if (error instanceof ApiError) {
        toast({
          title: "Assignment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to assign students",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyEnrollmentKey = async () => {
    if (settings?.enrollmentKey) {
      try {
        await navigator.clipboard.writeText(settings.enrollmentKey);
        toast({
          title: "Copied",
          description: "Enrollment key copied to clipboard",
        });
      } catch (error) {
        toast({
          title: "Copy Failed",
          description: "Failed to copy enrollment key",
          variant: "destructive",
        });
      }
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    setSelectedStudents(availableStudents.map(student => student.id));
  };

  const clearSelection = () => {
    setSelectedStudents([]);
  };

  if (isLoadingSettings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Enrollment Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enrollment Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Enrollment Settings
          </CardTitle>
          <CardDescription>
            Configure self-enrollment for {subjectName} in {className}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {settings && (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enrollment-toggle">Enable Self-Enrollment</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow students to enroll using an enrollment key
                  </p>
                </div>
                <Switch
                  id="enrollment-toggle"
                  checked={settings.enrollmentEnabled}
                  onCheckedChange={toggleEnrollment}
                  disabled={isLoading}
                />
              </div>

              {settings.enrollmentEnabled && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {settings.enrollmentKey ? (
                        <Lock className="h-4 w-4 text-amber-600" />
                      ) : (
                        <Unlock className="h-4 w-4 text-green-600" />
                      )}
                      <Label className="font-medium">
                        {settings.enrollmentKey ? 'Key-Required Enrollment' : 'Open Enrollment'}
                      </Label>
                    </div>
                    <Badge variant={settings.enrollmentKey ? "secondary" : "default"}>
                      {settings.enrollmentKey ? 'Key Required' : 'Open'}
                    </Badge>
                  </div>

                  {settings.enrollmentKey ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 bg-background border rounded font-mono text-sm">
                          {settings.enrollmentKey}
                        </code>
                        <Button size="sm" variant="outline" onClick={copyEnrollmentKey}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <Alert>
                        <AlertDescription>
                          Share this key with students to allow self-enrollment.
                        </AlertDescription>
                      </Alert>
                    </div>
                  ) : (
                    <Alert>
                      <AlertDescription>
                        Any student can enroll without needing a key.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Toggle between open and key-required */}
                  {!showKeyInput ? (
                    <div className="flex gap-2">
                      {settings.enrollmentKey ? (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => updateEnrollmentKey('')}
                          disabled={isLoading}
                        >
                          <Unlock className="h-4 w-4 mr-2" />
                          Switch to Open Enrollment
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setShowKeyInput(true)}
                          disabled={isLoading}
                        >
                          <Key className="h-4 w-4 mr-2" />
                          Set Enrollment Key
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Enter custom key (e.g., MATH-2026)"
                          value={customKey}
                          onChange={(e) => setCustomKey(e.target.value)}
                          maxLength={50}
                          className="flex-1"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => updateEnrollmentKey(customKey)}
                          disabled={isLoading || !customKey.trim()}
                        >
                          {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Key className="h-4 w-4 mr-2" />}
                          Set Key
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            setShowKeyInput(false);
                            setCustomKey('');
                          }}
                          disabled={isLoading}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {settings.currentEnrollmentCount}
                  </div>
                  <div className="text-sm text-muted-foreground">Current Enrollments</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Last Updated</div>
                  <div className="text-sm font-medium">
                    {new Date(settings.updatedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Student Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Assign Students
          </CardTitle>
          <CardDescription>
            Manually assign students to this subject
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingStudents ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">Available Students</span>
                  <Badge variant="secondary">{availableStudents.length}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={selectAllStudents}>
                    Select All
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-64 border rounded-lg">
                <div className="p-4 space-y-2">
                  {availableStudents.map((student) => (
                    <div key={student.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={student.id}
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={() => toggleStudentSelection(student.id)}
                      />
                      <Label htmlFor={student.id} className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium">
                              {student.firstName[0]}{student.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">
                              {student.firstName} {student.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {student.email}
                            </div>
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {selectedStudents.length > 0 && (
                <Alert>
                  <AlertDescription>
                    {selectedStudents.length} student(s) selected for assignment
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={assignStudents} 
                disabled={selectedStudents.length === 0 || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherEnrollmentManager;