import React from 'react';
import { BadgeSvg } from './VerifiedBadge';

interface VerificationBadgeProps {
  isVerified?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizeMap = { sm: 16, md: 20, lg: 24 };

const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  isVerified = true,
  size = 'md',
  showText = false,
  className = '',
}) => {
  if (!isVerified) return null;
  return (
    <span title="Verified" className={`inline-flex items-center gap-1 verified-badge ${className}`} aria-label="Verified Account">
      <BadgeSvg px={sizeMap[size] || 20} />
      {showText && <span className="text-xs font-medium text-primary">User Verified</span>}
    </span>
  );
};

export default VerificationBadge;
