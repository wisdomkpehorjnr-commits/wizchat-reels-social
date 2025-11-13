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
      
      // For APK compatibility - try to specify download location
      if ('showSaveFilePicker' in window) {
        try {
          // @ts-ignore - File System Access API
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: filename || `wizchat_media_${Date.now()}`,
            types: [{
              description: 'Media files',
              accept: {
                'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
                'video/*': ['.mp4', '.webm', '.mov']
              }
            }]
          });
          // @ts-ignore
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          toast({
            title: "Download complete",
            description: "Media was downloaded to your device",
          });
        } catch (error) {
          // Fallback
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          // Wait briefly to let browser trigger system download
          setTimeout(() => {
            toast({
              title: "Download complete",
              description: "Media was downloaded to your device",
            });
          }, 2000);
        }
      } else {
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => {
          toast({
            title: "Download complete",
            description: "Media was downloaded to your device",
          });
        }, 2000);
      }
      
      window.URL.revokeObjectURL(blobUrl);
      
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