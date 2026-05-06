import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface Props {
  show: boolean;
  onRestart: () => void;
}

const PwaUpdateNotification: React.FC<Props> = ({ show, onRestart }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed top-4 inset-x-4 z-[200] max-w-md mx-auto"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ type: 'spring', damping: 25 }}
        >
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3 border border-white/20 shadow-xl"
            style={{
              background: 'rgba(16,185,129,0.15)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
            <span className="text-sm text-white flex-1">New version available</span>
            <button
              onClick={onRestart}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
            >
              Update
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PwaUpdateNotification;
