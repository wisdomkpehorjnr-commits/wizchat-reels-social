import { Download, FileText, File } from 'lucide-react';
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
    const ext = getFileExtension().toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['xls', 'xlsx'].includes(ext)) return '📊';
    if (['ppt', 'pptx'].includes(ext)) return '📑';
    if (['zip', 'rar', '7z'].includes(ext)) return '📦';
    if (['txt', 'rtf'].includes(ext)) return '📃';
    return '📄';
  };

  const getFileExtension = () => {
    if (fileName) {
      const ext = fileName.split('.').pop()?.toUpperCase();
      if (ext) return ext;
    }
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

  const getDisplayName = () => {
    if (fileName) {
      // Truncate long filenames
      if (fileName.length > 25) {
        const ext = fileName.split('.').pop();
        const name = fileName.slice(0, 20);
        return `${name}...${ext}`;
      }
      return fileName;
    }
    const urlName = mediaUrl.split('/').pop()?.split('?')[0];
    if (urlName && urlName.length > 25) {
      return urlName.slice(0, 22) + '...';
    }
    return urlName || 'Document';
  };

  const handleOpen = async () => {
    try {
      if (mediaUrl.startsWith('blob:') || mediaUrl.startsWith('data:')) {
        handleDownload(new MouseEvent('click') as any);
      } else {
        window.open(mediaUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error opening document:', error);
      handleDownload(new MouseEvent('click') as any);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      console.error('Error downloading document:', error);
      const link = document.createElement('a');
      link.href = mediaUrl;
      link.download = fileName || 'document';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all hover:opacity-90 min-w-[180px] max-w-[240px] ${
        isOwn
          ? 'bg-primary-foreground/10'
          : 'bg-background/80 dark:bg-white/10'
      }`}
      onClick={handleOpen}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
    >
      {/* File Icon */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isOwn ? 'bg-primary-foreground/20' : 'bg-primary/10'
      }`}>
        <span className="text-xl">{getFileIcon()}</span>
      </div>
      
      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isOwn ? 'text-primary-foreground' : 'text-foreground'}`}>
          {getDisplayName()}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`text-[10px] font-medium uppercase ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
            {getFileExtension()}
          </span>
          {fileSize && (
            <>
              <span className={`text-[10px] ${isOwn ? 'text-primary-foreground/40' : 'text-muted-foreground/60'}`}>•</span>
              <span className={`text-[10px] ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                {formatFileSize(fileSize)}
              </span>
            </>
          )}
        </div>
      </div>
      
      {/* Download Button */}
      <Button
        variant="ghost"
        size="icon"
        className="flex-shrink-0 w-8 h-8 rounded-full"
        onClick={handleDownload}
      >
        <Download className={`w-4 h-4 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`} />
      </Button>
    </motion.div>
  );
};

export default DocumentMessage;
