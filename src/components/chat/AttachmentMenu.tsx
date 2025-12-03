import { Camera, Image, FileText, Music, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useRef } from 'react';

interface AttachmentMenuProps {
  onCamera: (file: File) => void;
  onGallery: (files: FileList) => void;
  onDocument: (file: File) => void;
  onAudio: (file: File) => void;
  onVideo: (file: File) => void;
  onClose: () => void;
  isOpen: boolean;
}

const AttachmentMenu = ({
  onCamera,
  onGallery,
  onDocument,
  onAudio,
  onVideo,
  onClose,
  isOpen,
}: AttachmentMenuProps) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  const handleDocumentClick = () => {
    documentInputRef.current?.click();
  };

  const handleAudioClick = () => {
    audioInputRef.current?.click();
  };

  const handleVideoClick = () => {
    videoInputRef.current?.click();
  };

  const attachments = [
    { icon: Camera, label: 'Camera', action: handleCameraClick, color: 'bg-pink-500' },
    { icon: Image, label: 'Gallery', action: handleGalleryClick, color: 'bg-purple-500' },
    { icon: FileText, label: 'Document', action: handleDocumentClick, color: 'bg-blue-500' },
    { icon: Music, label: 'Audio', action: handleAudioClick, color: 'bg-orange-500' },
    { icon: Video, label: 'Video', action: handleVideoClick, color: 'bg-red-500' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Hidden file inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onCamera(file);
                onClose();
              }
              e.target.value = '';
            }}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) {
                onGallery(files);
                onClose();
              }
              e.target.value = '';
            }}
          />
          <input
            ref={documentInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onDocument(file);
                onClose();
              }
              e.target.value = '';
            }}
          />
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onAudio(file);
                onClose();
              }
              e.target.value = '';
            }}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onVideo(file);
                onClose();
              }
              e.target.value = '';
            }}
          />

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
            className="fixed bottom-20 left-2 right-2 bg-background border-2 border-primary/20 rounded-2xl shadow-xl p-3 z-50 max-w-sm mx-auto"
          >
            <div className="grid grid-cols-5 gap-2">
              {attachments.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Button
                    variant="ghost"
                    className="flex flex-col items-center gap-1 h-auto py-2 w-full"
                    onClick={item.action}
                  >
                    <div className={`w-10 h-10 rounded-full ${item.color} flex items-center justify-center`}>
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px]">{item.label}</span>
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
