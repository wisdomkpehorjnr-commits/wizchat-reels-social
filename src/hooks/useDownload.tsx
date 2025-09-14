import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useDownload = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const downloadMedia = async (url: string, filename?: string) => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch media');
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || `wizchat_media_${Date.now()}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(blobUrl);
      
      toast({
        title: "Download Started",
        description: "Media is being downloaded to your device",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download media. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return { downloadMedia, isDownloading };
};