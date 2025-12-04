import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Users, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { enrollmentApi } from '@/api/enrollment.api';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { enhancedCachedClient } from '@/api/enhancedCachedClient';
import { getBaseUrl } from '@/contexts/utils/auth.api';
import { CACHE_TTL } from '@/config/cacheTTL';

interface Student {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  imageUrl?: string;
  dateOfBirth?: string;
}

interface StudentsResponse {
  data: Student[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface AssignSubjectStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssignmentComplete: () => void;
}

const AssignSubjectStudentsDialog: React.FC<AssignSubjectStudentsDialogProps> = ({
  open,
  onOpenChange,
  onAssignmentComplete
}) => {
  const { selectedInstitute, selectedClass, selectedSubject, user } = useAuth();
  const instituteRole = useInstituteRole();
  const { toast } = useToast();
  
  // Check permissions - InstituteAdmin and Teacher only
  const hasPermission = instituteRole === 'InstituteAdmin' || instituteRole === 'Teacher';
  
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);

  const fetchAvailableStudents = async (forceRefresh = false) => {
    if (!selectedInstitute?.id || !selectedClass?.id) return;

    setLoading(true);
    try {
      const data: StudentsResponse = await enhancedCachedClient.get(
        `/institute-users/institute/${selectedInstitute.id}/users/STUDENT/class/${selectedClass.id}`,
        {},
        {
          ttl: CACHE_TTL.STUDENTS,
          forceRefresh,
          userId: user?.id,
          role: instituteRole,
          instituteId: selectedInstitute.id,
          classId: selectedClass.id
        }
      );
      
      setStudents(data.data);
      setDataLoaded(true);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: "Error",
        description: "Failed to load available students",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map(student => student.id));
    }
  };

  const handleAssignStudents = async () => {
    if (!selectedInstitute?.id || !selectedClass?.id || !selectedSubject?.id || selectedStudentIds.length === 0) return;

    setAssigning(true);
    try {
      console.log('🚀 Assigning students to subject using bulk-enroll API:', {
        instituteId: selectedInstitute.id,
        classId: selectedClass.id,
        subjectId: selectedSubject.id,
        subjectName: selectedSubject.name,
        className: selectedClass.name,
        studentIds: selectedStudentIds,
        timestamp: new Date().toISOString()
      });
      
      // Use new bulk-enroll API endpoint
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${getBaseUrl()}/institute-class-subject-students/bulk-enroll`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            instituteId: selectedInstitute.id,
            classId: selectedClass.id,
            subjectId: selectedSubject.id,
            studentIds: selectedStudentIds,
            isActive: true
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Assignment failed:', errorData);
        throw new Error(`Assignment failed: ${errorData.message || 'Unknown error'}`);
      }

      const result = await response.json();
      
      console.log('Subject assignment result:', result);
      
      // Handle response - result is an array of enrollment objects
      if (Array.isArray(result) && result.length > 0) {
        const successCount = result.length;
        const failedCount = selectedStudentIds.length - successCount;
        
        if (failedCount === 0) {
          // All assignments succeeded
          toast({
            title: "Success!",
            description: `Successfully assigned ${successCount} student(s) to ${selectedSubject.name}`
          });
        } else {
          // Some failed
          toast({
            title: "Partial Success",
            description: `${successCount} students assigned successfully, ${failedCount} failed`,
          });
        }
        
        onAssignmentComplete();
        onOpenChange(false);
        setSelectedStudentIds([]);
      } else {
        // Unexpected response format
        toast({
          title: "Assignment Complete",
          description: "Students have been assigned to the subject"
        });
        
        onAssignmentComplete();
        onOpenChange(false);
        setSelectedStudentIds([]);
      }
    } catch (error) {
      console.error('Error assigning students to subject:', error);
      toast({
        title: "Network Error",
        description: "Failed to communicate with the server. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAssigning(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const name = student.name.toLowerCase();
    const email = (student.email || '').toLowerCase();
    return !searchTerm || 
           name.includes(searchTerm.toLowerCase()) || 
           email.includes(searchTerm.toLowerCase());
  });

  useEffect(() => {
    if (open && !dataLoaded && hasPermission && selectedClass?.id) {
      fetchAvailableStudents();
    } else if (open && !hasPermission) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to assign students. This feature is only available for Institute Admins and Teachers.",
        variant: "destructive"
      });
      onOpenChange(false);
    }
  }, [open, dataLoaded, hasPermission, selectedClass?.id]);

  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      setSelectedStudentIds([]);
    }
  }, [open]);

  // Don't render if no subject is selected
  if (!selectedSubject) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Assign Students to Subject
          </DialogTitle>
          <DialogDescription>
            Select students to assign to <strong>{selectedSubject.name}</strong> in <strong>{selectedClass?.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Select All */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleSelectAll}
              disabled={filteredStudents.length === 0}
            >
              {selectedStudentIds.length === filteredStudents.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          {/* Selected Count */}
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {selectedStudentIds.length} Selected
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {filteredStudents.length} Available
            </Badge>
          </div>

          {/* Students List */}
          <ScrollArea className="h-96">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading students...</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Students Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'No students match your search.' : 'No students available.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleStudentToggle(student.id)}
                  >
                    <Checkbox
                      checked={selectedStudentIds.includes(student.id)}
                      onChange={() => handleStudentToggle(student.id)}
                    />
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={student.imageUrl || ''} alt={student.name} />
                      <AvatarFallback>
                        {student.name.split(' ').map(n => n.charAt(0)).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{student.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {student.email || 'No email'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">ID: {student.id}</p>
                      {student.phoneNumber && (
                        <p className="text-sm text-muted-foreground">{student.phoneNumber}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssignStudents}
            disabled={selectedStudentIds.length === 0 || assigning}
          >
            {assigning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign {selectedStudentIds.length} Students
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignSubjectStudentsDialog;