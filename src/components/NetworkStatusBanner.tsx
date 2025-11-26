import React, { useEffect, useState } from 'react';
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
 */
export function NetworkStatusBanner({
  position = 'top',
  variant = 'minimal',
  onStatusChange,
}: NetworkStatusBannerProps) {
  const [status, setStatus] = useState<ConnectionStatus>('online');
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsubscribe = networkStatusManager.subscribe((newStatus) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);

      if (newStatus === 'online') {
        setIsVisible(true);
        setMessage('You are back online');
        setTimeout(() => setIsVisible(false), 3000);
      } else if (newStatus === 'offline') {
        setIsVisible(true);
        setMessage('You are offline - using cached data');
      } else if (newStatus === 'slow') {
        setIsVisible(true);
        setMessage('Slow network detected');
      } else if (newStatus === 'reconnecting') {
        setIsVisible(true);
        setMessage('Reconnecting...');
      }
    });

    return () => unsubscribe();
  }, [onStatusChange]);

  if (!isVisible && status === 'online') {
    return null;
  }

  const getStyles = () => {
    switch (status) {
      case 'offline':
        return {
          bg: 'bg-red-50 dark:bg-red-950',
          border: 'border-red-200 dark:border-red-800',
          icon: WifiOff,
          iconColor: 'text-red-600 dark:text-red-400',
          text: 'text-red-800 dark:text-red-200',
        };
      case 'slow':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950',
          border: 'border-amber-200 dark:border-amber-800',
          icon: Zap,
          iconColor: 'text-amber-600 dark:text-amber-400',
          text: 'text-amber-800 dark:text-amber-200',
        };
      case 'reconnecting':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950',
          border: 'border-blue-200 dark:border-blue-800',
          icon: AlertCircle,
          iconColor: 'text-blue-600 dark:text-blue-400',
          text: 'text-blue-800 dark:text-blue-200',
        };
      case 'online':
      default:
        return {
          bg: 'bg-green-50 dark:bg-green-950',
          border: 'border-green-200 dark:border-green-800',
          icon: Wifi,
          iconColor: 'text-green-600 dark:text-green-400',
          text: 'text-green-800 dark:text-green-200',
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
        return 'bg-red-500';
      case 'slow':
        return 'bg-amber-500';
      case 'reconnecting':
        return 'bg-blue-500 animate-pulse';
      case 'online':
      default:
        return 'bg-green-500';
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
