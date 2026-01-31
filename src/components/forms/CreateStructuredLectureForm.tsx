import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Save, Video, FileText, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { structuredLecturesApi, CreateStructuredLectureDto } from '@/api/structuredLectures.api';

interface CreateStructuredLectureFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateStructuredLectureForm = ({ onClose, onSuccess }: CreateStructuredLectureFormProps) => {
  const { selectedInstitute, selectedClass, selectedSubject, selectedClassGrade } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    lessonNumber: 1,
    lectureNumber: 1,
    lectureVideoUrl: '',
    lectureLink: '',
    documentUrls: '',
    coverImageUrl: '',
    provider: '',
    isActive: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedInstitute?.id || !selectedClass?.id || !selectedSubject?.id) {
      toast({
        title: "Error",
        description: "Please ensure institute, class, and subject are selected",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const payload: CreateStructuredLectureDto = {
        instituteId: selectedInstitute.id,
        classId: selectedClass.id,
        subjectId: selectedSubject.id,
        grade: selectedClassGrade || selectedClass.grade || 10,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        lessonNumber: formData.lessonNumber,
        lectureNumber: formData.lectureNumber,
        lectureVideoUrl: formData.lectureVideoUrl.trim() || undefined,
        lectureLink: formData.lectureLink.trim() || undefined,
        documentUrls: formData.documentUrls.trim() 
          ? formData.documentUrls.split(',').map(url => url.trim()).filter(Boolean)
          : undefined,
        coverImageUrl: formData.coverImageUrl.trim() || undefined,
        provider: formData.provider.trim() || undefined,
        isActive: formData.isActive
      };

      await structuredLecturesApi.create(payload);
      
      toast({
        title: "Success",
        description: "Lecture created successfully"
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating lecture:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create lecture",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Create New Lecture
            </CardTitle>
            <CardDescription>
              Add a new lecture to {selectedSubject?.name} (Grade {selectedClassGrade})
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter lecture title"
                required
              />
            </div>

            <div>
              <Label htmlFor="lessonNumber">Lesson Number</Label>
              <Input
                id="lessonNumber"
                type="number"
                min="1"
                value={formData.lessonNumber}
                onChange={(e) => handleInputChange('lessonNumber', parseInt(e.target.value) || 1)}
              />
            </div>

            <div>
              <Label htmlFor="lectureNumber">Lecture Number</Label>
              <Input
                id="lectureNumber"
                type="number"
                min="1"
                value={formData.lectureNumber}
                onChange={(e) => handleInputChange('lectureNumber', parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter lecture description"
              rows={3}
            />
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Video className="h-4 w-4" />
              Video Content
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lectureVideoUrl">Video URL</Label>
                <Input
                  id="lectureVideoUrl"
                  value={formData.lectureVideoUrl}
                  onChange={(e) => handleInputChange('lectureVideoUrl', e.target.value)}
                  placeholder="https://storage.googleapis.com/..."
                />
              </div>
              <div>
                <Label htmlFor="lectureLink">Meeting/External Link</Label>
                <Input
                  id="lectureLink"
                  value={formData.lectureLink}
                  onChange={(e) => handleInputChange('lectureLink', e.target.value)}
                  placeholder="https://zoom.us/... or external link"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents & Media
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="documentUrls">Document URLs (comma-separated)</Label>
                <Input
                  id="documentUrls"
                  value={formData.documentUrls}
                  onChange={(e) => handleInputChange('documentUrls', e.target.value)}
                  placeholder="url1, url2, url3"
                />
              </div>
              <div>
                <Label htmlFor="coverImageUrl">Cover Image URL</Label>
                <Input
                  id="coverImageUrl"
                  value={formData.coverImageUrl}
                  onChange={(e) => handleInputChange('coverImageUrl', e.target.value)}
                  placeholder="https://storage.googleapis.com/..."
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <div>
              <Label htmlFor="provider">Provider</Label>
              <Input
                id="provider"
                value={formData.provider}
                onChange={(e) => handleInputChange('provider', e.target.value)}
                placeholder="Content provider name"
              />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleInputChange('isActive', checked)}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Creating...' : 'Create Lecture'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateStructuredLectureForm;
