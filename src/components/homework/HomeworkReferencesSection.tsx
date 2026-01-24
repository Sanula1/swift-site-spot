import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Loader2, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { 
  homeworkReferencesApi, 
  HomeworkReference, 
  ReferenceSummary 
} from '@/api/homeworkReferences.api';
import HomeworkReferenceList from './HomeworkReferenceList';
import AddReferenceDialog from './AddReferenceDialog';

interface HomeworkReferencesSectionProps {
  homeworkId: string;
  /** Initial references if already loaded with homework */
  initialReferences?: HomeworkReference[];
  /** Whether to show add/edit controls */
  editable?: boolean;
}

const HomeworkReferencesSection: React.FC<HomeworkReferencesSectionProps> = ({
  homeworkId,
  initialReferences,
  editable: editableProp,
}) => {
  const { toast } = useToast();
  const instituteRole = useInstituteRole();
  
  const [references, setReferences] = useState<HomeworkReference[]>(initialReferences || []);
  const [summary, setSummary] = useState<ReferenceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(!initialReferences);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Determine if user can edit
  const canEdit = editableProp ?? (instituteRole === 'InstituteAdmin' || instituteRole === 'Teacher');

  const fetchReferences = async () => {
    setIsLoading(true);
    try {
      const [refsData, summaryData] = await Promise.all([
        homeworkReferencesApi.getReferencesByHomework(homeworkId),
        homeworkReferencesApi.getReferenceSummary(homeworkId),
      ]);
      setReferences(refsData);
      setSummary(summaryData);
    } catch (error: any) {
      console.error('Failed to fetch references:', error);
      toast({
        title: 'Failed to load references',
        description: error.message || 'Could not load reference materials',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialReferences) {
      fetchReferences();
    }
  }, [homeworkId]);

  const handleAddSuccess = (newReference: HomeworkReference) => {
    setReferences(prev => [...prev, newReference]);
    if (summary) {
      setSummary({
        ...summary,
        total: summary.total + 1,
        byType: {
          ...summary.byType,
          [newReference.referenceType]: (summary.byType[newReference.referenceType] || 0) + 1,
        },
        bySource: {
          ...summary.bySource,
          [newReference.referenceSource]: (summary.bySource[newReference.referenceSource] || 0) + 1,
        },
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await homeworkReferencesApi.deleteReference(id);
      setReferences(prev => prev.filter(ref => ref.id !== id));
      toast({
        title: 'Reference deleted',
        description: 'The reference has been removed',
      });
      // Refresh summary
      const summaryData = await homeworkReferencesApi.getReferenceSummary(homeworkId);
      setSummary(summaryData);
    } catch (error: any) {
      console.error('Failed to delete reference:', error);
      toast({
        title: 'Delete failed',
        description: error.message || 'Could not delete reference',
        variant: 'destructive',
      });
    }
  };

  const handleReorder = async (referenceIds: string[]) => {
    try {
      await homeworkReferencesApi.reorderReferences(homeworkId, referenceIds);
      // Reorder local state
      const reorderedRefs = referenceIds
        .map(id => references.find(r => r.id === id))
        .filter(Boolean) as HomeworkReference[];
      setReferences(reorderedRefs);
    } catch (error: any) {
      console.error('Failed to reorder references:', error);
      toast({
        title: 'Reorder failed',
        description: error.message || 'Could not reorder references',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Reference Materials</CardTitle>
            {summary && summary.total > 0 && (
              <Badge variant="secondary">{summary.total}</Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchReferences}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            
            {canEdit && (
              <Button
                size="sm"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            )}
          </div>
        </div>

        {/* Summary badges */}
        {summary && summary.total > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(summary.byType)
              .filter(([_, count]) => count > 0)
              .map(([type, count]) => (
                <Badge key={type} variant="outline" className="text-xs">
                  {type}: {count}
                </Badge>
              ))}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <HomeworkReferenceList
            references={references}
            isEditable={canEdit}
            onDelete={handleDelete}
            onReorder={handleReorder}
          />
        )}
      </CardContent>

      {/* Add Reference Dialog */}
      <AddReferenceDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        homeworkId={homeworkId}
        onSuccess={handleAddSuccess}
      />
    </Card>
  );
};

export default HomeworkReferencesSection;
