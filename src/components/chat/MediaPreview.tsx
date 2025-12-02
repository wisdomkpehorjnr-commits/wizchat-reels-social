import { useState } from 'react';
import { X, Send, Image as ImageIcon, Video, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

interface MediaPreviewProps {
  file: File;
  onSend: (file: File, caption?: string) => void;
  onCancel: () => void;
  isOpen: boolean;
}

const MediaPreview = ({ file, onSend, onCancel, isOpen }: MediaPreviewProps) => {
  const [caption, setCaption] = useState('');

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const isDocument = !isImage && !isVideo;

  const handleSend = () => {
    onSend(file, caption.trim() || undefined);
    setCaption('');
  };

  const handleCancel = () => {
    setCaption('');
    onCancel();
  };

  const fileUrl = URL.createObjectURL(file);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={handleCancel}
          />
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl shadow-2xl z-50 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-primary/20">
              <h3 className="text-lg font-semibold">Send Media</h3>
              <Button variant="ghost" size="icon" onClick={handleCancel}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Media Preview */}
            <div className="flex-1 overflow-hidden flex items-center justify-center bg-muted/30 p-4 min-h-[200px] max-h-[50vh]">
              {isImage && (
                <img
                  src={fileUrl}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              )}
              {isVideo && (
                <video
                  src={fileUrl}
                  controls
                  className="max-w-full max-h-full rounded-lg"
                />
              )}
              {isDocument && (
                <div className="flex flex-col items-center gap-3 p-8">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Caption Input */}
            <div className="p-4 space-y-3 border-t border-primary/20">
              <div className="flex items-center gap-2">
                {isImage && <ImageIcon className="w-4 h-4 text-muted-foreground" />}
                {isVideo && <Video className="w-4 h-4 text-muted-foreground" />}
                {isDocument && <FileText className="w-4 h-4 text-muted-foreground" />}
                <Input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption..."
                  className="flex-1"
                  maxLength={500}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1 border-primary/20"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSend}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MediaPreview;

