import React from 'react';

const VerifiedBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    title="Verified"
    className={`inline-flex items-center ${className}`}
    aria-label="Verified Account"
  >
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="9" fill="#1DA1F2"/>
      <path d="M13 6.5L8.25 11.25L6 9" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </span>
);

export default VerifiedBadge;
