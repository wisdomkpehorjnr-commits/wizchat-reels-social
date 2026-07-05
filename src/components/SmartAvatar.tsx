import React from 'react';
import { UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useImageCache } from '@/hooks/useImageCache';

/**
 * SmartAvatar
 * - Renders a plain <img> using the persistent image cache so the avatar
 *   NEVER blinks/shows initials before the picture appears (Radix's AvatarImage
 *   flashes its fallback during load — this avoids that entirely).
 * - Default fallback is a neutral human icon (UserRound) instead of initials.
 * - Fully theme-aware via `bg-muted` + `text-muted-foreground` tokens.
 */
interface SmartAvatarProps {
  src?: string | null;
  alt?: string;
  className?: string;
  iconClassName?: string;
  onClick?: (e: React.MouseEvent<HTMLSpanElement>) => void;
}

const SmartAvatar: React.FC<SmartAvatarProps> = ({
  src,
  alt,
  className,
  iconClassName,
  onClick,
}) => {
  const { cachedUrl } = useImageCache(src || undefined);
  const finalSrc = (cachedUrl || src || '').trim();
  const [errored, setErrored] = React.useState(false);

  const showImage = !!finalSrc && !errored;

  return (
    <span
      onClick={onClick}
      className={cn(
        'relative inline-flex shrink-0 overflow-hidden rounded-full bg-muted',
        'h-10 w-10',
        className
      )}
    >
      <span className="absolute inset-0 grid place-items-center pointer-events-none">
        <UserRound
          className={cn('w-1/2 h-1/2 text-muted-foreground', iconClassName)}
          strokeWidth={2}
        />
      </span>
      {showImage && (
        <img
          src={finalSrc}
          alt={alt || ''}
          decoding="sync"
          loading="eager"
          draggable={false}
          onError={() => setErrored(true)}
          className="relative z-10 w-full h-full object-cover"
        />
      )}
    </span>
  );
};

export default SmartAvatar;
