import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Eye, Heart, MessageCircle, MoreVertical, Trash2, Edit, Send, X
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

interface StoryGroup {
  userId: string;
  user: Story['user'];
  stories: Story[];
}

interface FullScreenStoryViewerProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  onDelete: (storyId: string) => void;
  onStoriesUpdate: () => void;
}

const STORY_DURATION = 5000;

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

  const storyGroups = useRef<StoryGroup[]>([]);
  const groupMap = useRef<Map<string, number>>(new Map());

  if (storyGroups.current.length === 0) {
    const groups: StoryGroup[] = [];
    const map = new Map<string, number>();
    stories.forEach(s => {
      if (map.has(s.userId)) {
        groups[map.get(s.userId)!].stories.push(s);
      } else {
        map.set(s.userId, groups.length);
        groups.push({ userId: s.userId, user: s.user, stories: [s] });
      }
    });
    storyGroups.current = groups;
    groupMap.current = map;
  }

  const initialStory = stories[initialIndex];
  const initGroupIdx = groupMap.current.get(initialStory?.userId || '') || 0;

  const [groupIndex, setGroupIndex] = useState(initGroupIdx);
  const [storyIndex, setStoryIndex] = useState(0);
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

  const currentGroup = storyGroups.current[groupIndex];
  const currentStories = currentGroup?.stories || [];
  const story = currentStories[storyIndex];
  const isOwnStory = story?.userId === user?.id;

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

  const advanceStory = useCallback(() => {
    if (storyIndex < currentStories.length - 1) {
      setStoryIndex(prev => prev + 1);
    } else if (groupIndex < storyGroups.current.length - 1) {
      setGroupIndex(prev => prev + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  }, [storyIndex, currentStories.length, groupIndex, onClose]);

  const startTimer = useCallback(() => {
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    startTimeRef.current = performance.now() - elapsedRef.current;
    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        advanceStory();
        return;
      }
      timerRef.current = requestAnimationFrame(tick);
    };
    timerRef.current = requestAnimationFrame(tick);
  }, [advanceStory]);

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
  }, [groupIndex, storyIndex, isPaused, startTimer]);

  const handlePressStart = () => { setIsPaused(true); pauseTimer(); };
  const handlePressEnd = () => { setIsPaused(false); startTimer(); };

  const goNext = () => advanceStory();
  const goPrev = () => {
    if (storyIndex > 0) {
      setStoryIndex(prev => prev - 1);
    } else if (groupIndex > 0) {
      setGroupIndex(prev => prev - 1);
      const prevGroup = storyGroups.current[groupIndex - 1];
      setStoryIndex(prevGroup.stories.length - 1);
    }
  };

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

  const handleReply = async () => {
    if (!replyText.trim() || !user || !story) return;
    try {
      const { data: chatId, error } = await supabase.rpc('get_or_create_direct_chat', {
        p_other_user_id: story.userId
      });
      if (error) throw error;
      await supabase.from('messages').insert({
        chat_id: chatId,
        user_id: user.id,
        content: `Stories\n${replyText.trim()}`,
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

  const handleDelete = () => {
    if (!story) return;
    onDelete(story.id);
    if (currentStories.length <= 1) {
      if (groupIndex < storyGroups.current.length - 1) {
        storyGroups.current.splice(groupIndex, 1);
        setStoryIndex(0);
      } else {
        onClose();
      }
    } else {
      if (storyIndex >= currentStories.length - 1) {
        setStoryIndex(prev => prev - 1);
      }
    }
  };

  const handleSaveCaption = async () => {
    if (!story) return;
    try {
      await supabase.from('stories').update({ content: editCaption }).eq('id', story.id);
      toast({ title: 'Caption Updated' });
      setIsEditingCaption(false);
      setIsPaused(false);
      startTimer();
      onStoriesUpdate();
    } catch {
      toast({ title: 'Error', description: 'Failed to update caption.', variant: 'destructive' });
    }
  };

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-50 flex gap-1 px-2 pt-2">
        {currentStories.map((_, i) => (
          <div key={i} className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{
                width: i < storyIndex ? '100%' : i === storyIndex ? `${progress}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Header — z-50 so it's above touch zones */}
      <div className="absolute top-5 left-0 right-0 z-50 flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onClose}>
          <Avatar className="w-9 h-9 border-2 border-white/40">
            <AvatarImage src={story.user.avatar} />
            <AvatarFallback className="text-sm text-white">{story.user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white font-bold text-sm">{story.user.name}</p>
            <p className="text-white/60 text-xs">
              {new Date(story.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOwnStory && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-white p-2 rounded-full hover:bg-white/20 relative z-50">
                  <MoreVertical className="w-6 h-6" strokeWidth={2.5} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border z-[200]">
                <DropdownMenuItem onClick={() => { setEditCaption(story.content || ''); setIsEditingCaption(true); setIsPaused(true); pauseTimer(); }}>
                  <Edit className="w-4 h-4 mr-2" /> Edit Caption
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Story
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Story content — touch zones for nav + long press */}
      <div
        className="flex-1 flex items-center justify-center relative select-none"
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
      >
        {/* Left tap zone — z-20 so buttons above at z-50 work */}
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
        <div className="absolute bottom-28 left-0 right-0 z-40 px-6">
          <p className="text-white text-sm font-medium text-center bg-black/40 backdrop-blur-sm rounded-lg px-4 py-2 mx-auto max-w-[80%]">
            {story.content}
          </p>
        </div>
      )}

      {/* Bottom actions — z-50 so they are clickable above touch zones */}
      <div className="absolute bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-3 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center justify-between">
          {isOwnStory ? (
            <button
              className="flex items-center gap-2 text-white font-bold px-3 py-2 rounded-full hover:bg-white/20"
              onClick={(e) => { e.stopPropagation(); handleShowViewers(); }}
            >
              <Eye className="w-6 h-6 text-white" strokeWidth={2.5} />
              <span className="text-sm font-bold text-white">{story.viewerCount || 0}</span>
            </button>
          ) : (
            <button
              className="flex items-center gap-2 text-white font-bold px-3 py-2 rounded-full hover:bg-white/20"
              onClick={(e) => { e.stopPropagation(); setShowReply(true); setIsPaused(true); pauseTimer(); }}
            >
              <MessageCircle className="w-6 h-6 text-white" strokeWidth={2.5} />
              <span className="text-sm font-bold text-white">Reply</span>
            </button>
          )}

          <button
            className={`flex items-center gap-2 px-3 py-2 rounded-full hover:bg-white/20 font-bold ${isLiked ? 'text-red-500' : 'text-white'}`}
            onClick={(e) => { e.stopPropagation(); handleLike(); }}
          >
            <Heart className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} strokeWidth={2.5} />
            {isOwnStory && likeCount > 0 && (
              <span className="text-sm font-bold text-white">{likeCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Viewers bottom sheet */}
      {showViewers && (
        <div className="fixed inset-0 z-[200]" onClick={() => { setShowViewers(false); setIsPaused(false); startTimer(); }}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[50vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">Story Views ({viewers.length})</h3>
              <button
                onClick={() => { setShowViewers(false); setIsPaused(false); startTimer(); }}
                className="text-foreground p-1 rounded-full hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ScrollArea className="flex-1 overflow-y-auto">
              {viewers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">No views yet</p>
              ) : (
                <div className="px-4 py-2 space-y-3">
                  {viewers.map((v) => (
                    <div key={v.id} className="flex items-center gap-3 py-1">
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={v.profiles?.avatar} />
                        <AvatarFallback>{v.profiles?.name?.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{v.profiles?.name}</p>
                        <p className="text-xs text-muted-foreground">@{v.profiles?.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Reply dialog */}
      <Dialog open={showReply} onOpenChange={(open) => { setShowReply(open); if (!open) { setIsPaused(false); startTimer(); } }}>
        <DialogContent className="max-w-sm bg-card border-border z-[200]">
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
        <DialogContent className="max-w-sm bg-card border-border z-[200]">
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
