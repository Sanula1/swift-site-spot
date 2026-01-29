
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import surakshaLogo from '@/assets/suraksha-logo.png';
import { enhancedCachedClient } from '@/api/enhancedCachedClient';
import SafeImage from '@/components/ui/SafeImage';
import { getImageUrl } from '@/utils/imageUrlHelper';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const { user, logout, selectedInstitute } = useAuth();

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
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);

  React.useEffect(() => {
    const load = async () => {
      // Prevent concurrent calls
      if (isLoadingAvatar) return;
      
      try {
        if (!selectedInstitute?.id) { 
          setInstituteAvatarUrl(''); 
          return; 
        }
        
        setIsLoadingAvatar(true);
        const resp = await enhancedCachedClient.get<any>(
          `/institute-users/institute/${selectedInstitute.id}/me`,
          {},
          { ttl: 300, forceRefresh: false, userId: selectedInstitute.id }
        );
        setInstituteAvatarUrl(resp?.instituteUserImageUrl || '');
      } catch (err: any) {
        // On rate limit or error, just keep existing avatar or clear it
        console.warn('Failed to load institute avatar:', err?.message);
        if (err?.message?.includes('Too many requests')) {
          // Don't retry on rate limit, keep whatever we had
          return;
        }
        setInstituteAvatarUrl('');
      } finally {
        setIsLoadingAvatar(false);
      }
    };
    load();
  }, [selectedInstitute?.id]);

  const handleLogout = () => {
    logout();
  };

  // Avatar image priority: institute user image → user profile image → fallback
  const avatarImageUrl = instituteAvatarUrl 
    ? getImageUrl(instituteAvatarUrl) 
    : (user?.imageUrl ? getImageUrl(user.imageUrl) : '');

  return (
    <header className="lg:hidden bg-background border-b border-border px-3 sm:px-4 py-3 sticky top-0 z-40 pt-safe-top">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          className="p-2 hover:bg-muted"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          <SafeImage 
            src={selectedInstitute?.logo || surakshaLogo} 
            alt={selectedInstitute?.shortName ? "Institute logo" : "SurakshaLMS logo"}
            className="h-8 w-8 object-contain rounded"
          />
          <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">
            {selectedInstitute?.shortName || 'SurakshaLMS'}
          </h1>
        </div>
        
        <div className="flex items-center space-x-1 sm:space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-1 hover:bg-muted rounded-full relative group"
                aria-label="User menu"
              >
                <Avatar className="h-9 w-9 border-2 border-border transition-all group-hover:border-primary">
                  {avatarImageUrl && (
                    <AvatarImage 
                      src={avatarImageUrl}
                      alt={user?.name}
                      className="object-cover"
                    />
                  )}
                  <AvatarFallback className="bg-muted">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-48 bg-popover border border-border"
            >
              <DropdownMenuItem disabled className="cursor-default">
                <span className="font-medium text-foreground truncate">
                  {user?.name}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="cursor-default">
                <span className="text-sm text-muted-foreground">
                  {displayRole}
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="cursor-pointer hover:bg-muted"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
