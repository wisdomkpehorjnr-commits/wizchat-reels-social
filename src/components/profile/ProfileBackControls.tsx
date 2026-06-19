import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Swipe-down-to-exit gesture for the Profile page.
 * The visible back button has been removed (it overlapped the app logo).
 * Sensitivity: starts tracking anywhere on the page when scrolled to the top,
 * with a low 50px threshold for an easy gesture.
 */
const ProfileBackControls: React.FC = () => {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const startY = useRef<number | null>(null);
  const tracking = useRef(false);
  const lastOffsetRef = useRef(0);

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 4) return;
      startY.current = e.touches[0].clientY;
      tracking.current = true;
      lastOffsetRef.current = 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!tracking.current || startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) {
        const next = Math.min(dy, 240);
        lastOffsetRef.current = next;
        setOffset(next);
      }
    };
    const onTouchEnd = () => {
      if (!tracking.current) return;
      tracking.current = false;
      const dy = lastOffsetRef.current;
      setOffset(0);
      startY.current = null;
      if (dy > 50) goBack();
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  if (offset <= 6) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] flex justify-center pointer-events-none"
      style={{ transform: `translateY(${Math.min(offset, 120)}px)` }}
    >
      <div className="mt-2 px-4 py-1.5 rounded-full bg-foreground/80 text-background text-xs font-medium backdrop-blur-md shadow-lg">
        {offset > 50 ? 'Release to go back' : 'Swipe down to go back'}
      </div>
    </div>
  );
};

export default ProfileBackControls;
