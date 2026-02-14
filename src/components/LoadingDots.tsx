import React from 'react';

const LoadingDots: React.FC = () => {
  return (
    <div className="flex items-center justify-center" aria-hidden>
      <style>{`
        @keyframes ld-bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-8px); }
        }
      `}</style>
      <div className="flex items-end gap-2" style={{ height: 20 }}>
        <div style={{ width: 10, height: 10, borderRadius: 9999, background: 'hsl(var(--primary))', boxShadow: '0 0 0 2px hsl(var(--primary) / 0.08)' , animation: 'ld-bounce 0.8s infinite', animationDelay: '0s' }} />
        <div style={{ width: 10, height: 10, borderRadius: 9999, background: 'hsl(var(--primary))', boxShadow: '0 0 0 2px hsl(var(--primary) / 0.08)' , animation: 'ld-bounce 0.8s infinite', animationDelay: '0.12s' }} />
        <div style={{ width: 10, height: 10, borderRadius: 9999, background: 'hsl(var(--primary))', boxShadow: '0 0 0 2px hsl(var(--primary) / 0.08)' , animation: 'ld-bounce 0.8s infinite', animationDelay: '0.24s' }} />
      </div>
    </div>
  );
};

export default LoadingDots;
