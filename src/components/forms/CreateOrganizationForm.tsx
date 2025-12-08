
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Building2, Globe, Key, Shield, Users, Sparkles, CheckCircle2 } from 'lucide-react';
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
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6">
      {/* Modern Header with Gradient */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 p-6 sm:p-8 border border-primary/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative flex items-center gap-4">
          <div className="p-3 sm:p-4 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-lg shadow-primary/30">
            <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              Create Organization
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Set up your new organization with all the details
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organization Name */}
        <div className="group relative bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-4 sm:p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" />
            </div>
            <Label htmlFor="name" className="text-sm font-semibold text-foreground">
              Organization Name <span className="text-destructive">*</span>
            </Label>
          </div>
          <Input
            id="name"
            placeholder="Enter your organization name..."
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
            aria-invalid={!!errors.name}
            className={`h-11 text-base bg-background/50 border-border/50 focus:border-primary/50 transition-colors ${errors.name ? 'border-destructive' : ''}`}
          />
          <div className="flex justify-between mt-2">
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            <p className="text-xs text-muted-foreground ml-auto">{formData.name.length}/{MAX_NAME_LEN}</p>
          </div>
        </div>

        {/* Type & Enrollment Key Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Organization Type */}
          <div className="group relative bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-4 sm:p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-accent/20 text-accent-foreground">
                <Globe className="h-4 w-4" />
              </div>
              <Label htmlFor="type" className="text-sm font-semibold text-foreground">
                Type <span className="text-destructive">*</span>
              </Label>
            </div>
            <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value as OrganizationCreateData['type'])}>
              <SelectTrigger className="h-11 text-base bg-background/50 border-border/50 focus:border-primary/50">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background border-border">
                <SelectItem value="INSTITUTE" className="cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Institute
                  </span>
                </SelectItem>
                <SelectItem value="GLOBAL" className="cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-accent-foreground" />
                    Global
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Enrollment Key */}
          <div className="group relative bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-4 sm:p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Key className="h-4 w-4" />
              </div>
              <Label htmlFor="enrollmentKey" className="text-sm font-semibold text-foreground">
                Enrollment Key {formData.type === 'INSTITUTE' ? <span className="text-destructive">*</span> : <span className="text-muted-foreground text-xs">(Optional)</span>}
              </Label>
            </div>
            <Input
              id="enrollmentKey"
              placeholder={formData.type === 'INSTITUTE' ? "Enter secret key..." : "Optional key..."}
              value={formData.enrollmentKey}
              onChange={(e) => handleInputChange('enrollmentKey', e.target.value)}
              required={formData.type === 'INSTITUTE'}
              disabled={formData.type !== 'INSTITUTE'}
              aria-invalid={!!errors.enrollmentKey}
              className={`h-11 text-base bg-background/50 border-border/50 focus:border-primary/50 transition-colors disabled:opacity-50 ${errors.enrollmentKey ? 'border-destructive' : ''}`}
            />
            <div className="flex justify-between mt-2">
              {errors.enrollmentKey && <p className="text-xs text-destructive">{errors.enrollmentKey}</p>}
              {formData.type === 'INSTITUTE' && (
                <p className="text-xs text-muted-foreground ml-auto">{formData.enrollmentKey.length}/{MAX_KEY_LEN}</p>
              )}
            </div>
          </div>
        </div>

        {/* Institute Field */}
        {instituteId ? (
          <div className="group relative bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <Label className="text-sm font-semibold text-foreground">Linked Institute</Label>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium text-foreground">{instituteName || instituteId}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This organization will be created under this institute
            </p>
          </div>
        ) : (
          <div className="group relative bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-4 sm:p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                <Building2 className="h-4 w-4" />
              </div>
              <Label htmlFor="instituteId" className="text-sm font-semibold text-foreground">
                Institute ID <span className="text-muted-foreground text-xs">(Optional for Global)</span>
              </Label>
            </div>
            <Input
              id="instituteId"
              placeholder="Enter institute ID if applicable..."
              value={formData.instituteId}
              onChange={(e) => handleInputChange('instituteId', e.target.value)}
              className="h-11 text-base bg-background/50 border-border/50 focus:border-primary/50"
            />
          </div>
        )}

        {/* Organization Image */}
        <div className="group relative bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-4 sm:p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <Label className="text-sm font-semibold text-foreground">
              Organization Image <span className="text-muted-foreground text-xs">(Optional)</span>
            </Label>
          </div>
          <OrganizationImageUpload
            currentImageUrl={formData.imageUrl}
            onImageUpdate={(newImageUrl) => handleInputChange('imageUrl', newImageUrl)}
            organizationName={formData.name}
          />
        </div>

        {/* Settings Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold text-foreground">Organization Settings</h3>
          </div>

          {/* Public Toggle */}
          <div className="group flex items-center justify-between p-4 rounded-xl bg-card/50 border border-border/50 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Globe className="h-4 w-4" />
              </div>
              <div>
                <Label htmlFor="isPublic" className="text-sm font-semibold text-foreground cursor-pointer">
                  Public Organization
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">Anyone can view this organization</p>
              </div>
            </div>
            <Switch
              id="isPublic"
              checked={formData.isPublic}
              onCheckedChange={(checked) => handleInputChange('isPublic', checked)}
            />
          </div>

          {/* Verification Toggle */}
          <div className="group flex items-center justify-between p-4 rounded-xl bg-card/50 border border-border/50 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <Label htmlFor="needEnrollmentVerification" className="text-sm font-semibold text-foreground cursor-pointer">
                  Require Verification
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">New members need approval to join</p>
              </div>
            </div>
            <Switch
              id="needEnrollmentVerification"
              checked={formData.needEnrollmentVerification}
              onCheckedChange={(checked) => handleInputChange('needEnrollmentVerification', checked)}
            />
          </div>

          {/* Enrollments Toggle */}
          <div className="group flex items-center justify-between p-4 rounded-xl bg-card/50 border border-border/50 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <Label htmlFor="enabledEnrollments" className="text-sm font-semibold text-foreground cursor-pointer">
                  Enable Enrollments
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">Allow new members to request to join</p>
              </div>
            </div>
            <Switch
              id="enabledEnrollments"
              checked={formData.enabledEnrollments}
              onCheckedChange={(checked) => handleInputChange('enabledEnrollments', checked)}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-border/50">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="h-11 px-6 text-sm font-medium"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={isLoading}
            className="h-11 px-8 text-sm font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 transition-all duration-300"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Creating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Create Organization
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateOrganizationForm;
