
import React from 'react';
import { Link } from 'react-router-dom';
import { User } from '@/types';

interface UserLinkProps {
  user: User;
  children: React.ReactNode;
  className?: string;
}

const UserLink: React.FC<UserLinkProps> = ({ user, children, className = "" }) => {
  return (
    <Link 
      to={`/profile/${user.id}`} 
      className={`hover:opacity-80 transition-opacity ${className}`}
    >
      {children}
    </Link>
  );
};

export default UserLink;
