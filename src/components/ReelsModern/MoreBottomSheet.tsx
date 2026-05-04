import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Download, Flag, X } from 'lucide-react';

interface MoreBottomSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  onDownload: () => void;
  onReport: () => void;
}

const MoreBottomSheet: React.FC<MoreBottomSheetProps> = ({ open, onClose, onSave, onDownload, onReport }) => {
  if (!open) return null;

  const options = [
    { icon: Save, label: 'Save', sub: 'Save to your collection', action: onSave },
    { icon: Download, label: 'Download', sub: 'Save video to device', action: onDownload },
    { icon: Flag, label: 'Report', sub: 'Report this reel', action: onReport, destructive: true },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-background border-t border-border p-4 pb-8"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <div className="flex justify-center mb-3">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="space-y-1">
              {options.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => { opt.action(); onClose(); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${opt.destructive ? 'bg-destructive/10' : 'bg-muted'}`}>
                    <opt.icon className={`w-5 h-5 ${opt.destructive ? 'text-destructive' : 'text-foreground'}`} />
                  </div>
                  <div className="text-left">
                    <div className={`text-sm font-medium ${opt.destructive ? 'text-destructive' : 'text-foreground'}`}>{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.sub}</div>
                  </div>
                </button>
              ))}
            </div>

            <button onClick={onClose} className="w-full mt-3 p-3 rounded-xl bg-muted text-foreground font-medium text-sm text-center hover:bg-accent transition-colors">
              Cancel
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MoreBottomSheet;
