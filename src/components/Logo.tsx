
import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden ${className}`}>
      <img 
        src="/lovable-uploads/15358747-e2da-431c-a6b1-721eb6914fc8.png" 
        alt="WizchatPro Logo"
        className="w-full h-full object-cover rounded-full"
      />
    </div>
  );
};

export default Logo;
