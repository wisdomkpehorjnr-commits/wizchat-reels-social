
import React from 'react';
import { Link } from 'react-router-dom';
import { User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface UserLinkProps {
  user: User;
  children: React.ReactNode;
  className?: string;
}

const UserLink: React.FC<UserLinkProps> = ({ user, children, className = "" }) => {
  const { user: currentUser } = useAuth();
  
  // Check if this is the current user's profile - if so, make it non-clickable
  const isOwnProfile = currentUser && (user.id === currentUser.id || user.username === currentUser.username);
  
  if (isOwnProfile) {
    return (
      <div className={className}>
        {children}
      </div>
    );
  }
  
  return (
    <Link 
      to={`/profile/${user.username || user.id}`} 
      className={`hover:opacity-80 transition-opacity ${className}`}
    >
      {children}
    </Link>
  );
};

export default UserLink;
