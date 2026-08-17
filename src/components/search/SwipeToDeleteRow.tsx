import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';

interface SwipeToDeleteRowProps {
  onDelete: () => void;
  children: React.ReactNode;
}

/**
 * Swipe a row to the left to reveal (and trigger) a delete action.
 */
const SwipeToDeleteRow: React.FC<SwipeToDeleteRowProps> = ({ onDelete, children }) => {
  const [removing, setRemoving] = useState(false);

  const remove = () => {
    setRemoving(true);
    setTimeout(onDelete, 180);
  };

  return (
    <AnimatePresence initial={false}>
      {!removing && (
        <motion.div
          layout
          exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
          transition={{ duration: 0.18 }}
          className="relative overflow-hidden rounded-xl"
        >
          {/* Delete affordance behind the row */}
          <div className="absolute inset-y-0 right-0 w-24 bg-destructive flex items-center justify-end pr-5">
            <button
              type="button"
              aria-label="Delete recent search"
              onClick={remove}
              className="text-destructive-foreground"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          <motion.div
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: -96, right: 0 }}
            dragElastic={{ left: 0.25, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -140) remove();
            }}
            className="relative bg-background rounded-xl touch-pan-y"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SwipeToDeleteRow;
