import React, { useState } from 'react';
import { WifiOff } from 'lucide-react';

interface OfflineScreenProps {
  onRetry?: () => void;
}

const OfflineScreen: React.FC<OfflineScreenProps> = ({ onRetry }) => {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = () => {
    setRetrying(true);
    if (onRetry) onRetry();
    // Try a network ping then reload
    setTimeout(() => {
      if (navigator.onLine) {
        window.location.reload();
      } else {
        setRetrying(false);
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background p-6">
      <div
        className="w-full max-w-sm rounded-3xl px-8 py-10 text-center border border-border/50 shadow-2xl"
        style={{
          background: 'hsl(var(--card) / 0.9)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        <div className="flex justify-center mb-6">
          <WifiOff className="w-16 h-16 text-foreground" strokeWidth={1.75} />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">No Internet</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          Your device is currently offline.<br />
          Check your connection and try again.
        </p>
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="w-full py-3 rounded-full font-semibold text-sm bg-foreground text-background hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-60"
        >
          {retrying ? 'Retrying…' : 'Retry'}
        </button>
      </div>
    </div>
  );
};

export default OfflineScreen;
