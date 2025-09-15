
import { supabase } from '@/integrations/supabase/client';

export class MediaService {
  private static async uploadFile(file: File, bucket: string, folder?: string): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${folder ? folder + '/' : ''}${Date.now()}.${fileExt}`;

      console.log('Uploading file:', fileName, 'to bucket:', bucket);

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      console.log('File uploaded successfully:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('MediaService upload error:', error);
      throw error;
    }
  }

  static async uploadAvatar(file: File): Promise<string> {
    // Compress image for better mobile performance
    const compressedFile = await this.compressImage(file, 800, 0.8);
    return this.uploadFile(compressedFile, 'avatars');
  }

  static async uploadCover(file: File): Promise<string> {
    return this.uploadFile(file, 'covers');
  }

  static async uploadPostMedia(file: File): Promise<string> {
    return this.uploadFile(file, 'posts', 'media');
  }

  static async uploadPostImage(file: File): Promise<string> {
    return this.uploadFile(file, 'posts', 'images');
  }

  static async uploadPostVideo(file: File): Promise<string> {
    const videoUrl = await this.uploadFile(file, 'posts', 'videos');
    
    // Generate thumbnail for better mobile APK support
    try {
      const thumbnailDataUrl = await this.generateVideoThumbnail(file);
      const thumbnailBlob = await fetch(thumbnailDataUrl).then(r => r.blob());
      const thumbnailFile = new File([thumbnailBlob], 'thumbnail.jpg', { type: 'image/jpeg' });
      
      // Upload thumbnail
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const thumbnailPath = `${user.id}/thumbnails/${Date.now()}.jpg`;
        await supabase.storage
          .from('posts')
          .upload(thumbnailPath, thumbnailFile);
      }
    } catch (error) {
      console.warn('Failed to generate video thumbnail:', error);
    }
    
    return videoUrl;
  }

  static async uploadStoryMedia(file: File): Promise<string> {
    return this.uploadFile(file, 'stories');
  }

  static async uploadChatMedia(file: File): Promise<string> {
    return this.uploadFile(file, 'chat-media');
  }

  static getMediaType(file: File): 'image' | 'video' | 'audio' {
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'image';
  }

  static async compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          const compressedFile = new File([blob!], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        }, file.type, quality);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  static async generateVideoThumbnail(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      video.onloadedmetadata = () => {
        video.currentTime = 1; // Capture frame at 1 second for better quality
      };

      video.oncanplay = () => {
        // Optimize thumbnail size for mobile APK
        const maxSize = 300;
        const aspectRatio = video.videoWidth / video.videoHeight;
        
        if (aspectRatio > 1) {
          canvas.width = maxSize;
          canvas.height = maxSize / aspectRatio;
        } else {
          canvas.width = maxSize * aspectRatio;
          canvas.height = maxSize;
        }
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          } else {
            reject(new Error('Failed to generate thumbnail'));
          }
        }, 'image/jpeg', 0.9);
      };

      video.onerror = () => reject(new Error('Failed to load video'));
      video.crossOrigin = 'anonymous';
      video.src = URL.createObjectURL(file);
      video.muted = true; // Ensure it can play on mobile
      video.load();
    });
  }
}

// Export both named and default for backward compatibility
export const mediaService = MediaService;
export default MediaService;
