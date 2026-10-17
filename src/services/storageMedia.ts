import { supabase } from '@/integrations/supabase/client';
import { parseStorageMedia } from '@/lib/storageMediaReference';

// Keep object identity stable; signed access URLs can change without duplicating caches.
export async function getStorageMediaUrl(bucket: string, path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 365 * 24 * 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function fetchMedia(src: string): Promise<Response> {
  const reference = parseStorageMedia(src);
  if (!reference) return fetch(src, { cache: 'force-cache' });
  const { data, error } = await supabase.storage.from(reference.bucket).download(reference.path);
  if (error) throw error;
  return new Response(data, { headers: { 'Content-Type': data.type } });
}