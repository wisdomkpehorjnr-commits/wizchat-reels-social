
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clapperboard, ChevronRight, Play } from 'lucide-react';

interface ReelsPromoCardProps {
  reels?: {
    id: string;
    imageUrl?: string;
    videoUrl?: string;
    content?: string;
    user?: any;
  }[];
  /** Rotating index of this promo card occurrence within the feed */
  promoIndex?: number;
}

/**
 * Facebook-inspired Reels preview card for the Home feed.
 * Uses the same outer footprint as a regular post card.
 * The preview does not autoplay; tapping opens the selected reel.
 */
const ReelsPromoCard: React.FC<ReelsPromoCardProps> = ({
  reels = [],
  promoIndex = 0,
}) => {
  const navigate = useNavigate();

  const reel = useMemo(() => {
    if (!reels.length) return null;

    const idx = ((promoIndex % reels.length) + reels.length) % reels.length;
    return reels[idx];
  }, [reels, promoIndex]);

  const open = () => {
    if (reel?.id) {
      navigate(`/reels?reel=${reel.id}`);
    } else {
      navigate('/reels');
    }
  };

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Explore Reels"
      className="group block w-full overflow-hidden rounded-2xl border border-border/60 bg-card text-left text-card-foreground shadow-sm transition-shadow hover:shadow-md active:scale-[0.995]"
    >
      {/* Reels header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Clapperboard className="h-5 w-5" strokeWidth={2.4} />
          </div>

          <div className="min-w-0">
            <p className="truncate text-base font-bold text-foreground">
              Explore Reels
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {reel?.user?.name
                ? `From ${reel.user.name}`
                : 'Discover short videos'}
            </p>
          </div>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-3 py-2 text-xs font-semibold text-foreground transition-colors group-hover:bg-primary/10">
          Watch
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>

      {/* Full-width reel preview */}
      <div className="relative w-full overflow-hidden bg-black aspect-[9/10]">
        {reel?.videoUrl ? (
          <video
            src={`${reel.videoUrl}#t=0.1`}
            className="absolute inset-0 h-full w-full object-cover"
            muted
            playsInline
            preload="metadata"
            aria-hidden="true"
          />
        ) : reel?.imageUrl ? (
          <img
            src={reel.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-primary/15 to-black" />
        )}

        {/* Subtle video shading */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/5" />

        {/* Center play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/40 bg-black/35 text-white shadow-xl backdrop-blur-sm transition-transform duration-200 group-hover:scale-110">
            <Play className="ml-1 h-7 w-7 fill-white text-white" />
          </div>
        </div>

        {/* Reel caption */}
        {reel?.content && (
          <div className="absolute inset-x-0 bottom-0 p-4 text-left">
            <p className="line-clamp-2 text-sm font-semibold leading-relaxed text-white drop-shadow-md">
              {reel.content}
            </p>
          </div>
        )}
      </div>
    </button>
  );
};

export default ReelsPromoCard;
