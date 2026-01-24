import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExternalLink, Calendar, Clock, BookOpen, User, Building, GraduationCap } from 'lucide-react';
import { HomeworkReferencesSection } from '@/components/homework/index';

interface HomeworkDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  homework: any;
}

const HomeworkDetailsDialog = ({ isOpen, onClose, homework }: HomeworkDetailsDialogProps) => {
  if (!homework) return null;

  const formatDate = (dateString: string) => {
    return dateString ? new Date(dateString).toLocaleDateString() : 'N/A';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Homework Details
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {homework.title}
            </h3>
            
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h4>
              <p className="text-gray-600 dark:text-gray-400">
                {homework.description || 'No description provided'}
              </p>
            </div>

            {homework.instructions && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Instructions</h4>
                <p className="text-blue-600 dark:text-blue-400">
                  {homework.instructions}
                </p>
              </div>
            )}
          </div>

          {/* Context Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {homework.institute && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Building className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Institute</p>
                  <p className="font-medium text-gray-700 dark:text-gray-300">
                    {homework.institute.name}
                  </p>
                </div>
              </div>
            )}

            {homework.class && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <GraduationCap className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Class</p>
                  <p className="font-medium text-gray-700 dark:text-gray-300">
                    {homework.class.name}
                  </p>
                </div>
              </div>
            )}

            {homework.subject && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <BookOpen className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Subject</p>
                  <p className="font-medium text-gray-700 dark:text-gray-300">
                    {homework.subject.name}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Teacher Information */}
          {homework.teacher && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <User className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Teacher</p>
                <p className="font-medium text-gray-700 dark:text-gray-300">
                  {homework.teacher.name || homework.teacher.email}
                </p>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Calendar className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-green-600 dark:text-green-400">Start Date</p>
                <p className="font-medium text-green-700 dark:text-green-300">
                  {formatDate(homework.startDate)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <Clock className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-xs text-red-600 dark:text-red-400">Due Date</p>
                <p className="font-medium text-red-700 dark:text-red-300">
                  {formatDate(homework.endDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-3">
            {homework.maxMarks && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Maximum Marks:</span>
                <Badge variant="outline">{homework.maxMarks}</Badge>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <Badge variant={homework.isActive ? 'default' : 'secondary'}>
                {homework.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            {homework.referenceLink && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Reference Link:</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(homework.referenceLink, '_blank')}
                  className="flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open Link
                </Button>
              </div>
            )}

            {homework.attachmentUrl && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Attachment:</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(homework.attachmentUrl, '_blank')}
                  className="flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Download
                </Button>
              </div>
            )}
          </div>

          {/* Reference Materials Section */}
          {homework.id && (
            <HomeworkReferencesSection 
              homeworkId={homework.id} 
              initialReferences={homework.references}
              editable={false}
            />
          )}

          {/* Timestamps */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <span className="font-medium">Created:</span>
                <br />
                {homework.createdAt ? new Date(homework.createdAt).toLocaleString() : 'N/A'}
              </div>
              <div>
                <span className="font-medium">Updated:</span>
                <br />
                {homework.updatedAt ? new Date(homework.updatedAt).toLocaleString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default HomeworkDetailsDialog;