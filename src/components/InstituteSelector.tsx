import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { Building, Users, CheckCircle, RefreshCw, MapPin, Mail, Phone, Youtube, Facebook, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cachedApiClient } from '@/api/cachedClient';
import { getBaseUrl } from '@/contexts/utils/auth.api';

import { getImageUrl } from '@/utils/imageUrlHelper';

// Helper function to resolve image URLs
const resolveImageUrl = (val?: string) => {
  if (!val) return '/placeholder.svg';
  return getImageUrl(val);
};
interface InstituteApiResponse {
  id: string;
  name: string;
  shortName?: string;
  code?: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  district?: string;
  province?: string;
  pinCode?: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  imageUrl?: string;
  logoUrl?: string;
  userImageUrl?: string;
  websiteUrl?: string;
  facebookPageUrl?: string;
  youtubeChannelUrl?: string;
  vision?: string;
  mission?: string;
}
interface InstituteSelectorProps {
  useChildId?: boolean;
}
const InstituteSelector = ({
  useChildId = false
}: InstituteSelectorProps) => {
  const {
    user,
    setSelectedInstitute,
    selectedChild
  } = useAuth();
  const {
    toast
  } = useToast();
  const [institutes, setInstitutes] = useState<InstituteApiResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);
  const [expandedInstituteId, setExpandedInstituteId] = useState<string | null>(null);
  const userRole = useInstituteRole();
  const { navigateToPage } = useAppNavigation();
  // Sidebar collapse awareness for grid columns
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    typeof document !== 'undefined' && document.documentElement.classList.contains('sidebar-collapsed')
  );
  React.useEffect(() => {
    const handler = () => setSidebarCollapsed(document.documentElement.classList.contains('sidebar-collapsed'));
    window.addEventListener('sidebar:state', handler as any);
    return () => window.removeEventListener('sidebar:state', handler as any);
  }, []);

  // Auto-load institutes on mount (uses cache if available)
  React.useEffect(() => {
    const userId = useChildId && selectedChild ? selectedChild.id : user?.id;
    if (userId && !hasAutoLoaded && institutes.length === 0) {
      setHasAutoLoaded(true);
      handleLoadInstitutes();
    }
  }, [user?.id, selectedChild?.id, useChildId, hasAutoLoaded]);
  const handleLoadInstitutes = async () => {
    // For Parent role, use the selected child's ID instead of the parent's ID
    const userId = useChildId && selectedChild ? selectedChild.id : user?.id;
    if (!userId) {
      toast({
        title: "Error",
        description: useChildId ? "No child selected" : "No user ID available",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      console.log('Loading institutes for user ID:', userId, useChildId ? '(child)' : '(user)');

      // Try multiple possible endpoints to support different backends
      const endpoints = useChildId ? [`/children/${userId}/institutes`, `/users/${userId}/institutes`] : [`/users/${userId}/institutes`];
      let result: InstituteApiResponse[] | null = null;
      let lastErr: any = null;
      for (const ep of endpoints) {
        try {
          console.log('Trying endpoint:', ep);

          // Use cachedApiClient instead of direct fetch
          const data = await cachedApiClient.get(ep, {
            page: 1,
            limit: 10
          }, {
            ttl: 30,
            // Cache for 30 minutes
            forceRefresh: false,
            userId: userId,
            role: userRole || 'User'
          });

          // Handle response - data might be array or wrapped in data property
          if (Array.isArray(data)) {
            result = data;
            console.log('✅ Successful endpoint (cached):', ep);
            break;
          }
          if (data?.data && Array.isArray(data.data)) {
            result = data.data;
            console.log('✅ Successful endpoint (wrapped, cached):', ep);
            break;
          }
          console.warn(`Endpoint ${ep} returned unexpected response shape`);
          lastErr = new Error('Unexpected response shape');
        } catch (e) {
          console.error(`Error calling ${ep}:`, e);
          lastErr = e;
        }
      }
      if (!result) {
        throw lastErr || new Error('No valid endpoint available for institutes');
      }
      console.log('Institutes API Response:', result);

      // Normalize API response to expected shape
      const normalized = (result as any[]).map((raw: any) => ({
        id: raw.id || raw.instituteId || '',
        name: raw.name || raw.instituteName || '',
        shortName: raw.shortName || '',
        code: raw.code || '',
        email: raw.email || raw.instituteEmail || '',
        phone: raw.phone || raw.institutePhone || '',
        address: raw.address || raw.instituteAddress || '',
        city: raw.city || raw.instituteCity || '',
        state: raw.state || raw.instituteState || '',
        country: raw.country || raw.instituteCountry || '',
        district: raw.district || '',
        province: raw.province || '',
        pinCode: raw.pinCode || '',
        type: raw.type || raw.instituteType || '',
        isActive: raw.isActive !== undefined ? raw.isActive : raw.instituteIsActive !== undefined ? raw.instituteIsActive : true,
        createdAt: raw.createdAt || '',
        imageUrl: raw.imageUrl || '',
        logoUrl: raw.logoUrl || raw.instituteLogo || '',
        userImageUrl: raw.instituteUserImageUrl || '',
        websiteUrl: raw.websiteUrl || '',
        facebookPageUrl: raw.facebookPageUrl || '',
        youtubeChannelUrl: raw.youtubeChannelUrl || '',
        vision: raw.vision || '',
        mission: raw.mission || '',
        instituteUserType: raw.instituteUserType || '',
        userIdByInstitute: raw.userIdByInstitute || '',
        status: raw.status || ''
      }));

      // Filter out any invalid institute data
      const validInstitutes = normalized.filter(inst => inst && inst.id && inst.name);
      setInstitutes(validInstitutes);
      toast({
        title: "Data Loaded",
        description: `Successfully loaded ${validInstitutes.length} institutes.`
      });
    } catch (error) {
      console.error('Error loading institutes:', error);
      toast({
        title: "Error",
        description: "Failed to load institutes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleSelectInstitute = (institute: InstituteApiResponse) => {
    if (!institute || !institute.id) {
      toast({
        title: "Error",
        description: "Invalid institute data",
        variant: "destructive"
      });
      return;
    }
    const selectedInstitute = {
      id: institute.id,
      name: institute.name,
      code: institute.id,
      // Using id as code since it's not in the API response
      description: `${institute.address || ''}, ${institute.city || ''}`.trim(),
      isActive: institute.isActive,
      type: institute.type,
      userRole: (institute as any).instituteUserType || '',
      userIdByInstitute: (institute as any).userIdByInstitute || '',
      shortName: institute.shortName || institute.name,
      logo: institute.logoUrl || '',
      instituteUserImageUrl: institute.userImageUrl || institute.imageUrl || ''
    };
    setSelectedInstitute(selectedInstitute);
    toast({
      title: "Institute Selected",
      description: `Selected institute: ${selectedInstitute.name}`
    });

    // After selecting an institute, go directly to class selection for non-parent roles
    if (userRole && userRole !== 'Parent') {
      navigateToPage('select-class');
    }
  };
  return <div className="space-y-6">
      <div className="text-center mb-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Select Institute
        </h1>
        <p className="text-gray-600">
          Choose an institute to continue to your dashboard
        </p>
      </div>

      {institutes.length === 0 && !isLoading && hasAutoLoaded && <div className="flex flex-col items-center justify-center py-12 px-4">
          <p className="text-gray-600 mb-6 text-center">
            No institutes found. Click the button below to retry.
          </p>
          <Button onClick={handleLoadInstitutes} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Loading
          </Button>
        </div>}

      {isLoading && <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading institutes...</p>
        </div>}

      {institutes.length > 0 && <>
          <div className="flex justify-between items-center mb-16">
            <h2 className="text-xl font-semibold text-gray-900">
              Your Institutes ({institutes.length})
            </h2>
            <Button onClick={handleLoadInstitutes} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2 ${sidebarCollapsed ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-x-6 gap-y-16 mb-16`}>
            {institutes.map(institute => {
          const showSocial = expandedInstituteId === institute.id;
          return <div key={institute.id} className="relative flex w-full flex-col rounded-xl bg-white dark:bg-gray-800 bg-clip-border text-gray-700 dark:text-gray-300 shadow-md transition-all duration-200 hover:shadow-lg hover:scale-[1.02]">
                  {/* Institute Image - Gradient Header with -mt-6 offset */}
                  <div className="relative mx-4 -mt-6 h-40 overflow-hidden rounded-xl bg-clip-border text-white shadow-lg shadow-blue-gray-500/40 bg-gradient-to-r from-blue-500 to-blue-600">
                    {(institute.imageUrl || institute.logoUrl) ? (
                      <img 
                        src={resolveImageUrl(institute.imageUrl || institute.logoUrl)} 
                        alt={institute.name || 'Institute'} 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.svg';
                        }} 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-blue-500 to-blue-600">
                        <Building className="w-16 h-16 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    {/* Institute Name */}
                    <h5 className="mb-2 block font-sans text-xl font-semibold leading-snug tracking-normal text-blue-gray-900 dark:text-white antialiased">
                      {institute.name}
                    </h5>
                    
                    {/* Institute Type & Status */}
                    <div className="flex items-center justify-start gap-2 mb-4">
                      <Badge variant="outline" className="text-xs">
                        {institute.type}
                      </Badge>
                      {institute.isActive && <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>}
                    </div>

                    {/* Description */}
                    

                    {/* Additional Details - Shown when View More is clicked */}
                    {showSocial && <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-300 space-y-3">
                        {/* Social Media Links */}
                        {(institute.websiteUrl || institute.facebookPageUrl || institute.youtubeChannelUrl) && <div className="flex gap-2 justify-start pb-3 border-b border-gray-200 dark:border-gray-700">
                            {institute.websiteUrl && <Button variant="outline" size="icon" asChild className="hover:bg-blue-50 dark:hover:bg-blue-950">
                                <a href={institute.websiteUrl} target="_blank" rel="noopener noreferrer" aria-label="Visit website">
                                  <Globe className="h-4 w-4" />
                                </a>
                              </Button>}
                            {institute.facebookPageUrl && <Button variant="outline" size="icon" asChild className="hover:bg-blue-50 dark:hover:bg-blue-950">
                                <a href={institute.facebookPageUrl} target="_blank" rel="noopener noreferrer" aria-label="Visit Facebook page">
                                  <Facebook className="h-4 w-4" />
                                </a>
                              </Button>}
                            {institute.youtubeChannelUrl && <Button variant="outline" size="icon" asChild className="hover:bg-red-50 dark:hover:bg-red-950">
                                <a href={institute.youtubeChannelUrl} target="_blank" rel="noopener noreferrer" aria-label="Visit YouTube channel">
                                  <Youtube className="h-4 w-4" />
                                </a>
                              </Button>}
                          </div>}
                        
                        {/* Institute Details */}
                        <div className="space-y-2 text-sm">
                          {institute.code && <div className="flex items-start gap-2">
                              <span className="font-semibold text-gray-700 dark:text-gray-300 min-w-[80px]">Code:</span>
                              <span className="text-gray-600 dark:text-gray-400">{institute.code}</span>
                            </div>}
                          {institute.shortName && <div className="flex items-start gap-2">
                              <span className="font-semibold text-gray-700 dark:text-gray-300 min-w-[80px]">Short Name:</span>
                              <span className="text-gray-600 dark:text-gray-400">{institute.shortName}</span>
                            </div>}
                          {institute.email && <div className="flex items-start gap-2">
                              <Mail className="h-4 w-4 text-gray-500 mt-0.5" />
                              <span className="text-gray-600 dark:text-gray-400 break-all">{institute.email}</span>
                            </div>}
                          {institute.phone && <div className="flex items-start gap-2">
                              <Phone className="h-4 w-4 text-gray-500 mt-0.5" />
                              <span className="text-gray-600 dark:text-gray-400">{institute.phone}</span>
                            </div>}
                          {institute.address && <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                              <span className="text-gray-600 dark:text-gray-400">
                                {institute.address}
                                {institute.city && `, ${institute.city}`}
                                {institute.state && `, ${institute.state}`}
                                {institute.country && `, ${institute.country}`}
                              </span>
                            </div>}
                          {(institute as any).district && <div className="flex items-start gap-2">
                              <span className="font-semibold text-gray-700 dark:text-gray-300 min-w-[80px]">District:</span>
                              <span className="text-gray-600 dark:text-gray-400">{(institute as any).district}</span>
                            </div>}
                          {(institute as any).province && <div className="flex items-start gap-2">
                              <span className="font-semibold text-gray-700 dark:text-gray-300 min-w-[80px]">Province:</span>
                              <span className="text-gray-600 dark:text-gray-400">{(institute as any).province}</span>
                            </div>}
                          {(institute as any).pinCode && <div className="flex items-start gap-2">
                              <span className="font-semibold text-gray-700 dark:text-gray-300 min-w-[80px]">PIN Code:</span>
                              <span className="text-gray-600 dark:text-gray-400">{(institute as any).pinCode}</span>
                            </div>}
                          {(institute as any).vision && <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                              <span className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Vision:</span>
                              <p className="text-gray-600 dark:text-gray-400 text-xs">{(institute as any).vision}</p>
                            </div>}
                          {(institute as any).mission && <div>
                              <span className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Mission:</span>
                              <p className="text-gray-600 dark:text-gray-400 text-xs">{(institute as any).mission}</p>
                            </div>}
                        </div>
                      </div>}
                  </div>

                  {/* Action Buttons */}
                  <div className="p-6 pt-0 space-y-2">
                    <button onClick={() => setExpandedInstituteId(showSocial ? null : institute.id)} className="select-none rounded-lg bg-gray-100 dark:bg-gray-700 py-3 px-6 w-full text-center align-middle font-sans text-xs font-bold uppercase text-gray-900 dark:text-white shadow-md transition-all hover:shadow-lg focus:opacity-[0.85] focus:shadow-none active:opacity-[0.85] active:shadow-none">
                      {showSocial ? 'Hide Details' : 'Read More'}
                    </button>
                    
                    <button onClick={() => handleSelectInstitute(institute)} className="select-none rounded-lg bg-blue-500 py-3 px-6 w-full text-center align-middle font-sans text-xs font-bold uppercase text-white shadow-md shadow-blue-500/20 transition-all hover:shadow-lg hover:shadow-blue-500/40 focus:opacity-[0.85] focus:shadow-none active:opacity-[0.85] active:shadow-none">
                      Select Institute
                    </button>
                  </div>
                </div>;
        })}
          </div>
        </>}
    </div>;
};
export default InstituteSelector;