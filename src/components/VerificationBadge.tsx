import React from 'react';

interface VerificationBadgeProps {
  isVerified?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const VerificationBadge: React.FC<VerificationBadgeProps> = ({ 
  isVerified = true, 
  size = 'md', 
  showText = false,
  className = '' 
}) => {
  if (!isVerified) return null;

  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const iconSize = sizeMap[size] || sizeMap.md;

  return (
    <span
      title="Verified"
      className={`inline-flex items-center gap-1 ${className}`}
      aria-label="Verified Account"
    >
      <svg 
        className={iconSize}
        viewBox="0 0 18 18" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="9" cy="9" r="9" fill="#1DA1F2"/>
        <path 
          d="M13 6.5L8.25 11.25L6 9" 
          stroke="#fff" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
      {showText && (
        <span className="text-xs font-medium text-blue-500">Verified</span>
      )}
    </span>
  );
};

export default VerificationBadge;
