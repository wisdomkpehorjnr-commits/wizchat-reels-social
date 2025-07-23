
import { supabase } from '@/integrations/supabase/client';

export class MediaService {
  private static async uploadFile(file: File, bucket: string, folder?: string): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${folder ? folder + '/' : ''}${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrl;
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

  static async uploadStoryMedia(file: File): Promise<string> {
    return this.uploadFile(file, 'stories');
  }

  static getMediaType(file: File): 'image' | 'video' {
    return file.type.startsWith('video/') ? 'video' : 'image';
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
