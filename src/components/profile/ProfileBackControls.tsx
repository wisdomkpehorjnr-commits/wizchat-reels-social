import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Glass back button + swipe-down-to-exit gesture for the Profile page.
 * - Tapping the back button navigates(-1) so the user returns to where they came from.
 * - Swiping down from the top of the screen (>120px) also triggers back navigation.
 */
const ProfileBackControls: React.FC = () => {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const startY = useRef<number | null>(null);
  const tracking = useRef(false);

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      // Only start tracking when the user starts near the top of the viewport
      if (window.scrollY > 4) return;
      if (e.touches[0].clientY > 80) return;
      startY.current = e.touches[0].clientY;
      tracking.current = true;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!tracking.current || startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) setOffset(Math.min(dy, 200));
    };
    const onTouchEnd = () => {
      if (!tracking.current) return;
      tracking.current = false;
      const dy = offset;
      setOffset(0);
      startY.current = null;
      if (dy > 120) goBack();
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [offset]);

  return (
    <>
      {/* Visual pull-down hint */}
      {offset > 8 && (
        <div
          className="fixed top-0 left-0 right-0 z-[60] flex justify-center pointer-events-none"
          style={{ transform: `translateY(${Math.min(offset, 100)}px)` }}
        >
          <div className="mt-2 px-4 py-1.5 rounded-full bg-foreground/80 text-background text-xs font-medium backdrop-blur-md">
            {offset > 120 ? 'Release to go back' : 'Swipe down to go back'}
          </div>
        </div>
      )}

      <button
        onClick={goBack}
        aria-label="Go back"
        className="fixed top-3 left-3 z-[55] w-10 h-10 rounded-full flex items-center justify-center border border-border/60 shadow-lg hover:scale-105 active:scale-95 transition-transform"
        style={{
          background: 'hsl(var(--background) / 0.55)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={2.25} />
      </button>
    </>
  );
};

export default ProfileBackControls;
