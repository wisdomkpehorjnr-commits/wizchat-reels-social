import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { OfflineAwareImage } from './PostCard';

interface GridProps {
  images: string[];
  isMobile: boolean;
  onOpen: (index: number) => void;
  onLongPressStart?: (img: string) => void;
  onLongPressEnd?: () => void;
}

/** Facebook-style multi-photo grid: 2 tiles on phones, up to 4 on larger screens, "+N" on the last tile. */
export function PostImageGrid({ images, isMobile, onOpen, onLongPressStart, onLongPressEnd }: GridProps) {
  const maxTiles = isMobile ? 2 : 4;
  const shown = images.slice(0, Math.min(images.length, maxTiles));
  const remaining = images.length - shown.length;

  const tile = (img: string, i: number, extra = '') => (
    <button
      key={i}
      type="button"
      className={`relative overflow-hidden bg-muted active:opacity-90 transition-opacity ${extra}`}
      onClick={() => onOpen(i)}
      onTouchStart={() => onLongPressStart?.(img)}
      onTouchEnd={onLongPressEnd}
      onMouseDown={() => onLongPressStart?.(img)}
      onMouseUp={onLongPressEnd}
      onMouseLeave={onLongPressEnd}
      aria-label={`Open photo ${i + 1} of ${images.length}`}
    >
      <OfflineAwareImage src={img} alt="" wrapperClassName="absolute inset-0" className="absolute inset-0 h-full w-full object-cover" />
      {i === shown.length - 1 && remaining > 0 && (
        <span className="absolute inset-0 flex items-center justify-center bg-background/55 backdrop-blur-[2px] text-foreground text-2xl font-bold">
          +{remaining}
        </span>
      )}
    </button>
  );

  // 3 photos on larger screens: one tall left, two stacked right.
  if (shown.length === 3) {
    return (
      <div className="grid grid-cols-2 grid-rows-2 gap-0.5 aspect-square max-h-[32rem] w-full">
        {tile(shown[0], 0, 'row-span-2')}
        {tile(shown[1], 1)}
        {tile(shown[2], 2)}
      </div>
    );
  }
  if (shown.length === 2) {
    return <div className="grid grid-cols-2 gap-0.5 w-full aspect-[4/3] max-h-[32rem]">{shown.map((s, i) => tile(s, i))}</div>;
  }
  return <div className="grid grid-cols-2 grid-rows-2 gap-0.5 w-full aspect-square max-h-[36rem]">{shown.map((s, i) => tile(s, i))}</div>;
}

interface GalleryProps {
  images: string[];
  startIndex: number;
  onClose: () => void;
}

/** Full-screen vertical scroller showing every photo of a post. */
export function PostImageGallery({ images, startIndex, onClose }: GalleryProps) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-gallery-index="${startIndex}"]`);
    el?.scrollIntoView({ block: 'start' });
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [startIndex, onClose]);

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[250] bg-background text-foreground flex flex-col"
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
      transition={{ type: 'spring', damping: 26, stiffness: 280 }}
      role="dialog" aria-modal="true" aria-label="All photos"
    >
      <div className="flex items-center gap-3 px-3 h-14 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <button type="button" onClick={onClose} aria-label="Back" className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-muted active:scale-95 transition">
          <ArrowLeft className="h-5 w-5 app-chrome-icon" strokeWidth={2.4} />
        </button>
        <span className="text-sm font-semibold">{images.length} photos</span>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-2xl flex flex-col gap-1.5 py-1.5">
          {images.map((img, i) => (
            <div key={i} data-gallery-index={i} className="bg-muted">
              <OfflineAwareImage src={img} alt="" className="w-full h-auto object-contain" />
            </div>
          ))}
        </div>
      </div>
    </motion.div>,
    document.body
  );
}
