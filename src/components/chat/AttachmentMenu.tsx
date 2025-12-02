import { Camera, Image, FileText, MapPin, Music, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface AttachmentMenuProps {
  onCamera: () => void;
  onGallery: () => void;
  onDocument: () => void;
  onLocation: () => void;
  onAudio: () => void;
  onVideo: () => void;
  onClose: () => void;
  isOpen: boolean;
}

const AttachmentMenu = ({
  onCamera,
  onGallery,
  onDocument,
  onLocation,
  onAudio,
  onVideo,
  onClose,
  isOpen,
}: AttachmentMenuProps) => {
  const attachments = [
    { icon: Camera, label: 'Camera', action: onCamera, color: 'bg-pink-500' },
    { icon: Image, label: 'Gallery', action: onGallery, color: 'bg-purple-500' },
    { icon: FileText, label: 'Document', action: onDocument, color: 'bg-blue-500' },
    { icon: MapPin, label: 'Location', action: onLocation, color: 'bg-green-500' },
    { icon: Music, label: 'Audio', action: onAudio, color: 'bg-orange-500' },
    { icon: Video, label: 'Video', action: onVideo, color: 'bg-red-500' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-20 left-2 right-2 sm:left-4 sm:right-4 bg-background border-2 border-primary/20 rounded-2xl shadow-xl p-3 sm:p-4 z-50 max-w-md mx-auto"
          >
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {attachments.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Button
                    variant="ghost"
                    className="flex flex-col items-center gap-1.5 sm:gap-2 h-auto py-3 sm:py-4"
                    onClick={() => {
                      item.action();
                      onClose();
                    }}
                  >
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${item.color} flex items-center justify-center`}>
                      <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <span className="text-[10px] sm:text-xs">{item.label}</span>
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AttachmentMenu;
