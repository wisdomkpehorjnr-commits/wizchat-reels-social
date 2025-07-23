
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
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-white ${className}`}>
      <img 
        src="/lovable-uploads/3af45968-ee0a-4afb-9557-c058030ab8dc.png" 
        alt="WizchatPro Logo"
        className="w-full h-full object-cover rounded-full"
        style={{
          background: 'white',
          padding: '2px'
        }}
      />
    </div>
  );
};

export default Logo;
