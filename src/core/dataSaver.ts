/**
 * Data Saver utilities
 * - Simple JSON delta computation
 * - Image resizing helper for uploads
 */

export function computeDelta(oldObj: any, newObj: any) {
  // Very small, shallow delta implementation: lists keys that changed
  const delta: any = {};
  for (const k of Object.keys(newObj)) {
    if (JSON.stringify(oldObj?.[k]) !== JSON.stringify(newObj[k])) {
      delta[k] = newObj[k];
    }
  }
  return delta;
}

export async function resizeImageFile(file: File, maxWidth = 1024, quality = 0.7): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(file);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        resolve(blob || file);
      }, 'image/jpeg', quality);
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });
}

export async function payloadSizeBytes(obj: any) {
  try {
    return new Blob([JSON.stringify(obj)]).size;
  } catch (e) {
    return 0;
  }
}

export default { computeDelta, resizeImageFile, payloadSizeBytes };
