import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Camera, CornerUpRight, X, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { formatDistanceToNow } from 'date-fns';
import { useImageCache } from '@/hooks/useImageCache';
import VerifiedBadge from './VerifiedBadge';
import { supabase } from '@/integrations/supabase/client';
import { MediaService } from '@/services/mediaService';
import { useToast } from '@/hooks/use-toast';

interface Props {
  post: any;
  onClose: () => void;
}

const dataUrlToBlob = async (url: string) => (await fetch(url)).blob();

const PostStreakView = ({ post, onClose }: Props) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<'shot' | 'story' | null>(null);
  const { toast } = useToast();
  const image = (Array.isArray(post.imageUrls) && post.imageUrls[0]) || post.imageUrl;
  const { cachedUrl: img } = useImageCache(image);
  const { cachedUrl: avatar } = useImageCache(post.user?.avatar);
  const name = post.user?.name || post.user?.username || 'User';
  const verified = post.user?.is_verified;
  const created = post.createdAt ? new Date(post.createdAt) : null;

  const capture = async () => {
    if (!frameRef.current) throw new Error('no frame');
    return toPng(frameRef.current, { pixelRatio: 2, cacheBust: false });
  };

  const handleScreenshot = async () => {
    setBusy('shot');
    try {
      const url = await capture();
      const a = document.createElement('a');
      a.href = url;
      a.download = `wizchat-post-${post.id}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast({ title: 'Saved', description: 'Screenshot saved to your device' });
    } catch {
      toast({ title: 'Could not take screenshot', description: 'Please try again' });
    }
    setBusy(null);
  };

  const handleShareStory = async () => {
    setBusy('story');
    try {
      const blob = await dataUrlToBlob(await capture());
      const file = new File([blob], `streak-${post.id}.png`, { type: 'image/png' });
      const mediaUrl = await MediaService.uploadStoryMedia(file);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('auth');
      const { error } = await supabase.from('stories').insert({
        user_id: user.id, content: '', media_url: mediaUrl, media_type: 'image',
      });
      if (error) throw error;
      toast({ title: 'Shared to your story' });
      onClose();
    } catch {
      toast({ title: 'Could not share to story', description: 'Please try again when online' });
    }
    setBusy(null);
  };

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center p-4 bg-background/40 backdrop-blur-2xl"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <button aria-label="Close" onClick={onClose}
        className="absolute top-4 right-4 h-10 w-10 rounded-full bg-foreground/10 border border-foreground/15 flex items-center justify-center text-foreground">
        <X className="w-5 h-5" />
      </button>

      <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
        className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        {/* Captured frame: glass background + post card */}
        <div ref={frameRef} className="relative overflow-hidden rounded-3xl p-6 bg-primary">
          {img && <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover scale-125" style={{ filter: 'blur(28px) saturate(1.4)' }} />}
          <div className="absolute inset-0 bg-background/25" />
          <div className="relative rounded-2xl bg-card/90 text-card-foreground border border-border/50 shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 pt-4 pb-2">
              {avatar ? <img src={avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                : <div className="w-9 h-9 rounded-full bg-muted" />}
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-sm font-semibold text-foreground truncate">
                  {name}{verified && <VerifiedBadge size={15} />}
                </div>
                {created && <div className="text-xs text-muted-foreground">{formatDistanceToNow(created, { addSuffix: true })}</div>}
              </div>
            </div>
            {post.content && <p className="px-4 pb-3 text-sm text-foreground whitespace-pre-wrap break-words line-clamp-6">{post.content}</p>}
            {img && <div className="relative w-full aspect-[4/3] bg-muted"><img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" /></div>}
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-5">
          <button aria-label="Screenshot" onClick={handleScreenshot} disabled={!!busy}
            className="h-12 w-12 rounded-full bg-card/70 backdrop-blur-xl border border-border/60 flex items-center justify-center text-foreground active:scale-95 transition-transform">
            {busy === 'shot' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
          </button>
          <button aria-label="Share to story" onClick={handleShareStory} disabled={!!busy}
            className="h-12 w-12 rounded-full bg-card/70 backdrop-blur-xl border border-border/60 flex items-center justify-center text-foreground active:scale-95 transition-transform">
            {busy === 'story' ? <Loader2 className="w-5 h-5 animate-spin" /> : <CornerUpRight className="w-5 h-5" />}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};

export default PostStreakView;
