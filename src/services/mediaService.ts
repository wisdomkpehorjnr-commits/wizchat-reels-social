
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
    return this.uploadFile(file, 'avatars');
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
    return this.uploadFile(file, 'posts', 'videos');
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
}

// Export both named and default for backward compatibility
export const mediaService = MediaService;
export default MediaService;
