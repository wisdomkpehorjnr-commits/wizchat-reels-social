import React from 'react';
import { X, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MediaViewerProps {
  src: string;
  type: 'image' | 'video';
  alt?: string;
  open: boolean;
  onClose: () => void;
}

const MediaViewer: React.FC<MediaViewerProps> = ({ src, type, alt = '', open, onClose }) => {
  if (!open) return null;

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const download = () => {
    try {
      const a = document.createElement('a');
      a.href = src;
      a.download = '';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.warn('download failed', e);
    }
  };

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ url: src });
      else await navigator.clipboard.writeText(src);
    } catch (e) {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center" onClick={handleBackgroundClick}>
      <div className="relative max-w-full max-h-full p-4">
        <Button variant="ghost" size="sm" className="absolute top-2 right-2 z-10 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>

        <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
          <Button variant="ghost" size="sm" className="bg-white/10 text-white" onClick={download}><Download className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" className="bg-white/10 text-white" onClick={share}><Share2 className="w-4 h-4" /></Button>
        </div>

        {type === 'image' ? (
          <img src={src} alt={alt} className="max-w-full max-h-[90vh] object-contain" />
        ) : (
          <video src={src} controls autoPlay className="max-w-full max-h-[90vh] object-contain" />
        )}
      </div>
    </div>
  );
};

export default MediaViewer;
