import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Clapperboard, ChevronRight } from 'lucide-react';

interface ReelsPromoCardProps {
  reels?: { id: string; imageUrl?: string; videoUrl?: string }[];
}

/**
 * Pinned "Reels" card injected into the home feed every 30 posts.
 * Theme-aware, rounded, glass styled.
 */
const ReelsPromoCard: React.FC<ReelsPromoCardProps> = ({ reels = [] }) => {
  const navigate = useNavigate();
  const previews = reels.slice(0, 3);

  return (
    <button
      type="button"
      onClick={() => navigate('/reels')}
      className="w-full text-left rounded-3xl overflow-hidden border border-border/60 bg-card/70 backdrop-blur-xl shadow-sm transition-all active:scale-[0.99] hover:shadow-md"
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
            <Clapperboard className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-foreground truncate">Reels</p>
            <p className="text-xs text-muted-foreground truncate">Short videos picked for you</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-foreground/10 backdrop-blur-xl px-3 py-1.5 text-xs font-medium text-foreground shrink-0">
          Watch <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5 px-3 pb-4">
        {[0, 1, 2].map((i) => {
          const reel = previews[i];
          return (
            <div
              key={reel?.id ?? `ph-${i}`}
              className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-muted"
            >
              {reel?.imageUrl ? (
                <img src={reel.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : reel?.videoUrl ? (
                <video src={reel.videoUrl} muted playsInline preload="metadata" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/25 via-primary/10 to-transparent" />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="w-8 h-8 rounded-full bg-background/40 backdrop-blur-xl border border-foreground/20 flex items-center justify-center">
                  <Play className="w-3.5 h-3.5 text-foreground fill-current" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </button>
  );
};

export default ReelsPromoCard;
