import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from '@/types';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import VerificationBadge from './VerificationBadge';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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
  const [isNavigating, setIsNavigating] = useState(false);
  const isOnline = useOnlineStatus(user?.id);
  const isVerified = (user as any)?.is_verified || false;
  
  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user?.id || isNavigating) return;
    
    // Check if this is the current user's profile - if so, do nothing
    const isOwnProfile = currentUser && (
      user.id === currentUser.id || 
      user.username === currentUser.username ||
      (user.id && currentUser.id && user.id === currentUser.id)
    );
    
    if (isOwnProfile) {
      return; // No action for own profile
    }
    
    setIsNavigating(true);
    
    try {
      // Verify the user exists in profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', user.id)
        .single();
      
      if (error || !profile) {
        // If profile doesn't exist, try to find by username
        if (user.username) {
          const { data: profileByUsername } = await supabase
            .from('profiles')
            .select('id, username')
            .eq('username', user.username)
            .single();
          
          if (profileByUsername) {
            // Double-check it's not the current user
            if (currentUser && profileByUsername.id === currentUser.id) {
              return; // No action for own profile
            }
            navigate(`/profile/${profileByUsername.username || profileByUsername.id}`);
            return;
          }
        }
        
        // Double-check it's not the current user before navigating
        if (currentUser && user.id === currentUser.id) {
          return; // No action for own profile
        }
        
        // If still not found, navigate with ID anyway (Profile page will handle error gracefully)
        navigate(`/profile/${user.id}`);
        return;
      }
      
      // Double-check it's not the current user
      if (currentUser && profile.id === currentUser.id) {
        return; // No action for own profile
      }
      
      // Navigate using username if available, otherwise ID
      const identifier = profile.username || profile.id;
      navigate(`/profile/${identifier}`);
    } catch (error) {
      console.error('Error navigating to profile:', error);
      // Double-check it's not the current user before fallback navigation
      if (currentUser && user.id === currentUser.id) {
        return; // No action for own profile
      }
      // Fallback navigation
      navigate(`/profile/${user.id}`);
    } finally {
      setTimeout(() => setIsNavigating(false), 500);
    }
  };
  
  if (!user) {
    return null;
  }
  
  // Check if this is the current user - if so, make it non-clickable
  const isOwnProfile = currentUser && (user.id === currentUser.id || user.username === currentUser.username);
  
  return (
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
            <div className="absolute -bottom-1 -right-1">
              <VerificationBadge isVerified={true} size="sm" />
            </div>
          )}
        </div>
      )}
      {showName && (
        <div className="flex items-center gap-1">
          <span className="font-medium text-foreground hover:text-primary transition-colors">
            {user.name || user.email || 'Unknown User'}
          </span>
          {isVerified && (
            <VerificationBadge isVerified={true} size="sm" showText />
          )}
        </div>
      )}
    </div>
  );
};

export default ClickableUserInfo;
