import { CheckCircle2 } from 'lucide-react';

interface VerificationBadgeProps {
  isVerified?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const VerificationBadge = ({ 
  isVerified, 
  size = 'sm', 
  showText = false,
  className = '' 
}: VerificationBadgeProps) => {
  if (!isVerified) return null;

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <CheckCircle2 
        className={`${sizeClasses[size]} text-blue-500 fill-blue-500`} 
      />
      {showText && (
        <span className={`${textSizeClasses[size]} text-blue-500 font-semibold`}>
          Verified
        </span>
      )}
    </div>
  );
};

export default VerificationBadge;
