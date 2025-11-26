import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Shimmer animation effect
 */
const shimmerVariants = {
  initial: { backgroundPosition: '200% center' },
  animate: {
    backgroundPosition: '-200% center',
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

/**
 * Post Card Skeleton Loader
 */
export function PostCardSkeleton() {
  const { isDark } = useTheme();
  const bgColor = isDark ? '#1a1a2e' : '#f5f5f5';
  const shimmerColor = isDark ? '#252540' : '#e8e8e8';

  return (
    <motion.div
      variants={shimmerVariants}
      initial="initial"
      animate="animate"
      className="w-full p-4 mb-4 rounded-lg"
      style={{
        background: `linear-gradient(90deg, ${bgColor} 0%, ${shimmerColor} 50%, ${bgColor} 100%)`,
        backgroundSize: '200% 100%',
      }}
    >
      {/* Avatar skeleton */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-full"
          style={{ backgroundColor: shimmerColor }}
        />
        <div className="flex-1">
          <div
            className="h-4 w-32 rounded mb-2"
            style={{ backgroundColor: shimmerColor }}
          />
          <div
            className="h-3 w-24 rounded"
            style={{ backgroundColor: shimmerColor }}
          />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="space-y-3 mb-3">
        <div
          className="h-4 w-full rounded"
          style={{ backgroundColor: shimmerColor }}
        />
        <div
          className="h-4 w-5/6 rounded"
          style={{ backgroundColor: shimmerColor }}
        />
      </div>

      {/* Image skeleton */}
      <div
        className="w-full h-48 rounded-lg mb-3"
        style={{ backgroundColor: shimmerColor }}
      />

      {/* Actions skeleton */}
      <div className="flex gap-4">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="h-4 w-12 rounded"
            style={{ backgroundColor: shimmerColor }}
          />
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Reel Card Skeleton Loader with blur effect
 */
export function ReelCardSkeleton() {
  const { isDark } = useTheme();
  const bgColor = isDark ? '#1a1a2e' : '#e8e8e8';

  return (
    <motion.div
      variants={shimmerVariants}
      initial="initial"
      animate="animate"
      className="w-full h-96 rounded-lg overflow-hidden relative"
      style={{
        background: `linear-gradient(90deg, ${bgColor} 0%, ${isDark ? '#252540' : '#f5f5f5'} 50%, ${bgColor} 100%)`,
        backgroundSize: '200% 100%',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Blurred overlay */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Center play icon skeleton */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-16 h-16 rounded-full"
          style={{ backgroundColor: isDark ? '#252540' : '#f5f5f5' }}
        />
      </div>
    </motion.div>
  );
}

/**
 * Comment Skeleton Loader
 */
export function CommentSkeleton() {
  const { isDark } = useTheme();
  const shimmerColor = isDark ? '#252540' : '#e8e8e8';

  return (
    <motion.div
      variants={shimmerVariants}
      initial="initial"
      animate="animate"
      className="flex gap-3 mb-4"
      style={{
        backgroundImage: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)`,
        backgroundSize: '200% 100%',
      }}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex-shrink-0"
        style={{ backgroundColor: shimmerColor }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div
          className="h-4 w-24 rounded mb-2"
          style={{ backgroundColor: shimmerColor }}
        />
        <div
          className="h-3 w-full rounded mb-1"
          style={{ backgroundColor: shimmerColor }}
        />
        <div
          className="h-3 w-4/5 rounded"
          style={{ backgroundColor: shimmerColor }}
        />
      </div>
    </motion.div>
  );
}

/**
 * Pulsating Dots Loader - lightweight alternative
 */
export function PulsatingDots() {
  const { isDark } = useTheme();
  const dotColor = isDark ? '#8338ec' : '#ff006e';

  const dotVariants = {
    initial: { opacity: 0.4, scale: 0.8 },
    animate: {
      opacity: [0.4, 1, 0.4],
      scale: [0.8, 1, 0.8],
      transition: {
        duration: 1.2,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          variants={dotVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: i * 0.2 }}
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
      ))}
    </div>
  );
}

/**
 * List Skeleton - for multiple items
 */
export function ListSkeleton({ count = 3, type = 'post' }: { count?: number; type?: 'post' | 'comment' | 'reel' }) {
  return (
    <div className="w-full space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          {type === 'post' && <PostCardSkeleton />}
          {type === 'comment' && <CommentSkeleton />}
          {type === 'reel' && <ReelCardSkeleton />}
        </div>
      ))}
    </div>
  );
}

/**
 * Feed Skeleton - simulates the home feed
 */
export function FeedSkeleton() {
  return (
    <div className="w-full space-y-4 p-4">
      {/* Story section skeleton */}
      <div className="flex gap-3 mb-6 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
            className="w-12 h-12 rounded-full flex-shrink-0"
            style={{
              background: 'linear-gradient(90deg, #e8e8e8 0%, #f5f5f5 50%, #e8e8e8 100%)',
              backgroundSize: '200% 100%',
            }}
          />
        ))}
      </div>

      {/* Posts skeleton */}
      <ListSkeleton count={3} type="post" />
    </div>
  );
}

/**
 * Profile Section Skeleton
 */
export function ProfileSectionSkeleton() {
  const { isDark } = useTheme();
  const shimmerColor = isDark ? '#252540' : '#e8e8e8';

  return (
    <motion.div
      variants={shimmerVariants}
      initial="initial"
      animate="animate"
      className="w-full p-4 rounded-lg"
      style={{
        background: `linear-gradient(90deg, ${isDark ? '#1a1a2e' : '#f5f5f5'} 0%, ${shimmerColor} 50%, ${isDark ? '#1a1a2e' : '#f5f5f5'} 100%)`,
        backgroundSize: '200% 100%',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-full"
          style={{ backgroundColor: shimmerColor }}
        />
        <div className="flex-1">
          <div
            className="h-4 w-32 rounded mb-2"
            style={{ backgroundColor: shimmerColor }}
          />
          <div
            className="h-3 w-24 rounded"
            style={{ backgroundColor: shimmerColor }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-around mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="text-center">
            <div
              className="h-4 w-8 rounded mx-auto mb-2"
              style={{ backgroundColor: shimmerColor }}
            />
            <div
              className="h-3 w-12 rounded mx-auto"
              style={{ backgroundColor: shimmerColor }}
            />
          </div>
        ))}
      </div>

      {/* Bio */}
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded"
            style={{
              backgroundColor: shimmerColor,
              width: i === 1 ? '80%' : '100%',
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Skeleton wrapper with fade-in animation
 */
export function SkeletonLoader({
  isLoading,
  children,
  skeleton = <PostCardSkeleton />,
  duration = 0.3,
}: {
  isLoading: boolean;
  children: React.ReactNode;
  skeleton?: React.ReactNode;
  duration?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isLoading ? 1 : 0 }}
      transition={{ duration }}
      className={isLoading ? 'block' : 'hidden'}
    >
      {skeleton}
    </motion.div>
  );
}
