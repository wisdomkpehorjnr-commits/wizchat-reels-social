import React from 'react';

/**
 * Theme-aware skeleton loaders with shimmer effect
 * White in light mode, black in dark mode
 * Used for loading states across the app
 */

// Shimmer animation - white in light mode, black in dark mode
const shimmerClass = `
  animate-pulse
  bg-gradient-to-r
  from-transparent
  via-white
  to-transparent
  dark:via-slate-900
  dark:from-slate-800
  dark:to-slate-800
`;

/**
 * Pulsating dots loader for small spaces
 * Used in loading indicators, message sending status
 */
export function PulsatingDots() {
  return (
    <div className="flex gap-1">
      <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-slate-600 animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-slate-600 animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-slate-600 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

/**
 * Skeleton for post card content
 * Simulates: avatar, name, timestamp, content, image, actions
 */
export function PostCardSkeleton() {
  return (
    <div className="space-y-4 p-4 bg-white dark:bg-slate-950 rounded-lg border border-gray-200 dark:border-slate-800">
      {/* Header: Avatar, Name, Timestamp */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-800 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-3 w-16 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
        </div>
      </div>

      {/* Content text */}
      <div className="space-y-2">
        <div className="h-4 w-full bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />
      </div>

      {/* Image placeholder */}
      <div className="w-full h-48 bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />

      {/* Actions */}
      <div className="flex gap-4 pt-2">
        <div className="h-4 w-12 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
        <div className="h-4 w-12 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
        <div className="h-4 w-12 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
      </div>
    </div>
  );
}

/**
 * Skeleton for reel card (video thumbnail, title, metadata)
 */
export function ReelCardSkeleton() {
  return (
    <div className="space-y-2 rounded-lg overflow-hidden bg-white dark:bg-slate-950">
      {/* Video thumbnail */}
      <div className="w-full aspect-video bg-gray-200 dark:bg-slate-800 animate-pulse rounded" />

      {/* Title */}
      <div className="px-2 pt-2">
        <div className="h-4 w-4/5 bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />
      </div>

      {/* Metadata */}
      <div className="px-2 pb-2 space-y-2">
        <div className="h-3 w-1/2 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
        <div className="h-3 w-1/3 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
      </div>
    </div>
  );
}

/**
 * Skeleton for comment/message item
 */
export function CommentSkeleton() {
  return (
    <div className="flex gap-3 py-3">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-800 flex-shrink-0 animate-pulse" />

      {/* Comment content */}
      <div className="flex-1 space-y-2">
        <div className="h-3 w-24 bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="space-y-1">
          <div className="h-3 w-full bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-3 w-5/6 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="h-3 w-20 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
      </div>
    </div>
  );
}

/**
 * Skeleton for feed/timeline (multiple posts)
 */
export function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for profile section header (avatar, name, bio, stats)
 */
export function ProfileSectionSkeleton() {
  return (
    <div className="space-y-4 p-4 bg-white dark:bg-slate-950 rounded-lg border border-gray-200 dark:border-slate-800">
      {/* Banner */}
      <div className="h-24 w-full bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />

      {/* Avatar and info */}
      <div className="flex gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-slate-800 animate-pulse -mt-8 border-4 border-white dark:border-slate-950" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-32 bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-3 w-48 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <div className="h-3 w-full bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
        <div className="h-3 w-4/5 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 pt-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-5 w-12 bg-gray-200 dark:bg-slate-800 rounded animate-pulse mx-auto" />
            <div className="h-3 w-16 bg-gray-100 dark:bg-slate-700 rounded animate-pulse mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for list items (friends, rooms, etc.)
 */
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-800 animate-pulse" />

      {/* Content */}
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-3 w-48 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
      </div>

      {/* Action button */}
      <div className="w-8 h-8 bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />
    </div>
  );
}

/**
 * Skeleton for topic/room card
 */
export function TopicRoomSkeleton() {
  return (
    <div className="space-y-3 p-3 bg-white dark:bg-slate-950 rounded-lg border border-gray-200 dark:border-slate-800">
      {/* Room icon/image */}
      <div className="w-full h-32 bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />

      {/* Title */}
      <div className="h-4 w-3/4 bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />

      {/* Description */}
      <div className="space-y-1">
        <div className="h-3 w-full bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
        <div className="h-3 w-4/5 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
      </div>

      {/* Member count */}
      <div className="h-3 w-20 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
    </div>
  );
}

/**
 * Skeleton for message item in chat list
 */
export function ChatListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800">
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-slate-800 animate-pulse" />

      {/* Chat info */}
      <div className="flex-1 space-y-2">
        <div className="h-4 w-28 bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-3 w-48 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
      </div>

      {/* Time/unread */}
      <div className="space-y-2">
        <div className="h-3 w-12 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
        <div className="w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-900 animate-pulse" />
      </div>
    </div>
  );
}

interface ListSkeletonProps {
  count?: number;
  itemType?: 'default' | 'chat' | 'topic' | 'reel';
}

/**
 * Generic list skeleton with configurable item count and type
 */
export function ListSkeleton({
  count = 5,
  itemType = 'default',
}: ListSkeletonProps) {
  const getItemSkeleton = () => {
    switch (itemType) {
      case 'chat':
        return <ChatListItemSkeleton />;
      case 'topic':
        return <TopicRoomSkeleton />;
      case 'reel':
        return <ReelCardSkeleton />;
      default:
        return <ListItemSkeleton />;
    }
  };

  return (
    <div className="space-y-2">
      {[...Array(count)].map((_, i) => (
        <div key={i}>
          {getItemSkeleton()}
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for inline loading (replacing single element)
 */
export function InlineSkeleton({
  width = 'w-24',
  height = 'h-4',
}: {
  width?: string;
  height?: string;
}) {
  return (
    <div className={`${width} ${height} bg-gray-200 dark:bg-slate-800 rounded animate-pulse`} />
  );
}
