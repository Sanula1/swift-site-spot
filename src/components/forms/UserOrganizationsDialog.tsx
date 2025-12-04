import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Calendar, Shield, AlertCircle } from 'lucide-react';

interface Organization {
  organizationId: string;
  name: string;
}

interface OrganizationEnrollment {
  organization: Organization;
  role: string;
  status: string;
  enrolledDate: string;
}

interface UserOrganizationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

export default function UserOrganizationsDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: UserOrganizationsDialogProps) {
  const { toast } = useToast();
  const { currentInstituteId } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationEnrollment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && userId && currentInstituteId) {
      fetchOrganizations();
    }
  }, [open, userId, currentInstituteId]);

  const fetchOrganizations = async () => {
    if (!currentInstituteId || !userId) return;

    setLoading(true);
    try {
      const response = await apiClient.get<OrganizationEnrollment[]>(
        `/organizations/institute/${currentInstituteId}/student/${userId}`
      );
      setOrganizations(response || []);
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to load organizations',
        variant: 'destructive',
        duration: 2000,
      });
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return 'default';
      case 'MEMBER':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'verified':
        return 'default';
      case 'unverified':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organizations - {userName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              Loading organizations...
            </div>
          ) : organizations.length === 0 ? (
            <div className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No organizations found</p>
              <p className="text-sm text-muted-foreground mt-1">
                This user is not enrolled in any organizations
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {organizations.map((enrollment, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold text-lg">
                          {enrollment.organization.name}
                        </h3>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 items-center text-sm">
                        <div className="flex items-center gap-1">
                          <Shield className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Role:</span>
                          <Badge variant={getRoleBadgeVariant(enrollment.role)}>
                            {enrollment.role}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Status:</span>
                          <Badge variant={getStatusBadgeVariant(enrollment.status)}>
                            {enrollment.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Enrolled:</span>
                        <span>
                          {new Date(enrollment.enrolledDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Organization ID: {enrollment.organization.organizationId}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
