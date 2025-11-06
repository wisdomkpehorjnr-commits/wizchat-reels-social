
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from '@/types';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import VerificationBadge from './VerificationBadge';

interface ClickableUserInfoProps {
  user: User;
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
  const isOnline = useOnlineStatus(user.id);
  const isVerified = (user as any).is_verified || false;
  
  return (
    <Link 
      to={`/profile/${user.username || user.id}`}
      className={`flex items-center space-x-2 hover:opacity-80 transition-opacity ${className}`}
    >
      {showAvatar && (
        <div className="relative">
          <Avatar className={`${avatarSize} ${isOnline ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-background' : ''}`}>
            <AvatarImage src={user.avatar} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
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
            {user.name}
          </span>
          {isVerified && (
            <VerificationBadge isVerified={true} size="sm" showText />
          )}
        </div>
      )}
    </Link>
  );
};

export default ClickableUserInfo;
