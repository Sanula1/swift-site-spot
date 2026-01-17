import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth, type UserRole } from '@/contexts/AuthContext';
import { AccessControl } from '@/utils/permissions';
import ProfileImageUpload from '@/components/ProfileImageUpload';
import { enhancedCachedClient } from '@/api/enhancedCachedClient';
import { apiClient } from '@/api/client'; // For POST operations
import { CACHE_TTL } from '@/config/cacheTTL';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Phone, MapPin, Calendar, Shield, Edit, Save, X, Lock, Download, FileText, CreditCard, Eye, EyeOff, Camera, Briefcase, GraduationCap, Globe, Languages } from 'lucide-react';
import { useInstituteRole } from '@/hooks/useInstituteRole';
interface UserData {
  id: string;
  nameWithInitials: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  userType: string;
  dateOfBirth: string;
  gender: string;
  nic: string;
  birthCertificateNo: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  province: string;
  postalCode: string;
  country: string;
  imageUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Parent/Professional data
  occupation: string;
  workplace: string;
  workPhone: string;
  educationLevel: string;
  // Account data
  subscriptionPlan: string;
  language: string;
}
const Profile = () => {
  const {
    user,
    logout
  } = useAuth();
  const instituteRole = useInstituteRole();
  const {
    toast
  } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    nameWithInitials: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    nic: '',
    birthCertificateNo: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    district: '',
    province: '',
    postalCode: '',
    country: '',
    joinDate: '',
    // Parent/Professional data
    occupation: '',
    workplace: '',
    workPhone: '',
    educationLevel: '',
    // Account data
    subscriptionPlan: '',
    language: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmNewPassword: false
  });
  const [activeProfileTab, setActiveProfileTab] = useState('details');
  const userPermissions = AccessControl.getPermissions(instituteRole);

  // Load user data from /auth/me endpoint
  const loadUserData = async () => {
    setLoading(true);
    try {
      console.log('Fetching user data from /auth/me');
      const response = await apiClient.get<{ success: boolean; data: any }>('/auth/me');
      console.log('User data response:', response);
      
      if (response.success && response.data) {
        const userData = response.data;
        setUserData({
          id: userData.id || '',
          nameWithInitials: userData.nameWithInitials || '',
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: userData.email || '',
          phone: userData.phoneNumber || '',
          userType: userData.userType || '',
          dateOfBirth: userData.dateOfBirth || '',
          gender: userData.gender || '',
          nic: userData.nic || '',
          birthCertificateNo: userData.birthCertificateNo || '',
          addressLine1: userData.addressLine1 || '',
          addressLine2: userData.addressLine2 || '',
          city: userData.city || '',
          district: userData.district || '',
          province: userData.province || '',
          postalCode: userData.postalCode || '',
          country: userData.country || '',
          imageUrl: userData.imageUrl || '',
          isActive: userData.isActive ?? true,
          createdAt: userData.createdAt || '',
          updatedAt: userData.updatedAt || '',
          // Parent/Professional data
          occupation: userData.occupation || '',
          workplace: userData.workplace || '',
          workPhone: userData.workPhone || '',
          educationLevel: userData.educationLevel || '',
          // Account data
          subscriptionPlan: userData.subscriptionPlan || '',
          language: userData.language || ''
        });

        // Update form data with API response
        setFormData({
          name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
          nameWithInitials: userData.nameWithInitials || '',
          email: userData.email || '',
          phone: userData.phoneNumber || '',
          dateOfBirth: userData.dateOfBirth || '',
          gender: userData.gender || '',
          nic: userData.nic || '',
          birthCertificateNo: userData.birthCertificateNo || '',
          addressLine1: userData.addressLine1 || '',
          addressLine2: userData.addressLine2 || '',
          city: userData.city || '',
          district: userData.district || '',
          province: userData.province || '',
          postalCode: userData.postalCode || '',
          country: userData.country || '',
          joinDate: userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : '',
          // Parent/Professional data
          occupation: userData.occupation || '',
          workplace: userData.workplace || '',
          workPhone: userData.workPhone || '',
          educationLevel: userData.educationLevel || '',
          // Account data
          subscriptionPlan: userData.subscriptionPlan || '',
          language: userData.language || ''
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Error",
        description: "Failed to load user profile data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-load user data on mount
  React.useEffect(() => {
    loadUserData();
  }, []);
  const handleSave = () => {
    // Save logic would go here
    console.log('Saving profile:', formData);
    setIsEditing(false);
  };
  const handleCancel = () => {
    if (userData) {
      setFormData({
        name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
        nameWithInitials: userData.nameWithInitials || '',
        email: userData.email || '',
        phone: userData.phone || '',
        dateOfBirth: userData.dateOfBirth || '',
        gender: userData.gender || '',
        nic: userData.nic || '',
        birthCertificateNo: userData.birthCertificateNo || '',
        addressLine1: userData.addressLine1 || '',
        addressLine2: userData.addressLine2 || '',
        city: userData.city || '',
        district: userData.district || '',
        province: userData.province || '',
        postalCode: userData.postalCode || '',
        country: userData.country || '',
        joinDate: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '',
        occupation: userData.occupation || '',
        workplace: userData.workplace || '',
        workPhone: userData.workPhone || '',
        educationLevel: userData.educationLevel || '',
        subscriptionPlan: userData.subscriptionPlan || '',
        language: userData.language || ''
      });
    }
    setIsEditing(false);
  };
  const handleImageUpdate = (newImageUrl: string) => {
    if (userData) {
      setUserData({
        ...userData,
        imageUrl: newImageUrl
      });
    }
    console.log('Profile image updated:', newImageUrl);
  };

  const validatePassword = (password: string): boolean => {
    // More permissive validation - just check length and basic requirements
    if (password.length < 8 || password.length > 20) return false;
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password); // Any non-alphanumeric character
    return hasLowercase && hasUppercase && hasNumber && hasSpecial;
  };

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmNewPassword) {
      toast({
        title: "Error",
        description: "All password fields are required.",
        variant: "destructive"
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      toast({
        title: "Error", 
        description: "New passwords do not match.",
        variant: "destructive"
      });
      return;
    }

    if (!validatePassword(passwordData.newPassword)) {
      toast({
        title: "Error",
        description: "Password must be 8-20 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        variant: "destructive"
      });
      return;
    }

    setPasswordLoading(true);
    try {
      // Use direct fetch to bypass apiClient's automatic 401/logout handling
      const baseUrl = import.meta.env.VITE_LMS_BASE_URL || 'https://lmsapi.suraksha.lk';
      
      // Get the fresh token from localStorage (set during login)
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        toast({
          title: "Error",
          description: "Please login again to change your password.",
          variant: "destructive"
        });
        await logout();
        return;
      }

      console.log('🔐 Attempting password change with token:', token.substring(0, 20) + '...');
      
      // Try v2 endpoint first (matches login endpoint pattern), fallback to v1
      let response = await fetch(`${baseUrl}/v2/auth/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          confirmNewPassword: passwordData.confirmNewPassword
        })
      });

      // If v2 endpoint returns 404, try v1 endpoint
      if (response.status === 404) {
        console.log('🔄 v2 endpoint not found, trying v1...');
        response = await fetch(`${baseUrl}/auth/change-password`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword,
            confirmNewPassword: passwordData.confirmNewPassword
          })
        });
      }

      const data = await response.json();
      console.log('🔐 Password change response:', response.status, data);

      if (response.ok && (data.success !== false || data.isSuccess || data.message === "Password changed successfully")) {
        // Show success popup - title MUST contain "Success" for toast filter
        toast({
          title: "Success",
          description: "✅ Your Password Changed Successfully! You will be logged out now.",
        });
        
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: ''
        });
        
        // Auto logout after 2 seconds
        setTimeout(async () => {
          await logout();
        }, 2000);
      } else if (response.status === 401) {
        // 401 could mean: wrong current password OR expired token
        const errorMessage = data.details?.message || data.message || "Invalid current password or session expired. Please check your current password or login again.";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      } else {
        // Handle other error responses
        const errorMessage = data.message || data.details?.message || "Failed to change password. Please check your current password.";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Password change error:', error);
      toast({
        title: "Error",
        description: "Failed to change password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Use the imageUrl from API response
  const currentImageUrl = userData?.imageUrl || '';
  const userTypeDisplay = userData?.userType || user?.userType || 'USER';
  
  const getUserInitials = () => {
    if (!user) return 'U';
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U';
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
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
                {/* Profile Image with Edit Button Overlay */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-purple-500/30 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <Avatar className="h-32 w-32 md:h-40 md:w-40 ring-4 ring-background shadow-xl">
                      <AvatarImage src={currentImageUrl || ''} alt="Profile" />
                      <AvatarFallback className="text-3xl font-semibold bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    {/* Edit Button Overlay */}
                    <Button
                      size="sm"
                      className="absolute bottom-2 right-2 h-10 w-10 rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-all duration-300"
                      onClick={() => document.querySelector<HTMLButtonElement>('[aria-label="change-photo"]')?.click()}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                  {/* Hidden ProfileImageUpload */}
                  <div className="hidden">
                    <ProfileImageUpload 
                      currentImageUrl={currentImageUrl} 
                      onImageUpdate={handleImageUpdate} 
                    />
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1 text-center md:text-left space-y-4">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text mb-2">
                      {formData.name || "Welcome"}
                    </h1>
                    <p className="text-muted-foreground text-base md:text-lg flex items-center justify-center md:justify-start gap-2">
                      <Badge variant="secondary" className="text-sm">
                        <Shield className="h-3 w-3 mr-1" />
                        {userTypeDisplay}
                      </Badge>
                      {formData.joinDate && (
                        <>
                          <span>•</span>
                          <span>Member since {formData.joinDate}</span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                    {formData.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                        <Mail className="h-4 w-4" />
                        <span className="hidden sm:inline">{formData.email}</span>
                      </div>
                    )}
                    {formData.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                        <Phone className="h-4 w-4" />
                        <span>{formData.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      disabled
                      className="gap-2 opacity-60 cursor-not-allowed"
                    >
                      <Lock className="h-4 w-4" />
                      Edit Profile
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <Tabs value={activeProfileTab} onValueChange={setActiveProfileTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-auto p-1.5 bg-gradient-to-r from-muted/50 to-muted/30 backdrop-blur-sm rounded-xl border border-border/50">
              <TabsTrigger 
                value="details" 
                className="data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-primary py-3 px-4 text-sm font-medium transition-all rounded-lg"
              >
                <User className="h-4 w-4 mr-2 inline" />
                <span className="hidden sm:inline">Details</span>
                <span className="sm:hidden">Info</span>
              </TabsTrigger>
              <TabsTrigger 
                value="change-password" 
                className="data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:text-primary py-3 px-4 text-sm font-medium transition-all rounded-lg"
              >
                <Lock className="h-4 w-4 mr-2 inline" />
                <span className="hidden sm:inline">Security</span>
                <span className="sm:hidden">Sec</span>
              </TabsTrigger>
            </TabsList>
              
              <TabsContent value="details" className="space-y-6">
                {/* Basic Information Card */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-xl overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl -z-10" />
                  <CardHeader className="pb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl">User Information</CardTitle>
                        <CardDescription className="text-base">
                          Enter the required information below to register
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Name with Initials */}
                      <div className="space-y-2.5">
                        <Label htmlFor="nameWithInitials" className="text-sm font-semibold">Name with Initials</Label>
                        {isEditing ? (
                          <Input 
                            id="nameWithInitials" 
                            value={formData.nameWithInitials} 
                            onChange={e => setFormData({...formData, nameWithInitials: e.target.value})} 
                            placeholder="e.g., J. Doe"
                            className="h-12 text-base border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" 
                          />
                        ) : (
                          <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center">
                            <p className="font-medium">{formData.nameWithInitials || 'Not set'}</p>
                          </div>
                        )}
                      </div>

                      {/* Full Name */}
                      <div className="space-y-2.5">
                        <Label htmlFor="name" className="text-sm font-semibold">Full Name</Label>
                        {isEditing ? (
                          <Input 
                            id="name" 
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})} 
                            className="h-12 text-base border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" 
                          />
                        ) : (
                          <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center">
                            <p className="font-medium">{formData.name || 'Not set'}</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Email */}
                      <div className="space-y-2.5">
                        <Label htmlFor="email" className="text-sm font-semibold">Email address</Label>
                        {isEditing ? (
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input 
                              id="email" 
                              type="email" 
                              value={formData.email} 
                              onChange={e => setFormData({...formData, email: e.target.value})} 
                              className="h-12 text-base pl-11 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" 
                            />
                          </div>
                        ) : (
                          <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center gap-3">
                            <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <p className="font-medium truncate">{formData.email || 'Not set'}</p>
                          </div>
                        )}
                      </div>

                      {/* Phone */}
                      <div className="space-y-2.5">
                        <Label htmlFor="phone" className="text-sm font-semibold">Phone Number</Label>
                        {isEditing ? (
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input 
                              id="phone" 
                              value={formData.phone} 
                              onChange={e => setFormData({...formData, phone: e.target.value})} 
                              placeholder="+94XXXXXXXXX" 
                              className="h-12 text-base pl-11 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" 
                            />
                          </div>
                        ) : (
                          <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center gap-3">
                            <Phone className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <p className="font-medium">{formData.phone || 'Not set'}</p>
                          </div>
                        )}
                      </div>

                      {/* Date of Birth */}
                      <div className="space-y-2.5">
                        <Label htmlFor="dateOfBirth" className="text-sm font-semibold">Date of Birth</Label>
                        {isEditing ? (
                          <Input 
                            id="dateOfBirth" 
                            type="date" 
                            value={formData.dateOfBirth} 
                            onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} 
                            className="h-12 text-base border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" 
                          />
                        ) : (
                          <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <p className="font-medium">{formData.dateOfBirth || 'Not set'}</p>
                          </div>
                        )}
                      </div>

                      {/* Gender */}
                      <div className="space-y-2.5">
                        <Label htmlFor="gender" className="text-sm font-semibold">Gender</Label>
                        {isEditing ? (
                          <Input 
                            id="gender" 
                            value={formData.gender} 
                            onChange={e => setFormData({...formData, gender: e.target.value})} 
                            className="h-12 text-base border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" 
                          />
                        ) : (
                          <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center">
                            <p className="font-medium">{formData.gender || 'Not specified'}</p>
                          </div>
                        )}
                      </div>

                      {/* NIC */}
                      <div className="space-y-2.5">
                        <Label htmlFor="nic" className="text-sm font-semibold">NIC</Label>
                        {isEditing ? (
                          <Input 
                            id="nic" 
                            value={formData.nic} 
                            onChange={e => setFormData({...formData, nic: e.target.value})} 
                            className="h-12 text-base border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" 
                          />
                        ) : (
                          <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center">
                            <p className="font-medium">{formData.nic || 'Not set'}</p>
                          </div>
                        )}
                      </div>

                      {/* Birth Certificate No */}
                      <div className="space-y-2.5">
                        <Label htmlFor="birthCertificateNo" className="text-sm font-semibold">Birth Certificate No</Label>
                        {isEditing ? (
                          <Input 
                            id="birthCertificateNo" 
                            value={formData.birthCertificateNo} 
                            onChange={e => setFormData({...formData, birthCertificateNo: e.target.value})} 
                            className="h-12 text-base border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" 
                          />
                        ) : (
                          <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center">
                            <p className="font-medium">{formData.birthCertificateNo || 'Not set'}</p>
                          </div>
                        )}
                      </div>

                      {/* User Type */}
                      <div className="space-y-2.5">
                        <Label className="text-sm font-semibold">User Type</Label>
                        <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 flex items-center gap-3">
                          <Shield className="h-5 w-5 text-primary flex-shrink-0" />
                          <p className="font-semibold text-primary">{userData?.userType || 'N/A'}</p>
                        </div>
                      </div>

                      {/* Address Line 1 */}
                      <div className="space-y-2.5 md:col-span-2">
                        <Label htmlFor="addressLine1" className="text-sm font-semibold">Address Line 1</Label>
                        {isEditing ? (
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input 
                              id="addressLine1" 
                              value={formData.addressLine1} 
                              onChange={e => setFormData({...formData, addressLine1: e.target.value})} 
                              placeholder="Street address, area, landmark"
                              className="h-12 text-base pl-11 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" 
                            />
                          </div>
                        ) : (
                          <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center gap-3">
                            <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <p className="font-medium">{formData.addressLine1 || 'Not set'}</p>
                          </div>
                        )}
                      </div>

                      {/* Address Line 2 */}
                      <div className="space-y-2.5 md:col-span-2">
                        <Label htmlFor="addressLine2" className="text-sm font-semibold">Address Line 2</Label>
                        {isEditing ? (
                          <Input 
                            id="addressLine2" 
                            value={formData.addressLine2} 
                            onChange={e => setFormData({...formData, addressLine2: e.target.value})} 
                            placeholder="Apartment, suite, unit, etc."
                            className="h-12 text-base border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" 
                          />
                        ) : (
                          <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center">
                            <p className="font-medium">{formData.addressLine2 || 'Not set'}</p>
                          </div>
                        )}
                      </div>

                      {/* City */}
                      <div className="space-y-2.5">
                        <Label htmlFor="city" className="text-sm font-semibold">City</Label>
                        {isEditing ? (
                          <Input 
                            id="city" 
                            value={formData.city} 
                            onChange={e => setFormData({...formData, city: e.target.value})} 
                            className="h-12 text-base border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" 
                          />
                        ) : (
                          <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center">
                            <p className="font-medium">{formData.city || 'Not set'}</p>
                          </div>
                        )}
                      </div>

                      {/* District */}
                      <div className="space-y-2.5">
                        <Label htmlFor="district" className="text-sm font-semibold">District</Label>
                        {isEditing ? (
                          <Input 
                            id="district" 
                            value={formData.district} 
                            onChange={e => setFormData({...formData, district: e.target.value})} 
                            className="h-12 text-base border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" 
                          />
                        ) : (
                          <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center">
                            <p className="font-medium">{formData.district || 'Not set'}</p>
                          </div>
                        )}
                      </div>

                      {/* Province */}
                      <div className="space-y-2.5">
                        <Label htmlFor="province" className="text-sm font-semibold">Province</Label>
                        {isEditing ? (
                          <Input 
                            id="province" 
                            value={formData.province} 
                            onChange={e => setFormData({...formData, province: e.target.value})} 
                            className="h-12 text-base border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" 
                          />
                        ) : (
                          <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center">
                            <p className="font-medium">{formData.province || 'Not set'}</p>
                          </div>
                        )}
                      </div>

                      {/* Postal Code */}
                      <div className="space-y-2.5">
                        <Label htmlFor="postalCode" className="text-sm font-semibold">Postal Code</Label>
                        {isEditing ? (
                          <Input 
                            id="postalCode" 
                            value={formData.postalCode} 
                            onChange={e => setFormData({...formData, postalCode: e.target.value})} 
                            className="h-12 text-base border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" 
                          />
                        ) : (
                          <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center">
                            <p className="font-medium">{formData.postalCode || 'Not set'}</p>
                          </div>
                        )}
                      </div>

                      {/* Country */}
                      <div className="space-y-2.5">
                        <Label htmlFor="country" className="text-sm font-semibold">Country</Label>
                        {isEditing ? (
                          <Input 
                            id="country" 
                            value={formData.country} 
                            onChange={e => setFormData({...formData, country: e.target.value})} 
                            className="h-12 text-base border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" 
                          />
                        ) : (
                          <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center">
                            <p className="font-medium">{formData.country || 'Not set'}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Professional Information Section */}
                    <div className="mt-8 pt-6 border-t border-border/50">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-primary" />
                        Professional Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Occupation */}
                        <div className="space-y-2.5">
                          <Label htmlFor="occupation" className="text-sm font-semibold">Occupation</Label>
                          {isEditing ? (
                            <Input 
                              id="occupation" 
                              value={formData.occupation} 
                              onChange={e => setFormData({...formData, occupation: e.target.value})} 
                              placeholder="e.g., Teacher, Engineer"
                              className="h-12 text-base border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" 
                            />
                          ) : (
                            <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center gap-3">
                              <Briefcase className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                              <p className="font-medium">{formData.occupation || 'Not set'}</p>
                            </div>
                          )}
                        </div>

                        {/* Workplace */}
                        <div className="space-y-2.5">
                          <Label htmlFor="workplace" className="text-sm font-semibold">Workplace</Label>
                          {isEditing ? (
                            <Input 
                              id="workplace" 
                              value={formData.workplace} 
                              onChange={e => setFormData({...formData, workplace: e.target.value})} 
                              placeholder="Company or organization name"
                              className="h-12 text-base border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" 
                            />
                          ) : (
                            <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center">
                              <p className="font-medium">{formData.workplace || 'Not set'}</p>
                            </div>
                          )}
                        </div>

                        {/* Work Phone */}
                        <div className="space-y-2.5">
                          <Label htmlFor="workPhone" className="text-sm font-semibold">Work Phone</Label>
                          {isEditing ? (
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                              <Input 
                                id="workPhone" 
                                value={formData.workPhone} 
                                onChange={e => setFormData({...formData, workPhone: e.target.value})} 
                                placeholder="+94XXXXXXXXX"
                                className="h-12 text-base pl-11 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" 
                              />
                            </div>
                          ) : (
                            <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center gap-3">
                              <Phone className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                              <p className="font-medium">{formData.workPhone || 'Not set'}</p>
                            </div>
                          )}
                        </div>

                        {/* Education Level */}
                        <div className="space-y-2.5">
                          <Label htmlFor="educationLevel" className="text-sm font-semibold">Education Level</Label>
                          {isEditing ? (
                            <div className="relative">
                              <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                              <Input 
                                id="educationLevel" 
                                value={formData.educationLevel} 
                                onChange={e => setFormData({...formData, educationLevel: e.target.value})} 
                                placeholder="e.g., BSc in Computer Science"
                                className="h-12 text-base pl-11 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" 
                              />
                            </div>
                          ) : (
                            <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center gap-3">
                              <GraduationCap className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                              <p className="font-medium">{formData.educationLevel || 'Not set'}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Account Information Section */}
                    <div className="mt-8 pt-6 border-t border-border/50">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        Account Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Subscription Plan */}
                        <div className="space-y-2.5">
                          <Label className="text-sm font-semibold">Subscription Plan</Label>
                          <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 flex items-center gap-3">
                            <CreditCard className="h-5 w-5 text-primary flex-shrink-0" />
                            <p className="font-semibold text-primary">{formData.subscriptionPlan || 'FREE'}</p>
                          </div>
                        </div>

                        {/* Language */}
                        <div className="space-y-2.5">
                          <Label htmlFor="language" className="text-sm font-semibold">Language</Label>
                          {isEditing ? (
                            <div className="relative">
                              <Languages className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                              <Input 
                                id="language" 
                                value={formData.language} 
                                onChange={e => setFormData({...formData, language: e.target.value})} 
                                placeholder="E for English, S for Sinhala"
                                className="h-12 text-base pl-11 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" 
                              />
                            </div>
                          ) : (
                            <div className="h-12 px-4 rounded-xl bg-gradient-to-r from-muted/70 to-muted/40 border border-border/50 flex items-center gap-3">
                              <Languages className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                              <p className="font-medium">{formData.language === 'E' ? 'English' : formData.language === 'S' ? 'Sinhala' : formData.language || 'Not set'}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="change-password" className="space-y-6">
                <Card className="border-0 shadow-xl bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-md">
                  <CardHeader className="pb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Lock className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-semibold">Change Password</CardTitle>
                        <CardDescription className="text-base mt-1">
                          Update your account password to keep your account secure
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="space-y-6">
                      <div className="relative">
                        <Label htmlFor="currentPassword" className="text-sm font-semibold text-foreground/80">
                          Current Password
                        </Label>
                        <div className="mt-2 relative">
                          <Input 
                            id="currentPassword" 
                            type={passwordVisibility.currentPassword ? "text" : "password"} 
                            placeholder="Enter your current password" 
                            value={passwordData.currentPassword} 
                            onChange={e => setPasswordData({
                              ...passwordData,
                              currentPassword: e.target.value
                            })} 
                            className="pr-10 h-12 bg-background/50 border-2 border-border/50 focus:border-primary/50 focus:bg-background transition-all duration-300 rounded-lg" 
                          />
                          <button
                            type="button"
                            onClick={() => setPasswordVisibility({
                              ...passwordVisibility,
                              currentPassword: !passwordVisibility.currentPassword
                            })}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-1"
                          >
                            {passwordVisibility.currentPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>
                      
                      <div className="relative">
                        <Label htmlFor="newPassword" className="text-sm font-semibold text-foreground/80">
                          New Password
                        </Label>
                        <div className="mt-2 relative">
                          <Input 
                            id="newPassword" 
                            type={passwordVisibility.newPassword ? "text" : "password"} 
                            placeholder="Enter your new password" 
                            value={passwordData.newPassword} 
                            onChange={e => setPasswordData({
                              ...passwordData,
                              newPassword: e.target.value
                            })} 
                            className="pr-10 h-12 bg-background/50 border-2 border-border/50 focus:border-primary/50 focus:bg-background transition-all duration-300 rounded-lg" 
                          />
                          <button
                            type="button"
                            onClick={() => setPasswordVisibility({
                              ...passwordVisibility,
                              newPassword: !passwordVisibility.newPassword
                            })}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-1"
                          >
                            {passwordVisibility.newPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Password must be at least 8 characters long
                        </p>
                      </div>
                      
                      <div className="relative">
                        <Label htmlFor="confirmPassword" className="text-sm font-semibold text-foreground/80">
                          Confirm New Password
                        </Label>
                        <div className="mt-2 relative">
                          <Input 
                            id="confirmPassword" 
                            type={passwordVisibility.confirmNewPassword ? "text" : "password"} 
                            placeholder="Confirm your new password" 
                            value={passwordData.confirmNewPassword} 
                            onChange={e => setPasswordData({
                              ...passwordData,
                              confirmNewPassword: e.target.value
                            })}
                            className="pr-10 h-12 bg-background/50 border-2 border-border/50 focus:border-primary/50 focus:bg-background transition-all duration-300 rounded-lg" 
                          />
                          <button
                            type="button"
                            onClick={() => setPasswordVisibility({
                              ...passwordVisibility,
                              confirmNewPassword: !passwordVisibility.confirmNewPassword
                            })}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-1"
                          >
                            {passwordVisibility.confirmNewPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>
                      
                      <div className="pt-4">
                        <Button 
                          onClick={handlePasswordChange}
                          disabled={passwordLoading}
                          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          {passwordLoading ? "Updating..." : "Update Password"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    );
};
export default Profile;