/**
 * Smart Loading Component
 * Automatically manages loading states with skeleton fallbacks
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SmartLoadingProps {
  isLoading: boolean;
  error?: Error | null;
  isEmpty?: boolean;
  skeleton?: React.ReactNode;
  errorFallback?: React.ReactNode;
  emptyFallback?: React.ReactNode;
  children: React.ReactNode;
  duration?: number;
}

/**
 * Smart Loading Component
 * Manages all loading states with smooth transitions
 */
export function SmartLoading({
  isLoading,
  error,
  isEmpty,
  skeleton,
  errorFallback,
  emptyFallback,
  children,
  duration = 0.2,
}: SmartLoadingProps) {
  return (
    <AnimatePresence mode="wait">
      {error && errorFallback && (
        <motion.div
          key="error"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration }}
        >
          {errorFallback}
        </motion.div>
      )}

      {isLoading && !error && skeleton && (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration }}
        >
          {skeleton}
        </motion.div>
      )}

      {!isLoading && !error && isEmpty && emptyFallback && (
        <motion.div
          key="empty"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration }}
        >
          {emptyFallback}
        </motion.div>
      )}

      {!isLoading && !error && !isEmpty && (
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Pagination Loading Helper
 * Shows skeletons while loading next page
 */
interface PaginationLoadingProps {
  isLoadingMore: boolean;
  hasMore: boolean;
  skeleton?: React.ReactNode;
  children: React.ReactNode;
}

export function PaginationLoading({
  isLoadingMore,
  hasMore,
  skeleton,
  children,
}: PaginationLoadingProps) {
  return (
    <>
      {children}
      {isLoadingMore && hasMore && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>{skeleton}</div>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Stale While Revalidate Component
 * Shows stale cached content while fetching fresh data
 */
interface StaleWhileRevalidateProps {
  isCached: boolean;
  isLoading: boolean;
  children: React.ReactNode;
  cacheLabel?: string;
}

export function StaleWhileRevalidate({
  isCached,
  isLoading,
  children,
  cacheLabel = 'Showing saved content',
}: StaleWhileRevalidateProps) {
  return (
    <div className="relative">
      {children}
      {isCached && isLoading && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-yellow-500/10 to-transparent px-4 py-2 text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          <span>{cacheLabel}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Content Fade In Component
 * Smooth fade-in for content that appears after loading
 */
interface ContentFadeInProps {
  show: boolean;
  duration?: number;
  delay?: number;
  children: React.ReactNode;
}

export function ContentFadeIn({
  show,
  duration = 0.3,
  delay = 0,
  children,
}: ContentFadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: show ? 1 : 0 }}
      transition={{ duration, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Refresh Button with Loading State
 */
interface RefreshButtonProps {
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
  className?: string;
}

export function RefreshButton({ isRefreshing, onRefresh, className = '' }: RefreshButtonProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  const handleRefresh = async () => {
    try {
      await onRefresh();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Refresh failed:', error);
    }
  };

  return (
    <motion.button
      onClick={handleRefresh}
      disabled={isRefreshing || showSuccess}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${className}`}
      whileHover={{ scale: isRefreshing ? 1 : 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        animate={{ rotate: isRefreshing ? 360 : 0 }}
        transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0 }}
      >
        {showSuccess ? '✓' : '↻'}
      </motion.div>
      <span className="ml-2">{isRefreshing ? 'Refreshing...' : showSuccess ? 'Updated!' : 'Refresh'}</span>
    </motion.button>
  );
}

/**
 * Cached Content Badge
 * Shows when content is from cache
 */
interface CachedBadgeProps {
  isCached: boolean;
  timestamp?: number;
}

export function CachedBadge({ isCached, timestamp }: CachedBadgeProps) {
  if (!isCached) return null;

  const timeAgo = timestamp ? Math.round((Date.now() - timestamp) / 1000 / 60) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium"
    >
      <span>💾</span>
      <span>{timeAgo > 0 ? `Cached ${timeAgo}m ago` : 'From cache'}</span>
    </motion.div>
  );
}
