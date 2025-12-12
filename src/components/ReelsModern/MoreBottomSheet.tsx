import React, { useEffect, useState } from 'react';
import { Save, Download, Flag } from 'lucide-react';

interface MoreBottomSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  onDownload: () => void;
  onReport: () => void;
}

const MoreBottomSheet: React.FC<MoreBottomSheetProps> = ({ open, onClose, onSave, onDownload, onReport }) => {
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) setVisible(true);
    else {
      // delay unmount until animation finishes
      const t = setTimeout(() => setVisible(false), 280);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!visible && !open) return null;

  return (
    <div className={`fixed inset-0 z-60 flex items-end justify-center`}> 
      {/* blurred backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-280 ${open ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* sheet */}
      <div
        className={`relative w-full max-w-2xl mx-auto p-4 pb-8
          transition-transform duration-280 ease-out
          ${open ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ pointerEvents: 'auto' }}
      >
        <div className="mx-4 bg-white/6 backdrop-blur-md border border-white/8 rounded-2xl shadow-2xl p-3">

          <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-3" />

          <div className="space-y-3">
            <button
              onClick={() => { onSave(); onClose(); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/4 hover:bg-white/6 transition"
            >
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/8">
                <Save className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-white">Save</div>
                <div className="text-xs text-white/70">Save to your collection</div>
              </div>
            </button>

            <button
              onClick={() => { onDownload(); onClose(); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/4 hover:bg-white/6 transition"
            >
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/8">
                <Download className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-white">Download</div>
                <div className="text-xs text-white/70">Save video to device</div>
              </div>
            </button>

            <button
              onClick={() => { onReport(); onClose(); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/4 hover:bg-white/6 transition"
            >
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/8">
                <Flag className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-white">Report</div>
                <div className="text-xs text-white/70">Report this reel</div>
              </div>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MoreBottomSheet;
