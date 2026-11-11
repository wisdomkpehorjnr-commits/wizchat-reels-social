import { useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Camera, Share, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Button } from './ui/button';
import { supabase } from '@/integrations/supabase/client';
import { MediaService } from '@/services/mediaService';
import { useToast } from '@/hooks/use-toast';

interface Props {
  post: any;
  onClose: () => void;
  children: ReactNode;
}

const dataUrlToBlob = async (url: string) => (await fetch(url)).blob();

const PostStreakView = ({ post, onClose, children }: Props) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<'shot' | 'story' | null>(null);
  const { toast } = useToast();
  const originalWidth = document.querySelector(`[data-post-id="${post.id}"]`)?.getBoundingClientRect().width;

  const capture = async (target: 'screen' | 'card' = 'card') => {
    const frame = frameRef.current;
    const screen = screenRef.current;
    if (!frame || !screen) throw new Error('no frame');
    await document.fonts.ready;
    await Promise.all(Array.from(frame.querySelectorAll('img')).map(async (image) => {
      if (!image.complete) {
        await new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        });
      }
      await image.decode().catch(() => undefined);
    }));
    return toPng(target === 'screen' ? screen : frame, {
      pixelRatio: 2, cacheBust: false, skipFonts: true,
      filter: (node) => !(node instanceof HTMLElement && node.dataset.streakControls === 'true'),
    });
  };

  const handleScreenshot = async () => {
    setBusy('shot');
    try {
      const url = await capture('screen');
      const a = document.createElement('a');
      a.href = url;
      a.download = `wizchat-post-${post.id}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast({ title: 'Screenshot downloaded' });
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
      ref={screenRef}
      role="dialog" aria-modal="true" aria-label="Streak post"
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center p-4 bg-background/40 backdrop-blur-2xl"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div data-streak-controls="true" className="absolute top-4 left-4 z-10 flex gap-3" onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" title="Screenshot" aria-label="Screenshot" onClick={handleScreenshot} disabled={!!busy}
          className="h-11 w-11 rounded-full bg-card/70 backdrop-blur-xl border border-border/60 text-muted-foreground hover:text-muted-foreground active:scale-95 transition-transform">
          {busy === 'shot' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" strokeWidth={2.8} />}
        </Button>
        <Button variant="ghost" size="icon" title="Share to story" aria-label="Share to story" onClick={handleShareStory} disabled={!!busy}
          className="h-11 w-11 rounded-full bg-card/70 backdrop-blur-xl border border-border/60 text-muted-foreground hover:text-muted-foreground active:scale-95 transition-transform">
          {busy === 'story' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share className="w-5 h-5" strokeWidth={2.8} />}
        </Button>
      </div>

      <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
        className="w-full max-w-2xl max-h-[calc(100dvh-10rem)] overflow-y-auto"
        style={originalWidth ? { maxWidth: originalWidth } : undefined}
        onClick={(e) => e.stopPropagation()}>
        {/* Capture only the original post; the page has a single blurred backdrop. */}
        <div ref={frameRef} className="relative">
          {children}
        </div>

      </motion.div>
    </motion.div>,
    document.body
  );
};

export default PostStreakView;
