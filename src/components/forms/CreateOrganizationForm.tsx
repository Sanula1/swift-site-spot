
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Building2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { organizationApi, OrganizationCreateData } from '@/api/organization.api';
import { getBaseUrl } from '@/contexts/utils/auth.api';
import OrganizationImageUpload from '@/components/OrganizationImageUpload';

interface CreateOrganizationFormProps {
  onSuccess?: (organization: any) => void;
  onCancel?: () => void;
  instituteId?: string;
  instituteName?: string;
}

const CreateOrganizationForm = ({ onSuccess, onCancel, instituteId, instituteName }: CreateOrganizationFormProps) => {
  const [formData, setFormData] = useState<OrganizationCreateData>({
    name: '',
    type: 'INSTITUTE',
    isPublic: true,
    enrollmentKey: '',
    needEnrollmentVerification: true,
    enabledEnrollments: true,
    imageUrl: '',
    instituteId: instituteId || ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // UX constants
  const MAX_NAME_LEN = 100;
  const MAX_KEY_LEN = 50;

  const [errors, setErrors] = useState<{ name?: string; enrollmentKey?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    const newErrors: { name?: string; enrollmentKey?: string; image?: string } = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Organization name is required';
    } else if (formData.name.trim().length > MAX_NAME_LEN) {
      newErrors.name = `Name must be less than ${MAX_NAME_LEN} characters`;
    }

    if (formData.type === 'INSTITUTE') {
      if (!formData.enrollmentKey?.trim()) {
        newErrors.enrollmentKey = 'Enrollment key is required for institute organizations';
      } else if (formData.enrollmentKey.trim().length > MAX_KEY_LEN) {
        newErrors.enrollmentKey = `Enrollment key must be less than ${MAX_KEY_LEN} characters`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast({ title: 'Please fix the errors', description: 'Check the highlighted fields.', variant: 'destructive' });
      return;
    }

    setErrors({});
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('access_token');
      
      const requestBody = {
        name: formData.name,
        type: formData.type,
        isPublic: formData.isPublic,
        needEnrollmentVerification: formData.needEnrollmentVerification,
        enabledEnrollments: formData.enabledEnrollments,
        enrollmentKey: formData.enrollmentKey || undefined,
        instituteId: formData.instituteId || undefined,
        imageUrl: formData.imageUrl || undefined
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
      
      // Provide specific error messages
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

  const handleInputChange = (field: keyof OrganizationCreateData, value: string | boolean) => {
    setFormData((prev) => {
      let next = { ...prev } as OrganizationCreateData;

      if (field === 'name' && typeof value === 'string') {
        value = (value as string).slice(0, MAX_NAME_LEN);
        setErrors((p) => ({ ...p, name: undefined }));
      }
      if (field === 'enrollmentKey' && typeof value === 'string') {
        value = (value as string).slice(0, MAX_KEY_LEN);
        setErrors((p) => ({ ...p, enrollmentKey: undefined }));
      }
      if (field === 'type') {
        next.type = value as OrganizationCreateData['type'];
        // When switching away from INSTITUTE, clear the key
        if (value !== 'INSTITUTE') {
          next.enrollmentKey = '';
          setErrors((p) => ({ ...p, enrollmentKey: undefined }));
        }
        return next;
      }

      return { ...prev, [field]: value } as OrganizationCreateData;
    });
  };

  return (
    <div className="w-full h-full max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 overflow-y-auto">
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="space-y-1 pb-4 sm:pb-6 px-4 sm:px-6 sticky top-0 bg-card z-10">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-primary/10 rounded-lg shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg sm:text-xl">Organization Details</CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">
                Fill in the information below to create your organization
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-4 sm:px-6 pb-4 sm:pb-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs sm:text-sm font-medium">
                Organization Name *
              </Label>
               <Input
                id="name"
                placeholder="Enter organization name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                aria-invalid={!!errors.name}
                className="h-9 sm:h-10 text-sm"
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-destructive">{errors.name}</p>
                <p className="text-xs text-muted-foreground">{formData.name.length}/{MAX_NAME_LEN}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="space-y-2">
                <Label htmlFor="type" className="text-xs sm:text-sm font-medium">
                  Organization Type *
                </Label>
                <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value as OrganizationCreateData['type'])}>
                  <SelectTrigger className="h-9 sm:h-10 text-sm">
                    <SelectValue placeholder="Select organization type" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-background">
                    <SelectItem value="INSTITUTE">Institute</SelectItem>
                    <SelectItem value="GLOBAL">Global</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="enrollmentKey" className="text-xs sm:text-sm font-medium">
                  Enrollment Key {formData.type === 'INSTITUTE' ? '*' : '(Optional)'}
                </Label>
                 <Input
                  id="enrollmentKey"
                  placeholder={formData.type === 'INSTITUTE' 
                    ? "Enter enrollment key..." 
                    : "Enter enrollment key (optional)"
                  }
                  value={formData.enrollmentKey}
                  onChange={(e) => handleInputChange('enrollmentKey', e.target.value)}
                  required={formData.type === 'INSTITUTE'}
                  disabled={formData.type !== 'INSTITUTE'}
                  aria-invalid={!!errors.enrollmentKey}
                  className="h-9 sm:h-10 text-sm"
                />
                <div className="flex justify-between mt-1">
                  <p className="text-xs text-destructive">{errors.enrollmentKey}</p>
                  {formData.type === 'INSTITUTE' && (
                    <p className="text-xs text-muted-foreground">{formData.enrollmentKey.length}/{MAX_KEY_LEN}</p>
                  )}
                </div>
              </div>
            </div>

            {instituteId ? (
              <div className="space-y-2">
                <Label htmlFor="instituteId" className="text-xs sm:text-sm font-medium">
                  Institute
                </Label>
                <Input
                  id="instituteId"
                  value={instituteName || instituteId}
                  disabled
                  className="bg-muted/50 cursor-not-allowed h-9 sm:h-10 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Organization will be created for this institute
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="instituteId" className="text-xs sm:text-sm font-medium">
                  Institute ID (Optional for GLOBAL type)
                </Label>
                <Input
                  id="instituteId"
                  placeholder="Enter institute ID (optional)"
                  value={formData.instituteId}
                  onChange={(e) => handleInputChange('instituteId', e.target.value)}
                  className="h-9 sm:h-10 text-sm"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-medium">
                Organization Image (Optional)
              </Label>
              <OrganizationImageUpload
                currentImageUrl={formData.imageUrl}
                onImageUpdate={(newImageUrl) => handleInputChange('imageUrl', newImageUrl)}
                organizationName={formData.name}
              />
            </div>

            <div className="space-y-3 sm:space-y-4 pt-2 border-t">
              <div className="flex items-start sm:items-center justify-between gap-4 py-2">
                <div className="flex-1 min-w-0">
                  <Label htmlFor="isPublic" className="text-xs sm:text-sm font-medium cursor-pointer block">
                    Public Organization
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Allow anyone to view this organization
                  </p>
                </div>
                <Switch
                  id="isPublic"
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => handleInputChange('isPublic', checked)}
                  className="shrink-0"
                />
              </div>

              <div className="flex items-start sm:items-center justify-between gap-4 py-2">
                <div className="flex-1 min-w-0">
                  <Label htmlFor="needEnrollmentVerification" className="text-xs sm:text-sm font-medium cursor-pointer block">
                    Require Enrollment Verification
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    New members need approval before joining
                  </p>
                </div>
                <Switch
                  id="needEnrollmentVerification"
                  checked={formData.needEnrollmentVerification}
                  onCheckedChange={(checked) => handleInputChange('needEnrollmentVerification', checked)}
                  className="shrink-0"
                />
              </div>

              <div className="flex items-start sm:items-center justify-between gap-4 py-2">
                <div className="flex-1 min-w-0">
                  <Label htmlFor="enabledEnrollments" className="text-xs sm:text-sm font-medium cursor-pointer block">
                    Enable Enrollments
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Allow new members to request enrollment
                  </p>
                </div>
                <Switch
                  id="enabledEnrollments"
                  checked={formData.enabledEnrollments}
                  onCheckedChange={(checked) => handleInputChange('enabledEnrollments', checked)}
                  className="shrink-0"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="min-w-[100px] h-9 sm:h-10 text-sm"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={isLoading}
                className="min-w-[100px] h-9 sm:h-10 text-sm"
              >
                {isLoading ? "Creating..." : "Create Organization"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateOrganizationForm;
