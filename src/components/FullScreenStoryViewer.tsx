import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  X, Eye, Heart, MessageCircle, MoreVertical, Trash2, Edit, Send
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Story } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useImageCache } from '@/hooks/useImageCache';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';

interface FullScreenStoryViewerProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  onDelete: (storyId: string) => void;
  onStoriesUpdate: () => void;
}

const STORY_DURATION = 5000; // 5 seconds per story

const StoryImage: React.FC<{ src: string }> = ({ src }) => {
  const { cachedUrl } = useImageCache(src);
  return (
    <img
      src={cachedUrl}
      alt="Story"
      className="w-full h-full object-contain"
      loading="eager"
      decoding="sync"
    />
  );
};

const FullScreenStoryViewer: React.FC<FullScreenStoryViewerProps> = ({
  stories,
  initialIndex,
  onClose,
  onDelete,
  onStoriesUpdate,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [editCaption, setEditCaption] = useState('');
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const elapsedRef = useRef(0);

  const story = stories[currentIndex];
  const isOwnStory = story?.userId === user?.id;

  // Check like status
  useEffect(() => {
    if (!story || !user) return;
    const checkLike = async () => {
      const { data } = await supabase
        .from('story_likes')
        .select('id')
        .eq('story_id', story.id)
        .eq('user_id', user.id)
        .maybeSingle();
      setIsLiked(!!data);
    };
    const getLikeCount = async () => {
      const { count } = await supabase
        .from('story_likes')
        .select('*', { count: 'exact', head: true })
        .eq('story_id', story.id);
      setLikeCount(count || 0);
    };
    checkLike();
    getLikeCount();
  }, [story?.id, user?.id]);

  // Auto-advance timer
  const startTimer = useCallback(() => {
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    startTimeRef.current = performance.now() - elapsedRef.current;

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        // Auto-advance
        if (currentIndex < stories.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          onClose();
        }
        return;
      }
      timerRef.current = requestAnimationFrame(tick);
    };
    timerRef.current = requestAnimationFrame(tick);
  }, [currentIndex, stories.length, onClose]);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
      timerRef.current = null;
    }
    elapsedRef.current = performance.now() - startTimeRef.current;
  }, []);

  useEffect(() => {
    elapsedRef.current = 0;
    setProgress(0);
    if (!isPaused) startTimer();
    return () => { if (timerRef.current) cancelAnimationFrame(timerRef.current); };
  }, [currentIndex, isPaused, startTimer]);

  // Long press to pause
  const handlePressStart = () => {
    setIsPaused(true);
    pauseTimer();
  };
  const handlePressEnd = () => {
    setIsPaused(false);
    startTimer();
  };

  // Navigation
  const goNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };
  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  // Like
  const handleLike = async () => {
    if (!user || !story) return;
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 800);

    if (isLiked) {
      setIsLiked(false);
      setLikeCount(prev => Math.max(0, prev - 1));
      await supabase.from('story_likes').delete().eq('story_id', story.id).eq('user_id', user.id);
    } else {
      setIsLiked(true);
      setLikeCount(prev => prev + 1);
      await supabase.from('story_likes').insert({ story_id: story.id, user_id: user.id });
    }
  };

  // View viewers
  const handleShowViewers = async () => {
    if (!story) return;
    pauseTimer();
    setIsPaused(true);
    const { data } = await supabase
      .from('story_views')
      .select('*, profiles:user_id(id, name, username, avatar)')
      .eq('story_id', story.id);
    setViewers(data || []);
    setShowViewers(true);
  };

  // Reply
  const handleReply = async () => {
    if (!replyText.trim() || !user || !story) return;
    try {
      // Get or create chat with story owner
      const { data: chatId, error } = await supabase.rpc('get_or_create_direct_chat', {
        p_other_user_id: story.userId
      });
      if (error) throw error;

      // Send as a story reply message
      await supabase.from('messages').insert({
        chat_id: chatId,
        user_id: user.id,
        content: `📸 Replied to your story: "${replyText.trim()}"`,
        type: 'story_reply',
      });

      toast({ title: 'Reply Sent', description: 'Your reply was sent as a message.' });
      setReplyText('');
      setShowReply(false);
      setIsPaused(false);
      startTimer();
    } catch (err) {
      console.error('Reply error:', err);
      toast({ title: 'Error', description: 'Failed to send reply.', variant: 'destructive' });
    }
  };

  // Delete
  const handleDelete = () => {
    if (!story) return;
    onDelete(story.id);
    if (stories.length <= 1) {
      onClose();
    } else if (currentIndex >= stories.length - 1) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Edit caption
  const handleSaveCaption = async () => {
    if (!story) return;
    try {
      await supabase.from('stories').update({ content: editCaption }).eq('id', story.id);
      toast({ title: 'Caption Updated' });
      setIsEditingCaption(false);
      onStoriesUpdate();
    } catch {
      toast({ title: 'Error', description: 'Failed to update caption.', variant: 'destructive' });
    }
  };

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 px-2 pt-2">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{
                width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-5 left-0 right-0 z-30 flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9 border-2 border-white/40">
            <AvatarImage src={story.user.avatar} />
            <AvatarFallback className="text-sm">{story.user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white font-semibold text-sm">{story.user.name}</p>
            <p className="text-white/60 text-xs">
              {new Date(story.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOwnStory && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 h-8 w-8 p-0">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border">
                <DropdownMenuItem onClick={() => { setEditCaption(story.content || ''); setIsEditingCaption(true); setIsPaused(true); pauseTimer(); }}>
                  <Edit className="w-4 h-4 mr-2" /> Edit Caption
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Story
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 h-8 w-8 p-0" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Story content — touch zones */}
      <div
        className="flex-1 flex items-center justify-center relative select-none"
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
      >
        {/* Left tap zone */}
        <div className="absolute left-0 top-0 bottom-0 w-1/3 z-20" onClick={goPrev} />
        {/* Right tap zone */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 z-20" onClick={goNext} />

        {story.mediaUrl ? (
          story.mediaType === 'image' ? (
            <StoryImage src={story.mediaUrl} />
          ) : (
            <video
              src={story.mediaUrl}
              className="w-full h-full object-contain"
              autoPlay
              playsInline
              muted={false}
            />
          )
        ) : (
          <div className="text-white text-2xl font-semibold text-center px-8">
            {story.content}
          </div>
        )}

        {/* Like heart animation */}
        {showHeartAnim && (
          <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
            <Heart className="w-24 h-24 text-red-500 fill-red-500 animate-ping" />
          </div>
        )}
      </div>

      {/* Caption */}
      {story.content && story.mediaUrl && (
        <div className="absolute bottom-24 left-0 right-0 z-20 px-6">
          <p className="text-white text-sm bg-black/40 backdrop-blur-sm rounded-lg px-4 py-2">
            {story.content}
          </p>
        </div>
      )}

      {/* Bottom actions */}
      <div className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-6 pt-3 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center justify-between">
          {/* Views (own stories) */}
          {isOwnStory ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 gap-1.5"
              onClick={handleShowViewers}
            >
              <Eye className="w-5 h-5" />
              <span className="text-sm">{story.viewerCount || 0}</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 gap-1.5"
              onClick={() => { setShowReply(true); setIsPaused(true); pauseTimer(); }}
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm">Reply</span>
            </Button>
          )}

          {/* Like */}
          <Button
            variant="ghost"
            size="sm"
            className={`hover:bg-white/20 gap-1.5 ${isLiked ? 'text-red-500' : 'text-white'}`}
            onClick={handleLike}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500' : ''}`} />
            <span className="text-sm">{likeCount > 0 ? likeCount : ''}</span>
          </Button>
        </div>
      </div>

      {/* Viewers sheet */}
      <Dialog open={showViewers} onOpenChange={(open) => { setShowViewers(open); if (!open) { setIsPaused(false); startTimer(); } }}>
        <DialogContent className="max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" /> Story Views ({viewers.length})
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[300px]">
            {viewers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">No views yet</p>
            ) : (
              <div className="space-y-3">
                {viewers.map((v) => (
                  <div key={v.id} className="flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={v.profiles?.avatar} />
                      <AvatarFallback>{v.profiles?.name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">{v.profiles?.name}</p>
                      <p className="text-xs text-muted-foreground">@{v.profiles?.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Reply sheet */}
      <Dialog open={showReply} onOpenChange={(open) => { setShowReply(open); if (!open) { setIsPaused(false); startTimer(); } }}>
        <DialogContent className="max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle>Reply to {story.user.name}'s Story</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Send a reply..."
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleReply()}
            />
            <Button size="sm" onClick={handleReply} disabled={!replyText.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit caption dialog */}
      <Dialog open={isEditingCaption} onOpenChange={(open) => { setIsEditingCaption(open); if (!open) { setIsPaused(false); startTimer(); } }}>
        <DialogContent className="max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle>Edit Caption</DialogTitle>
          </DialogHeader>
          <Textarea value={editCaption} onChange={(e) => setEditCaption(e.target.value)} className="min-h-[80px]" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setIsEditingCaption(false); setIsPaused(false); startTimer(); }}>Cancel</Button>
            <Button onClick={handleSaveCaption}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FullScreenStoryViewer;
