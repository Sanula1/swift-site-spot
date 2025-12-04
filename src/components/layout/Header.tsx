
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, LogOut, User, Camera } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ProfileImageUpload from '@/components/ProfileImageUpload';
import surakshaLogo from '@/assets/suraksha-logo.png';
import { enhancedCachedClient } from '@/api/enhancedCachedClient';
interface HeaderProps {
  onMenuClick: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const { user, logout, selectedInstitute, validateUserToken } = useAuth();
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState('');

  // Sync user image URL whenever it changes
  React.useEffect(() => {
    if (user?.imageUrl) {
      setCurrentImageUrl(user.imageUrl);
    } else {
      setCurrentImageUrl('');
    }
  }, [user?.imageUrl]);

  // Map backend instituteUserType to display role
  const mapInstituteRoleToDisplayRole = (raw?: string) => {
    switch (raw) {
      case 'INSTITUTE_ADMIN':
        return 'InstituteAdmin';
      case 'STUDENT':
        return 'Student';
      case 'TEACHER':
        return 'Teacher';
      case 'ATTENDANCE_MARKER':
        return 'AttendanceMarker';
      default:
        return undefined;
    }
  };

  // Display role: use institute-specific role if available, otherwise global role
  const displayRole = selectedInstitute?.userRole 
    ? mapInstituteRoleToDisplayRole(selectedInstitute.userRole) 
    : user?.role;

  const [instituteAvatarUrl, setInstituteAvatarUrl] = useState<string>('');

  React.useEffect(() => {
    const load = async () => {
      try {
        if (!selectedInstitute?.id) { setInstituteAvatarUrl(''); return; }
        const resp = await enhancedCachedClient.get<any>(
          `/institute-users/institute/${selectedInstitute.id}/me`,
          {},
          { ttl: 60, forceRefresh: false, userId: selectedInstitute.id }
        );
        setInstituteAvatarUrl(resp?.instituteUserImageUrl || '');
      } catch (err) {
        setInstituteAvatarUrl('');
      }
    };
    load();
  }, [selectedInstitute?.id]);

  const handleLogout = () => {
    logout();
  };
  const handleImageUpdate = async (newImageUrl: string) => {
    setCurrentImageUrl(newImageUrl);
    setShowImageUpload(false);
    // Refresh user data from backend to persist the image
    try {
      await validateUserToken();
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  return (
    <header className="lg:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-3 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          <img 
            src={selectedInstitute?.logo || surakshaLogo} 
            alt={selectedInstitute?.shortName ? "Institute logo" : "SurakshaLMS logo"}
            className="h-8 w-8 object-contain rounded"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">
            {selectedInstitute?.shortName || 'SurakshaLMS'}
          </h1>
        </div>
        
        <div className="flex items-center space-x-1 sm:space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-1 hover:bg-gray-100 rounded-full relative group"
                aria-label="User menu"
              >
                <Avatar className="h-9 w-9 border-2 border-border transition-all group-hover:border-primary">
                  <AvatarImage 
                    src={instituteAvatarUrl || ''}
                    alt={user?.name}
                    className="object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                  <AvatarFallback className="bg-muted">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-48 bg-white border border-gray-200"
            >
              <DropdownMenuItem disabled className="cursor-default">
                <span className="font-medium text-gray-900 truncate">
                  {user?.name}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="cursor-default">
                <span className="text-sm text-gray-500">
                  {displayRole}
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-200" />
              <DropdownMenuItem 
                onClick={() => setShowImageUpload(true)}
                className="cursor-pointer hover:bg-gray-100"
              >
                <Camera className="mr-2 h-4 w-4" />
                Change Photo
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleLogout}
                className="cursor-pointer hover:bg-gray-100"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showImageUpload && (
        <ProfileImageUpload
          currentImageUrl={currentImageUrl}
          onImageUpdate={handleImageUpdate}
          isOpen={showImageUpload}
          onClose={() => setShowImageUpload(false)}
          dialogOnly={true}
        />
      )}
    </header>
  );
};

export default Header;
