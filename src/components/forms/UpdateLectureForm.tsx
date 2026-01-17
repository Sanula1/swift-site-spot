import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Save, Video, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { lectureApi } from '@/api/lecture.api';

interface UpdateLectureFormProps {
  lecture: any;
  onClose: () => void;
  onSuccess: () => void;
}

const UpdateLectureForm = ({ lecture, onClose, onSuccess }: UpdateLectureFormProps) => {
  const userRole = useInstituteRole();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Check if user has permission to update lectures
  const canUpdate = userRole === 'InstituteAdmin' || userRole === 'Teacher';

  if (!canUpdate) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>You don't have permission to update lectures.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onClose} className="w-full">Close</Button>
        </CardContent>
      </Card>
    );
  }
  
  const pad = (n: number) => String(n).padStart(2, '0');
  const toInputDateTime = (value: any): string => {
    if (!value) return '';
    try {
      const d = value instanceof Date ? value : new Date(value);
      if (isNaN(d.getTime())) return '';
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return '';
    }
  };

  const [formData, setFormData] = useState({
    title: lecture.title || '',
    description: lecture.description || '',
    lectureType: lecture.lectureType || 'online',
    venue: lecture.venue || '',
    startTime: toInputDateTime(lecture.startTime),
    endTime: toInputDateTime(lecture.endTime),
    status: lecture.status || 'scheduled',
    meetingLink: lecture.meetingLink || '',
    meetingId: lecture.meetingId || '',
    meetingPassword: lecture.meetingPassword || '',
    recordingUrl: lecture.recordingUrl || '',
    isRecorded: lecture.isRecorded ?? false,
    maxParticipants: lecture.maxParticipants || 50,
    isActive: lecture.isActive ?? true
  });


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        venue: formData.venue || null,
        startTime: formData.startTime ? new Date(formData.startTime).toISOString() : null,
        endTime: formData.endTime ? new Date(formData.endTime).toISOString() : null,
        status: formData.status,
        meetingLink: formData.meetingLink || null,
        meetingId: formData.meetingId || null,
        meetingPassword: formData.meetingPassword || null,
        recordingUrl: formData.recordingUrl || null,
        isRecorded: formData.isRecorded,
        maxParticipants: formData.maxParticipants,
        isActive: formData.isActive
      };

      console.log('Updating lecture with payload:', payload);

      await lectureApi.updateLecture(lecture.id, payload, {
        instituteId: lecture.instituteId,
        classId: lecture.classId,
        subjectId: lecture.subjectId
      });
      
      toast({
        title: "Success",
        description: "Lecture updated successfully"
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating lecture:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update lecture",
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
            <CardTitle>Update Lecture</CardTitle>
            <CardDescription>Update lecture details and information</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
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
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="live">Live</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter lecture description"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  value={formData.venue}
                  onChange={(e) => handleInputChange('venue', e.target.value)}
                  placeholder="Enter venue"
                />
              </div>
              <div>
                <Label htmlFor="maxParticipants">Max Participants</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  value={formData.maxParticipants}
                  onChange={(e) => handleInputChange('maxParticipants', parseInt(e.target.value))}
                  min="1"
                />
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-medium">Meeting Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="meetingLink">Meeting Link</Label>
                  <Input
                    id="meetingLink"
                    value={formData.meetingLink}
                    onChange={(e) => handleInputChange('meetingLink', e.target.value)}
                    placeholder="https://meet.example.com/..."
                  />
                </div>
                <div>
                  <Label htmlFor="meetingId">Meeting ID</Label>
                  <Input
                    id="meetingId"
                    value={formData.meetingId}
                    onChange={(e) => handleInputChange('meetingId', e.target.value)}
                    placeholder="Meeting ID"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="meetingPassword">Meeting Password</Label>
                  <Input
                    id="meetingPassword"
                    value={formData.meetingPassword}
                    onChange={(e) => handleInputChange('meetingPassword', e.target.value)}
                    placeholder="Meeting password"
                  />
                </div>
                <div>
                  <Label htmlFor="recordingUrl">Recording URL</Label>
                  <Input
                    id="recordingUrl"
                    value={formData.recordingUrl}
                    onChange={(e) => handleInputChange('recordingUrl', e.target.value)}
                    placeholder="Recording URL"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isRecorded"
                    checked={formData.isRecorded}
                    onChange={(e) => handleInputChange('isRecorded', e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="isRecorded">Session is recorded</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="isActive">Lecture is active</Label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Updating...' : 'Update Lecture'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
  );
};

export default UpdateLectureForm;
