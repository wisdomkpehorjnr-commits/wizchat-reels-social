import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { generateUniqueId } from '../utils';

interface FloatingHeart {
  id: string;
  x: number;
  y: number;
}

interface FloatingHeartsProps {
  onHeartComplete?: (heartId: string) => void;
}

export const FloatingHearts: React.FC<FloatingHeartsProps> = ({ onHeartComplete }) => {
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);

  const addHeart = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      let clientX: number;
      let clientY: number;

      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const x = clientX - rect.left - 20; // Center the heart (40/2 = 20)
      const y = clientY - rect.top - 20;

      const heart: FloatingHeart = {
        id: generateUniqueId(),
        x,
        y,
      };

      setHearts((prev) => [...prev, heart]);

      // Remove heart after animation completes
      setTimeout(() => {
        setHearts((prev) => prev.filter((h) => h.id !== heart.id));
        onHeartComplete?.(heart.id);
      }, 1500);
    },
    [onHeartComplete]
  );

  return (
    <div
      onDoubleClick={addHeart}
      onTouchEnd={addHeart}
      className="relative w-full h-full overflow-hidden pointer-events-none"
    >
      {hearts.map((heart) => (
        <motion.div
          key={heart.id}
          className="absolute pointer-events-none flex items-center justify-center text-4xl"
          style={{ left: heart.x, top: heart.y }}
          initial={{ opacity: 1, y: 0, scale: 1 }}
          animate={{ opacity: 0, y: -100, scale: 0.8 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        >
          ❤️
        </motion.div>
      ))}
    </div>
  );
};

export default FloatingHearts;
