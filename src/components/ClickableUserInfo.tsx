
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from '@/types';

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
  return (
    <Link 
      to={`/profile/${user.username || user.id}`}
      className={`flex items-center space-x-2 hover:opacity-80 transition-opacity ${className}`}
    >
      {showAvatar && (
        <Avatar className={avatarSize}>
          <AvatarImage src={user.avatar} />
          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
        </Avatar>
      )}
      {showName && (
        <span className="font-medium text-foreground hover:text-primary transition-colors">
          {user.name}
        </span>
      )}
    </Link>
  );
};

export default ClickableUserInfo;
