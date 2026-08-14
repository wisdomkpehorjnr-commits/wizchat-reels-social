import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clapperboard, ChevronRight } from 'lucide-react';

interface ReelsPromoCardProps {
  reels?: { id: string; imageUrl?: string; videoUrl?: string; content?: string; user?: any }[];
  /** Rotating index of this promo card occurrence within the feed */
  promoIndex?: number;
}

/**
 * "Explore Reels" card injected into the home feed.
 * Shows a clean, non-autoplaying preview of one reel (cycled deterministically
 * so consecutive cards never repeat) and deep-links straight to that reel.
 */
const ReelsPromoCard: React.FC<ReelsPromoCardProps> = ({ reels = [], promoIndex = 0 }) => {
  const navigate = useNavigate();

  const reel = useMemo(() => {
    if (!reels.length) return null;
    const idx = ((promoIndex % reels.length) + reels.length) % reels.length;
    return reels[idx];
  }, [reels, promoIndex]);


  const open = () => {
    if (reel?.id) navigate(`/reels?reel=${reel.id}`);
    else navigate('/reels');
  };

  return (
    <button
      type="button"
      onClick={open}
      className="w-full text-left rounded-3xl overflow-hidden border border-border bg-card shadow-sm transition-all active:scale-[0.99] hover:shadow-md"
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
            <Clapperboard className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-foreground truncate">Explore Reels</p>
            <p className="text-xs text-muted-foreground truncate">
              {reel?.user?.name ? `From ${reel.user.name}` : 'Short videos picked for you'}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground shrink-0">
          Watch <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>

      <div className="px-3 pb-4">
        <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-muted">
          {reel?.videoUrl ? (
            <video
              src={`${reel.videoUrl}#t=0.1`}
              className="absolute inset-0 w-full h-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : reel?.imageUrl ? (
            <img src={reel.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent" />
          )}
          {reel?.content && (
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-background/90 to-transparent">
              <p className="text-xs font-medium text-foreground line-clamp-1">{reel.content}</p>
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

export default ReelsPromoCard;
