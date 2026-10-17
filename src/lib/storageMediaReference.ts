export function parseStorageMedia(src: string): { bucket: string; path: string; cacheKey: string } | null {
  try {
    const url = new URL(src);
    const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/);
    if (!match) return null;
    return { bucket: decodeURIComponent(match[1]), path: decodeURIComponent(match[2]), cacheKey: `${url.origin}/storage/v1/object/public/${match[1]}/${match[2]}` };
  } catch {
    return null;
  }
}