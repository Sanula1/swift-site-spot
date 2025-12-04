import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { enhancedCachedClient } from '@/api/enhancedCachedClient';
import { CACHE_TTL } from '@/config/cacheTTL';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  IdCard,
  CheckCircle,
  Shield,
  Building
} from 'lucide-react';

interface InstituteProfileData {
  userId: string;
  instituteId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  userType: string;
  status: string;
  userIdByInstitute: string;
  instituteUserImageUrl: string | null;
  instituteCardId: string | null;
  imageVerificationStatus: string;
  imageVerifiedBy: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const InstituteProfile = () => {
  const { currentInstituteId } = useAuth();
  const { toast } = useToast();
  const [profileData, setProfileData] = useState<InstituteProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, [currentInstituteId]);

  const loadProfileData = async () => {
    if (!currentInstituteId) {
      toast({
        title: "Error",
        description: "No institute selected.",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await enhancedCachedClient.get<InstituteProfileData>(
        `/institute-users/institute/${currentInstituteId}/me`,
        {},
        {
          ttl: CACHE_TTL.INSTITUTE_PROFILE,
          forceRefresh: false,
          userId: currentInstituteId
        }
      );
      setProfileData(response);
    } catch (error: any) {
      console.error('Error fetching institute profile:', error);
      toast({
        title: "Error",
        description: "Failed to load institute profile data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No profile data available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    };

    return (
      <Badge className={statusColors[status] || statusColors.PENDING}>
        {status}
      </Badge>
    );
  };

  const getVerificationBadge = (status: string) => {
    const verificationColors: Record<string, string> = {
      VERIFIED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };

    return (
      <Badge className={verificationColors[status] || verificationColors.PENDING}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Section with Modern Design */}
        <div className="relative">
          {/* Decorative Background Elements */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-3xl blur-3xl -z-10" />
          
          <div className="relative bg-gradient-to-br from-card/80 to-card/50 backdrop-blur-xl rounded-3xl border border-border/50 shadow-2xl overflow-hidden">
            {/* Gradient Overlay */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent" />
            
            <div className="relative p-8 md:p-12">
              <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                {/* Profile Image */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-purple-500/30 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <Avatar className="h-32 w-32 md:h-40 md:w-40 ring-4 ring-background shadow-xl">
                      <AvatarImage src={profileData.instituteUserImageUrl || ''} alt="Institute Profile" />
                      <AvatarFallback className="text-3xl font-semibold bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                        {profileData.firstName.charAt(0)}{profileData.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1 text-center md:text-left space-y-4">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text mb-2">
                      {profileData.firstName} {profileData.lastName}
                    </h1>
                    <p className="text-muted-foreground text-base md:text-lg flex items-center justify-center md:justify-start gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-sm">
                        <Shield className="h-3 w-3 mr-1" />
                        {profileData.userType}
                      </Badge>
                      <span>•</span>
                      <span>Member since {new Date(profileData.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                    {getStatusBadge(profileData.status)}
                    {getVerificationBadge(profileData.imageVerificationStatus)}
                  </div>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    {profileData.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                        <Mail className="h-4 w-4" />
                        <span className="hidden sm:inline">{profileData.email}</span>
                      </div>
                    )}
                    {profileData.phoneNumber && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                        <Phone className="h-4 w-4" />
                        <span>{profileData.phoneNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Information Card */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-xl overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl -z-10" />
          <CardHeader className="pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5">
                <Building className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Institute Profile Details</CardTitle>
                <CardDescription className="text-base">
                  Your profile information within the institute
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* User ID */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <IdCard className="h-4 w-4" />
                  User ID
                </div>
                <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center">
                  <p className="font-medium text-sm">{profileData.userId}</p>
                </div>
              </div>

              {/* Institute User ID */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <IdCard className="h-4 w-4" />
                  Institute User ID
                </div>
                <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center">
                  <p className="font-medium">{profileData.userIdByInstitute}</p>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  Email Address
                </div>
                <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{profileData.email}</p>
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </div>
                <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{profileData.phoneNumber}</p>
                </div>
              </div>

              {/* Institute ID */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Building className="h-4 w-4" />
                  Institute ID
                </div>
                <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center">
                  <p className="font-medium text-sm">{profileData.instituteId}</p>
                </div>
              </div>

              {/* Institute Card ID */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <IdCard className="h-4 w-4" />
                  Institute Card ID
                </div>
                <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center">
                  <p className="font-medium">{profileData.instituteCardId || 'Not assigned'}</p>
                </div>
              </div>

              {/* User Type */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  User Type
                </div>
                <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center">
                  <Badge variant="secondary">{profileData.userType}</Badge>
                </div>
              </div>

              {/* Image Verified By */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  Image Verified By
                </div>
                <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center">
                  <p className="font-medium">{profileData.imageVerifiedBy || 'Not verified yet'}</p>
                </div>
              </div>

              {/* Member Since */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Member Since
                </div>
                <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">
                    {new Date(profileData.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Last Updated */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Last Updated
                </div>
                <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">
                    {new Date(profileData.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Active Status */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  Active Status
                </div>
                <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center">
                  <Badge variant={profileData.isActive ? "default" : "secondary"}>
                    {profileData.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InstituteProfile;
