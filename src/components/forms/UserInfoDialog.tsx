import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { BasicUser } from '@/api/users.api';
import { getImageUrl } from '@/utils/imageUrlHelper';

interface UserInfoDialogProps {
  open: boolean;
  onClose: () => void;
  user: BasicUser | null;
}

const UserInfoDialog: React.FC<UserInfoDialogProps> = ({ open, onClose, user }) => {
  if (!user) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">User Information</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 py-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={getImageUrl(user.imageUrl)} alt={user.fullName} />
            <AvatarFallback className="text-2xl bg-primary/10 text-primary">
              {getInitials(user.fullName)}
            </AvatarFallback>
          </Avatar>
          
          <div className="text-center space-y-3 w-full">
            <h3 className="text-xl font-semibold">{user.fullName}</h3>
            <div className="bg-primary/10 rounded-lg p-3 mx-auto">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">User ID</p>
              <p className="font-bold text-lg text-primary">{user.id}</p>
            </div>
            <p className="text-muted-foreground text-sm">
              User Type: <span className="font-medium text-foreground">{user.userType}</span>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserInfoDialog;
