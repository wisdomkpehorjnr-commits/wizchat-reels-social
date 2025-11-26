import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WiFi, WifiOff, AlertCircle, Loader } from 'lucide-react';
import { networkStatusManager, ConnectionStatus, ConnectionSpeed } from '@/services/networkStatusManager';
import { useTheme } from '@/contexts/ThemeContext';

export function NetworkStatusBanner() {
  const { isDark } = useTheme();
  const [status, setStatus] = useState<ConnectionStatus>(
    networkStatusManager.getStatus()
  );
  const [speed, setSpeed] = useState<ConnectionSpeed>(
    networkStatusManager.getSpeed()
  );
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show banner when status changes
    const unsubscribe = networkStatusManager.subscribe((newStatus, newSpeed) => {
      setStatus(newStatus);
      setSpeed(newSpeed);

      // Show banner for non-online states
      if (newStatus !== 'online') {
        setIsVisible(true);
      } else {
        // Auto-hide online banner after 3 seconds
        setIsVisible(true);
        const timer = setTimeout(() => setIsVisible(false), 3000);
        return () => clearTimeout(timer);
      }
    });

    return unsubscribe;
  }, []);

  const getBannerConfig = () => {
    switch (status) {
      case 'offline':
        return {
          bg: isDark ? 'bg-red-900/30' : 'bg-red-100',
          border: 'border-red-500/30',
          text: 'text-red-600 dark:text-red-400',
          icon: WifiOff,
          message: "You're Offline – Viewing cached content.",
          color: '#ef4444',
        };
      case 'reconnecting':
        return {
          bg: isDark ? 'bg-yellow-900/30' : 'bg-yellow-100',
          border: 'border-yellow-500/30',
          text: 'text-yellow-600 dark:text-yellow-400',
          icon: Loader,
          message: 'Reconnecting – Syncing data…',
          color: '#eab308',
          isLoading: true,
        };
      case 'slow':
        return {
          bg: isDark ? 'bg-orange-900/30' : 'bg-orange-100',
          border: 'border-orange-500/30',
          text: 'text-orange-600 dark:text-orange-400',
          icon: AlertCircle,
          message: 'Slow Connection – Showing saved content…',
          color: '#f97316',
        };
      default: // online
        return {
          bg: isDark ? 'bg-green-900/30' : 'bg-green-100',
          border: 'border-green-500/30',
          text: 'text-green-600 dark:text-green-400',
          icon: WiFi,
          message: 'Back Online – Updating content…',
          color: '#22c55e',
        };
    }
  };

  const config = getBannerConfig();
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className={`w-full border-b ${config.bg} ${config.border} px-4 py-3 sticky top-0 z-40`}
        >
          <div className="flex items-center justify-center gap-2">
            {config.isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Icon className={`w-4 h-4 ${config.text}`} style={{ color: config.color }} />
              </motion.div>
            ) : (
              <Icon className={`w-4 h-4 ${config.text}`} style={{ color: config.color }} />
            )}
            <span className={`text-sm font-medium ${config.text}`}>
              {config.message}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Indicator for showing network status inline
 * Useful for showing slow connection with content
 */
export function NetworkStatusIndicator() {
  const { isDark } = useTheme();
  const [status, setStatus] = useState<ConnectionStatus>(
    networkStatusManager.getStatus()
  );

  useEffect(() => {
    const unsubscribe = networkStatusManager.subscribe((newStatus) => {
      setStatus(newStatus);
    });

    return unsubscribe;
  }, []);

  if (status === 'online') return null;

  const colors = {
    offline: '#ef4444',
    slow: '#f97316',
    reconnecting: '#eab308',
  };

  return (
    <div
      className="w-2 h-2 rounded-full"
      style={{ backgroundColor: colors[status as keyof typeof colors] }}
      title={status}
    />
  );
}
