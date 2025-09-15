import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProfileImageModalProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

const ProfileImageModal: React.FC<ProfileImageModalProps> = ({ src, alt, isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center animate-fade-in"
      onClick={handleBackgroundClick}
    >
      <div className="relative max-w-full max-h-full p-4">
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 z-10 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
        
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-full object-contain animate-scale-in rounded-full"
          style={{ maxHeight: '90vh', maxWidth: '90vw' }}
        />
      </div>
    </div>
  );
};

export default ProfileImageModal;