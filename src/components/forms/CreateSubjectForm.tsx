
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { getBaseUrl } from '@/contexts/utils/auth.api';
import { toast } from 'sonner';
import SubjectImageUpload from '@/components/SubjectImageUpload';

const subjectSchema = z.object({
  name: z.string().min(2, 'Subject name must be at least 2 characters'),
  code: z.string().min(1, 'Subject code is required'),
  description: z.string().min(5, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  creditHours: z.number().min(1, 'Credit hours must be at least 1'),
  basketCategory: z.string().min(1, 'Basket category is required'),
  subjectType: z.string().min(1, 'Subject type is required'),
  instituteType: z.string().min(1, 'Institute type is required'),
  isActive: z.boolean().default(true),
  image: z.any().optional()
});

type SubjectFormData = z.infer<typeof subjectSchema>;

interface CreateSubjectFormProps {
  onSubmit: (data: SubjectFormData) => void;
  onCancel: () => void;
  initialData?: any;
}

const CreateSubjectForm = ({ onSubmit, onCancel, initialData }: CreateSubjectFormProps) => {
  const isEditing = !!initialData;
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>(initialData?.imgUrl || '');
  const { selectedInstitute, currentInstituteId, user } = useAuth();
  
  // Check if user has permission (only SuperAdmin and InstituteAdmin)
  const userRole = useInstituteRole();
  const hasPermission = user?.role === 'SystemAdmin' || userRole === 'InstituteAdmin';
  
  const form = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: initialData?.name || '',
      code: initialData?.code || '',
      description: initialData?.description || '',
      category: initialData?.category || '',
      creditHours: initialData?.creditHours || 1,
      basketCategory: initialData?.basketCategory || 'COMMON',
      subjectType: initialData?.subjectType || 'MAIN',
      instituteType: initialData?.instituteType || 'school',
      isActive: initialData?.isActive ?? true
    }
  });

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

  const handleImageUpload = (imageUrl: string) => {
    setImagePreviewUrl(imageUrl);
  };

  const handleImageRemove = () => {
    setImagePreviewUrl('');
  };

  const handleSubmit = async (data: SubjectFormData) => {
    if (!selectedInstitute || !currentInstituteId) {
      toast.error('Please select an institute first');
      return;
    }

    if (!hasPermission) {
      toast.error('You do not have permission to create subjects');
      return;
    }

    setIsLoading(true);
    
    try {
      if (!isEditing) {
        // Use direct API call for creating subjects with JSON body (image URL already uploaded)
        const baseUrl = getBaseUrl();
        const token = getAuthToken();
        
        const requestBody = {
          code: data.code,
          name: data.name,
          description: data.description,
          category: data.category,
          creditHours: data.creditHours,
          isActive: data.isActive,
          subjectType: data.subjectType,
          instituteType: data.instituteType,
          instituteId: currentInstituteId,
          basketCategory: data.basketCategory,
          imgUrl: imagePreviewUrl || undefined
        };

        console.log('Submitting subject data:', requestBody);
        
        const response = await fetch(`${baseUrl}/subjects`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to create subject');
        }
        
        const result = await response.json();
        console.log('Subject created successfully:', result);
        
        toast.success('Subject created successfully!');
        onSubmit(data);
      } else {
        onSubmit(data);
      }
    } catch (error: any) {
      console.error('Error creating subject:', error);
      toast.error(error?.message || 'Failed to create subject');
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasPermission) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>Only SuperAdmin and InstituteAdmin can create subjects.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Subject' : 'Add New Subject'}</CardTitle>
        <CardDescription>{isEditing ? 'Update subject information' : 'Enter subject information to create a new record'}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Mathematics" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Code</FormLabel>
                    <FormControl>
                      <Input placeholder="MATH101" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Core">Core Subject</SelectItem>
                        <SelectItem value="Elective">Elective</SelectItem>
                        <SelectItem value="Optional">Optional</SelectItem>
                        <SelectItem value="Mandatory">Mandatory</SelectItem>
                        <SelectItem value="Mathematics">Mathematics</SelectItem>
                        <SelectItem value="Science">Science</SelectItem>
                        <SelectItem value="Languages">Languages</SelectItem>
                        <SelectItem value="Arts">Arts</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="basketCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Basket Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select basket category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="COMMON">Common</SelectItem>
                        <SelectItem value="SCIENCE">Science</SelectItem>
                        <SelectItem value="COMMERCE">Commerce</SelectItem>
                        <SelectItem value="ARTS">Arts</SelectItem>
                        <SelectItem value="TECHNOLOGY">Technology</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="subjectType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MAIN">Main Subject</SelectItem>
                        <SelectItem value="OPTIONAL">Optional Subject</SelectItem>
                        <SelectItem value="EXTRA">Extra Curricular</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="instituteType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Institute Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select institute type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="school">School</SelectItem>
                        <SelectItem value="university">University</SelectItem>
                        <SelectItem value="college">College</SelectItem>
                        <SelectItem value="institute">Institute</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="creditHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credit Hours</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="3" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Subject description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2">
              <FormLabel>Subject Image (Optional)</FormLabel>
              <SubjectImageUpload
                value={imagePreviewUrl}
                onChange={handleImageUpload}
                onRemove={handleImageRemove}
              />
            </div>
            
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Enable this subject for students
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : (isEditing ? 'Update Subject' : 'Create Subject')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CreateSubjectForm;
