import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { RefreshCw, Users, Award, Calendar, FileText, Search } from 'lucide-react';
import { examResultsApi, type ExamResult, type ExamResultsResponse } from '@/api/examResults.api';

interface ExamResultsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  exam: {
    id: string;
    title: string;
    examType: string;
    totalMarks: string;
    passingMarks: string;
  } | null;
}

export const ExamResultsDialog = ({ isOpen, onClose, exam }: ExamResultsDialogProps) => {
  const { user, currentInstituteId, currentClassId, currentSubjectId, selectedInstitute, selectedClass, selectedSubject } = useAuth();
  const userRole = useInstituteRole();
  const { toast } = useToast();
  
  const [results, setResults] = useState<ExamResult[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadExamResults = async () => {
    if (!exam || !currentInstituteId || !currentClassId || !currentSubjectId) {
      toast({
        title: "Error",
        description: "Missing required selection data",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const params = {
        page: 1,
        limit: 10,
        instituteId: currentInstituteId,
        classId: currentClassId,
        subjectId: currentSubjectId,
        examId: exam.id,
        userId: user?.id,
        role: userRole
      };

      const response = await examResultsApi.getExamResults(params, true);
      
      setResults(response.data);
      setMeta(response.meta);
      setHasLoaded(true);
      
      toast({
        title: "Results Loaded",
        description: `Successfully loaded ${response.data.length} exam results`
      });
      
    } catch (error) {
      console.error('Error loading exam results:', error);
      toast({
        title: "Error",
        description: "Failed to load exam results",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'B+':
      case 'B':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'C+':
      case 'C':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'F':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getPassStatus = (score: string, passingMarks: string) => {
    const numScore = parseFloat(score);
    const numPassing = parseFloat(passingMarks);
    return numScore >= numPassing;
  };

  // Filter results based on search term
  const filteredResults = results.filter(result => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      result.student.firstName.toLowerCase().includes(searchLower) ||
      result.student.lastName.toLowerCase().includes(searchLower) ||
      result.student.email.toLowerCase().includes(searchLower) ||
      result.grade.toLowerCase().includes(searchLower) ||
      (result.remarks && result.remarks.toLowerCase().includes(searchLower))
    );
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Exam Results: {exam?.title}
          </DialogTitle>
        </DialogHeader>

        {/* Context Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Current Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Institute: {selectedInstitute?.name}</Badge>
                  <Badge variant="outline">Class: {selectedClass?.name}</Badge>
                  <Badge variant="outline">Subject: {selectedSubject?.name}</Badge>
                </div>
              </div>
              {exam && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Type: {exam.examType}</Badge>
                    <Badge variant="outline">Total: {exam.totalMarks} marks</Badge>
                    <Badge variant="outline">Passing: {exam.passingMarks} marks</Badge>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Load Results Button */}
        {!hasLoaded && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Click the button below to load exam results for this exam
            </p>
            <Button 
              onClick={loadExamResults}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading Results...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  Load Exam Results
                </>
              )}
            </Button>
          </div>
        )}

        {/* Results Table */}
        {hasLoaded && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Student Results ({results.length} students)
                {meta && (
                  <Badge variant="outline" className="ml-2">
                    Page {meta.page} of {meta.totalPages} (Total: {meta.total})
                  </Badge>
                )}
              </CardTitle>
              
              {/* Search Bar */}
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search students, grade, remarks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredResults.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No results match your search criteria' : 'No results found for this exam'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Pass/Fail</TableHead>
                        <TableHead>Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResults.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium">
                            {result.student.firstName} {result.student.lastName}
                          </TableCell>
                          <TableCell>{result.student.email}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{result.score}</span>
                              <span className="text-muted-foreground">/ {exam?.totalMarks}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getGradeColor(result.grade)}>
                              {result.grade}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {exam && (
                              <Badge 
                                variant={getPassStatus(result.score, exam.passingMarks) ? "default" : "destructive"}
                              >
                                {getPassStatus(result.score, exam.passingMarks) ? "Pass" : "Fail"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{result.remarks || "No remarks"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          {hasLoaded && (
            <Button 
              variant="outline" 
              onClick={loadExamResults}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};