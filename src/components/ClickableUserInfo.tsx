import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from '@/types';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import VerifiedBadge from './VerifiedBadge';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User as UserIcon } from 'lucide-react';

interface ClickableUserInfoProps {
  user: User | any;
  showAvatar?: boolean;
  showName?: boolean;
  avatarSize?: string;
  className?: string;
}

const ClickableUserInfo = ({ 
  user, 
  showAvatar = true, 
  showName = true, 
  avatarSize = "w-8 h-8",
  className = "" 
}: ClickableUserInfoProps) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const isOnline = useOnlineStatus(user?.id);
  const isVerified = (user as any)?.is_verified || false;
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user?.id) return;
    
    const isOwnProfile = currentUser && (
      user.id === currentUser.id || 
      user.username === currentUser.username
    );
    
    if (isOwnProfile) return;
    
    setShowPopup(true);
  };

  const handleViewProfile = () => {
    setShowPopup(false);
    const identifier = user.username || user.id;
    navigate(`/profile/${identifier}`);
  };
  
  if (!user) return null;
  
  const isOwnProfile = currentUser && (user.id === currentUser.id || user.username === currentUser.username);
  
  return (
    <>
      <div 
        onClick={isOwnProfile ? undefined : handleClick}
        className={`flex items-center space-x-2 transition-opacity ${
          isOwnProfile ? '' : 'hover:opacity-80 cursor-pointer'
        } ${className}`}
      >
        {showAvatar && (
          <div className="relative">
            <Avatar className={`${avatarSize} ${isOnline ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-background' : ''}`}>
              <AvatarImage src={user.avatar || user.photoURL} />
              <AvatarFallback>{user.name?.charAt(0) || user.email?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            {isVerified && (
              <span className="absolute -bottom-1 -right-1">
                <VerifiedBadge className="w-4 h-4" />
              </span>
            )}
          </div>
        )}
        {showName && (
          <div className="flex items-center gap-1">
            <span className="font-medium text-foreground hover:text-primary transition-colors">
              {user.name || user.email || 'Unknown User'}
            </span>
            {isVerified && (
              <VerifiedBadge className="ml-1 w-4 h-4 align-middle" />
            )}
          </div>
        )}
      </div>

      {/* Profile action popup */}
      <Dialog open={showPopup} onOpenChange={setShowPopup}>
        <DialogContent className="max-w-[280px] rounded-2xl p-0 overflow-hidden border border-border bg-card shadow-xl [&>button]:hidden">
          <div className="flex flex-col items-center pt-6 pb-2 px-4">
            <Avatar className="w-16 h-16 mb-3">
              <AvatarImage src={user.avatar || user.photoURL} />
              <AvatarFallback className="text-lg">{user.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <p className="font-semibold text-foreground text-base">{user.name || 'Unknown'}</p>
            {user.username && (
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            )}
          </div>
          <div className="px-4 pb-4 space-y-2">
            <Button 
              className="w-full rounded-xl" 
              onClick={handleViewProfile}
            >
              <UserIcon className="w-4 h-4 mr-2" />
              View Profile
            </Button>
            <Button 
              variant="ghost" 
              className="w-full rounded-xl text-muted-foreground" 
              onClick={() => setShowPopup(false)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClickableUserInfo;
