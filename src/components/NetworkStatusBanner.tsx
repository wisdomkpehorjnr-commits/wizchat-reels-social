import React, { useEffect, useState, useRef } from 'react';
import { Wifi, WifiOff, Zap, AlertCircle } from 'lucide-react';
import { networkStatusManager } from '@/services/networkStatusManager';

type ConnectionStatus = 'online' | 'offline' | 'slow' | 'reconnecting';

interface NetworkStatusBannerProps {
  position?: 'top' | 'bottom';
  variant?: 'minimal' | 'detailed';
  onStatusChange?: (status: ConnectionStatus) => void;
}

/**
 * Real-time network status banner
 * Shows online/offline/slow/reconnecting states with smooth animations
 * Auto-hides after 5 seconds for all statuses except offline
 */
export function NetworkStatusBanner({
  position = 'top',
  variant = 'minimal',
  onStatusChange,
}: NetworkStatusBannerProps) {
  const [status, setStatus] = useState<ConnectionStatus>('online');
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = networkStatusManager.subscribe((newStatus) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);

      // Clear any existing timer
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }

      if (newStatus === 'online') {
        setIsVisible(true);
        setMessage('You are back online');
        // Hide after 5 seconds
        hideTimerRef.current = setTimeout(() => setIsVisible(false), 5000);
      } else if (newStatus === 'offline') {
        setIsVisible(true);
        setMessage('You are offline - using cached data');
        // Auto-hide after 5 seconds (user knows they're offline)
        hideTimerRef.current = setTimeout(() => setIsVisible(false), 5000);
      } else if (newStatus === 'slow') {
        setIsVisible(true);
        setMessage('Slow network detected');
        // Hide after 5 seconds
        hideTimerRef.current = setTimeout(() => setIsVisible(false), 5000);
      } else if (newStatus === 'reconnecting') {
        setIsVisible(true);
        setMessage('Reconnecting...');
        // Hide after 5 seconds
        hideTimerRef.current = setTimeout(() => setIsVisible(false), 5000);
      }
    });

    return () => {
      unsubscribe();
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [onStatusChange]);

  if (!isVisible) {
    return null;
  }

  const getStyles = () => {
    switch (status) {
      case 'offline':
        return {
          bg: 'bg-destructive/90 backdrop-blur-xl',
          border: 'border-destructive/50',
          icon: WifiOff,
          iconColor: 'text-destructive-foreground',
          text: 'text-destructive-foreground',
        };
      case 'slow':
        return {
          bg: 'bg-muted/90 backdrop-blur-xl',
          border: 'border-border/50',
          icon: Zap,
          iconColor: 'text-foreground',
          text: 'text-foreground',
        };
      case 'reconnecting':
        return {
          bg: 'bg-muted/90 backdrop-blur-xl',
          border: 'border-border/50',
          icon: AlertCircle,
          iconColor: 'text-foreground',
          text: 'text-foreground',
        };
      case 'online':
      default:
        return {
          bg: 'bg-muted/90 backdrop-blur-xl',
          border: 'border-border/50',
          icon: Wifi,
          iconColor: 'text-foreground',
          text: 'text-foreground',
        };
    }
  };

  const styles = getStyles();
  const IconComponent = styles.icon;

  const positionClass = position === 'top'
    ? 'fixed top-0 left-0 right-0 z-50'
    : 'fixed bottom-0 left-0 right-0 z-50';

  return (
    <div
      className={`${positionClass} border-b transition-all duration-300 ease-in-out ${styles.bg} ${styles.border}`}
      style={{
        animation: isVisible ? 'slideIn 0.3s ease-out' : 'slideOut 0.3s ease-in',
      }}
    >
      <style>{`
        @keyframes slideIn {
          from {
            transform: translate${position === 'top' ? 'Y(-100%)' : 'Y(100%)'};
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: translate${position === 'top' ? 'Y(-100%)' : 'Y(100%)'};
            opacity: 0;
          }
        }
      `}</style>

      <div className={`px-4 py-3 flex items-center gap-3 ${styles.text}`}>
        <IconComponent className={`w-5 h-5 flex-shrink-0 ${styles.iconColor}`} />

        {variant === 'detailed' ? (
          <div className="flex-1">
            <p className="font-semibold text-sm">{message}</p>
            {status === 'offline' && (
              <p className="text-xs opacity-75 mt-1">
                Your changes will sync when you're back online
              </p>
            )}
            {status === 'slow' && (
              <p className="text-xs opacity-75 mt-1">
                Some features may be slower than usual
              </p>
            )}
            {status === 'reconnecting' && (
              <p className="text-xs opacity-75 mt-1">
                Attempting to restore connection...
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm font-medium">{message}</p>
        )}

        {status === 'reconnecting' && (
          <div className="flex gap-1">
            <div className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Inline status indicator (for use in headers, sidebars)
 */
export function NetworkStatusIndicator() {
  const [status, setStatus] = useState<ConnectionStatus>('online');

  useEffect(() => {
    const unsubscribe = networkStatusManager.subscribe(setStatus);
    return () => unsubscribe();
  }, []);

  const getIndicatorClass = () => {
    switch (status) {
      case 'offline':
        return 'bg-destructive';
      case 'slow':
        return 'bg-muted-foreground';
      case 'reconnecting':
        return 'bg-muted-foreground animate-pulse';
      case 'online':
      default:
        return 'bg-foreground';
    }
  };

  const getTooltip = () => {
    switch (status) {
      case 'offline':
        return 'You are offline';
      case 'slow':
        return 'Slow network';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'online':
      default:
        return 'Online';
    }
  };

  return (
    <div
      className={`w-3 h-3 rounded-full ${getIndicatorClass()} transition-all`}
      title={getTooltip()}
    />
  );
}
