
import { supabase } from '@/integrations/supabase/client';

export class MediaService {
  private static readonly MAX_IMAGE_BYTES = 100 * 1024;

  private static assertNoVideo(file: File) {
    if (file.type?.startsWith('video/')) {
      throw new Error('Video uploads are temporarily disabled while WizChat storage is being stabilized. Please upload an image instead.');
    }
  }

  private static async uploadFile(file: File, bucket: string, folder?: string): Promise<string> {
    try {
      this.assertNoVideo(file);

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
    const compressedFile = await this.compressImage(file, 512, 0.82, this.MAX_IMAGE_BYTES);
    return this.uploadFile(compressedFile, 'avatars');
  }

  static async uploadCover(file: File): Promise<string> {
    const compressedFile = await this.compressImage(file, 1280, 0.82, this.MAX_IMAGE_BYTES);
    return this.uploadFile(compressedFile, 'covers');
  }

  static async uploadPostMedia(file: File): Promise<string> {
    const compressedFile = await this.compressImage(file, 1080, 0.82, this.MAX_IMAGE_BYTES);
    return this.uploadFile(compressedFile, 'posts', 'media');
  }

  static async uploadPostImage(file: File): Promise<string> {
    const compressedFile = await this.compressImage(file, 1080, 0.82, this.MAX_IMAGE_BYTES);
    return this.uploadFile(compressedFile, 'posts', 'images');
  }

  static async uploadPostVideo(file: File): Promise<string> {
    this.assertNoVideo(file);
    throw new Error('Video uploads are disabled.');
  }

  static async uploadStoryMedia(file: File): Promise<string> {
    const compressedFile = await this.compressImage(file, 720, 0.82, this.MAX_IMAGE_BYTES);
    return this.uploadFile(compressedFile, 'stories');
  }

  static async uploadChatMedia(file: File): Promise<string> {
    if (file.type?.startsWith('image/')) {
      const compressedFile = await this.compressImage(file, 1080, 0.82, this.MAX_IMAGE_BYTES);
      return this.uploadFile(compressedFile, 'chat-media');
    }

    return this.uploadFile(file, 'chat-media');
  }

  static getMediaType(file: File): 'image' | 'video' | 'audio' {
    if (!file?.type) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'image';
  }

  static async compressImage(file: File, maxWidth = 1920, quality = 0.8, maxBytes = this.MAX_IMAGE_BYTES): Promise<File> {
    this.assertNoVideo(file);
    if (!file.type?.startsWith('image/')) return file;

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = async () => {
        let width = img.width;
        let height = img.height;
        const initialRatio = Math.min(1, maxWidth / Math.max(width, height));
        width = Math.max(1, Math.round(width * initialRatio));
        height = Math.max(1, Math.round(height * initialRatio));

        const toBlob = (mimeType: string, q: number) => new Promise<Blob | null>((res) => {
          canvas.toBlob(res, mimeType, q);
        });

        let outputBlob: Blob | null = null;
        let currentQuality = quality;

        for (let attempt = 0; attempt < 14; attempt++) {
          canvas.width = width;
          canvas.height = height;
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          outputBlob = await toBlob('image/jpeg', currentQuality);
          if (outputBlob && outputBlob.size <= maxBytes) break;

          if (currentQuality > 0.48) {
            currentQuality -= 0.08;
          } else {
            width = Math.max(240, Math.round(width * 0.86));
            height = Math.max(240, Math.round(height * 0.86));
            currentQuality = 0.72;
          }
        }

        if (!outputBlob) {
          reject(new Error('Failed to compress image'));
          return;
        }

        const safeName = file.name.replace(/\.[^.]+$/, '') || 'image';
        resolve(new File([outputBlob], `${safeName}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        }));
      };

      img.onerror = () => reject(new Error('Failed to load image for compression'));
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
