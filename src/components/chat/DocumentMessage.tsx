import { Download, FileText, File, FileImage, FileVideo, FileAudio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface DocumentMessageProps {
  mediaUrl: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  isOwn: boolean;
}

const DocumentMessage = ({ mediaUrl, fileName, fileSize, fileType, isOwn }: DocumentMessageProps) => {
  const getFileIcon = () => {
    if (!fileType) return FileText;
    
    if (fileType.includes('pdf')) return FileText;
    if (fileType.includes('image')) return FileImage;
    if (fileType.includes('video')) return FileVideo;
    if (fileType.includes('audio')) return FileAudio;
    if (fileType.includes('word') || fileType.includes('document')) return FileText;
    if (fileType.includes('sheet') || fileType.includes('excel')) return File;
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return File;
    
    return FileText;
  };

  const getFileExtension = () => {
    if (fileName) {
      const ext = fileName.split('.').pop()?.toUpperCase();
      if (ext) return ext;
    }
    // Try to get extension from URL
    if (mediaUrl) {
      const urlExt = mediaUrl.split('.').pop()?.split('?')[0].toUpperCase();
      if (urlExt && urlExt.length <= 5) return urlExt;
    }
    return 'FILE';
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleOpen = async () => {
    try {
      // Try to open in new tab first
      const link = document.createElement('a');
      link.href = mediaUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      // For mobile devices, try to trigger download/open
      if (mediaUrl.startsWith('blob:') || mediaUrl.startsWith('data:')) {
        // For blob URLs, force download
        link.download = fileName || 'document';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // For remote URLs, open in new tab
        window.open(mediaUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error opening document:', error);
      // Fallback: try download
      handleDownload(new MouseEvent('click') as any);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Fetch the file and create a blob URL for download
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'document';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      console.error('Error downloading document:', error);
      // Fallback: direct link
      const link = document.createElement('a');
      link.href = mediaUrl;
      link.download = fileName || 'document';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const Icon = getFileIcon();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all hover:opacity-90 ${
        isOwn
          ? 'bg-primary/10 border border-primary/20'
          : 'bg-muted/50 border border-border'
      }`}
      onClick={handleOpen}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isOwn ? 'bg-primary/20' : 'bg-primary/10'
      }`}>
        <Icon className={`w-6 h-6 ${isOwn ? 'text-primary' : 'text-primary'}`} />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isOwn ? 'text-primary-foreground' : 'text-foreground'}`}>
          {fileName || mediaUrl.split('/').pop()?.split('?')[0] || 'Document'}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
            {getFileExtension()}
          </span>
          {fileSize && (
            <>
              <span className={`text-xs ${isOwn ? 'text-primary-foreground/50' : 'text-muted-foreground'}`}>•</span>
              <span className={`text-xs ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                {formatFileSize(fileSize)}
              </span>
            </>
          )}
        </div>
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        className="flex-shrink-0 rounded-full"
        onClick={handleDownload}
      >
        <Download className={`w-4 h-4 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`} />
      </Button>
    </motion.div>
  );
};

export default DocumentMessage;

