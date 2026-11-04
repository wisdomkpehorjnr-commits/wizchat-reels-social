import React from 'react';

// Modern scalloped "rosette" verification badge (Instagram / X / Facebook style)
export const BADGE_PATH =
  'M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91C2.63 9.33 1.75 10.57 1.75 12s.88 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z';

export const BadgeSvg: React.FC<{ px?: number; className?: string }> = ({ px = 18, className = '' }) => (
  <svg width={px} height={px} viewBox="0 0 24 24" className={`shrink-0 ${className}`} aria-hidden="true">
    <path d={BADGE_PATH} fill="#1D9BF0" />
    <path d="M8.2 12.3l2.6 2.6 5-5.4" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const VerifiedBadge: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 18 }) => (
  <span title="Verified" className={`inline-flex items-center verified-badge ${className}`} aria-label="Verified Account">
    <BadgeSvg px={size} />
  </span>
);

export default VerifiedBadge;
