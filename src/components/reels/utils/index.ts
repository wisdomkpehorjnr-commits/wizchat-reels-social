/**
 * Format large numbers for display
 */
export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

/**
 * Format timestamp relative to now
 */
export const formatTimeAgo = (date: string | Date): string => {
  const now = new Date();
  const target = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((now.getTime() - target.getTime()) / 1000);

  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  return `${years}y`;
};

/**
 * Format duration for display
 */
export const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

/**
 * Extract hashtags from text
 */
export const extractHashtags = (text: string): string[] => {
  const regex = /#[\w]+/g;
  const matches = text.match(regex) || [];
  return matches.map((tag) => tag.substring(1)); // Remove #
};

/**
 * Extract mentions from text
 */
export const extractMentions = (text: string): string[] => {
  const regex = /@[\w]+/g;
  const matches = text.match(regex) || [];
  return matches.map((mention) => mention.substring(1)); // Remove @
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

/**
 * Highlight hashtags and mentions in text
 */
export const highlightHashtagsAndMentions = (
  text: string
): Array<{ type: 'text' | 'hashtag' | 'mention'; content: string }> => {
  const parts: Array<{ type: 'text' | 'hashtag' | 'mention'; content: string }> = [];
  const regex = /(#[\w]+)|(@[\w]+)|([^#@]+)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      // Hashtag
      parts.push({ type: 'hashtag', content: match[1] });
    } else if (match[2]) {
      // Mention
      parts.push({ type: 'mention', content: match[2] });
    } else if (match[3]) {
      // Regular text
      parts.push({ type: 'text', content: match[3] });
    }
  }

  return parts;
};

/**
 * Calculate scroll snap index
 */
export const calculateSnapIndex = (scrollY: number, itemHeight: number): number => {
  return Math.round(scrollY / itemHeight);
};

/**
 * Calculate scroll progress (0-1)
 */
export const calculateScrollProgress = (scrollY: number, itemHeight: number, totalItems: number): number => {
  const currentIndex = scrollY / itemHeight;
  return Math.min(currentIndex / totalItems, 1);
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Throttle function
 */
export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      fn(...args);
      lastCall = now;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fn(...args);
        lastCall = Date.now();
      }, delay - (now - lastCall));
    }
  };
};

/**
 * Generate unique ID
 */
export const generateUniqueId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Clamp value between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(value, max));
};

/**
 * Linear interpolation
 */
export const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t;
};

/**
 * Ease out quad
 */
export const easeOutQuad = (t: number): number => {
  return t * (2 - t);
};

/**
 * Ease out cubic
 */
export const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

/**
 * Ease out elastic
 */
export const easeOutElastic = (t: number): number => {
  const c5 = (2 * Math.PI) / 4.5;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c5) + 1;
};

/**
 * Check if device is mobile
 */
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Check if device supports touch
 */
export const isTouchSupported = (): boolean => {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
};

/**
 * Get safe area insets for notch/cutout
 */
export const getSafeAreaInsets = () => {
  const styles = getComputedStyle(document.documentElement);
  return {
    top: styles.getPropertyValue('--safe-area-inset-top') || '0',
    right: styles.getPropertyValue('--safe-area-inset-right') || '0',
    bottom: styles.getPropertyValue('--safe-area-inset-bottom') || '0',
    left: styles.getPropertyValue('--safe-area-inset-left') || '0',
  };
};

/**
 * Get viewport dimensions
 */
export const getViewportDimensions = () => {
  return {
    width: Math.min(window.innerWidth, window.screen.width),
    height: Math.min(window.innerHeight, window.screen.height),
  };
};

/**
 * Validate URL
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get video thumbnail
 */
export const getVideoThumbnail = (videoElement: HTMLVideoElement): string | null => {
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(videoElement, 0, 0);
  return canvas.toDataURL();
};
