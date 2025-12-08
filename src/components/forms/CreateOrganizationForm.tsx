
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { OrganizationCreateData } from '@/api/organization.api';
import { getBaseUrl } from '@/contexts/utils/auth.api';
import OrganizationImageUpload from '@/components/OrganizationImageUpload';

const organizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  type: z.enum(['INSTITUTE', 'GLOBAL']),
  enrollmentKey: z.string().max(50, 'Enrollment key must be less than 50 characters').optional(),
  isPublic: z.boolean().default(true),
  needEnrollmentVerification: z.boolean().default(true),
  enabledEnrollments: z.boolean().default(true),
  instituteId: z.string().optional()
}).refine((data) => {
  if (data.type === 'INSTITUTE') {
    return data.enrollmentKey && data.enrollmentKey.trim().length > 0;
  }
  return true;
}, {
  message: 'Enrollment key is required for institute organizations',
  path: ['enrollmentKey']
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

interface CreateOrganizationFormProps {
  onSuccess?: (organization: any) => void;
  onCancel?: () => void;
  instituteId?: string;
  instituteName?: string;
}

const CreateOrganizationForm = ({ onSuccess, onCancel, instituteId, instituteName }: CreateOrganizationFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const { toast } = useToast();

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: '',
      type: 'INSTITUTE',
      enrollmentKey: '',
      isPublic: true,
      needEnrollmentVerification: true,
      enabledEnrollments: true,
      instituteId: instituteId || ''
    }
  });

  const watchType = form.watch('type');

  const handleSubmit = async (data: OrganizationFormData) => {
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('access_token');
      
      const requestBody = {
        name: data.name,
        type: data.type,
        isPublic: data.isPublic,
        needEnrollmentVerification: data.needEnrollmentVerification,
        enabledEnrollments: data.enabledEnrollments,
        enrollmentKey: data.enrollmentKey || undefined,
        instituteId: data.instituteId || instituteId || undefined,
        imageUrl: imageUrl || undefined
      };
      
      const response = await fetch(`${getBaseUrl()}/organizations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create organization');
      }
      
      const organization = await response.json();
      
      toast({
        title: "Success",
        description: `Organization "${organization.name}" created successfully`,
      });
      
      if (onSuccess) {
        onSuccess(organization);
      }
    } catch (error) {
      console.error('Error creating organization:', error);
      
      let errorMessage = "Failed to create organization";
      
      if (error instanceof Error) {
        if (error.message.includes("Only Organization Managers, Super Admins, or Institute Admins")) {
          errorMessage = "You don't have permission to create organizations. Please contact your administrator.";
        } else if (error.message.includes("Forbidden")) {
          errorMessage = "Access denied. You need Institute Admin permissions to create organizations.";
        } else if (error.message.includes("already exists")) {
          errorMessage = "An organization with this name already exists.";
        } else if (error.message) {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Cannot Create Organization",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">Add New Organization</h2>
        <p className="text-sm text-muted-foreground">Enter organization information to create a new record</p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Row 1: Name & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Organization Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter organization name" 
                      className="h-9 text-sm"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Organization Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="INSTITUTE">Institute</SelectItem>
                      <SelectItem value="GLOBAL">Global</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>

          {/* Row 2: Enrollment Key & Institute */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="enrollmentKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">
                    Enrollment Key {watchType === 'INSTITUTE' ? '*' : '(Optional)'}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={watchType === 'INSTITUTE' ? "Enter secret key" : "Optional key"} 
                      className="h-9 text-sm"
                      {...field} 
                      disabled={watchType !== 'INSTITUTE'}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {instituteId ? (
              <FormItem>
                <FormLabel className="text-sm">Linked Institute</FormLabel>
                <Input 
                  value={instituteName || instituteId} 
                  disabled 
                  className="h-9 text-sm bg-muted"
                />
              </FormItem>
            ) : (
              <FormField
                control={form.control}
                name="instituteId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Institute ID (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter institute ID" 
                        className="h-9 text-sm"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            )}
          </div>

          {/* Image Upload - Compact */}
          <div>
            <FormLabel className="text-sm">Organization Image (Optional)</FormLabel>
            <div className="mt-1.5">
              <OrganizationImageUpload
                currentImageUrl={imageUrl}
                onImageUpdate={(newImageUrl) => setImageUrl(newImageUrl)}
                organizationName={form.watch('name')}
              />
            </div>
          </div>

          {/* Settings - Compact toggles */}
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <FormLabel className="text-sm font-medium">Public Organization</FormLabel>
                    <p className="text-xs text-muted-foreground">Anyone can view this organization</p>
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

            <FormField
              control={form.control}
              name="needEnrollmentVerification"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <FormLabel className="text-sm font-medium">Require Verification</FormLabel>
                    <p className="text-xs text-muted-foreground">New members need approval to join</p>
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

            <FormField
              control={form.control}
              name="enabledEnrollments"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <FormLabel className="text-sm font-medium">Enable Enrollments</FormLabel>
                    <p className="text-xs text-muted-foreground">Allow new members to join</p>
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
          </div>
          
          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Organization'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default CreateOrganizationForm;
