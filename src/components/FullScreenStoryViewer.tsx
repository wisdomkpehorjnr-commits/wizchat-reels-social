import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  X, Eye, Heart, MessageCircle, MoreVertical, Trash2, Edit,
  ChevronLeft, ChevronRight, Send
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

interface FullScreenStoryViewerProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  onDelete: (storyId: string) => void;
  onStoriesUpdate: () => void;
}

const StoryMedia: React.FC<{ story: Story }> = ({ story }) => {
  const { cachedUrl } = useImageCache(story.mediaUrl || '');

  if (!story.mediaUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/60 to-accent/60">
        <p className="text-white text-2xl font-semibold px-8 text-center">{story.content}</p>
      </div>
    );
  }

  if (story.mediaType === 'video') {
    return (
      <video
        src={story.mediaUrl}
        className="w-full h-full object-contain"
        controls
        autoPlay
        playsInline
      />
    );
  }

  return (
    <img
      src={cachedUrl || story.mediaUrl}
      alt=""
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
  const [showViewers, setShowViewers] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [showEditCaption, setShowEditCaption] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [viewers, setViewers] = useState<any[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [sendingReply, setSendingReply] = useState(false);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const [progress, setProgress] = useState(0);

  const story = stories[currentIndex];
  const isOwnStory = story?.userId === user?.id;

  // Auto-advance timer (8 seconds for images, disabled for videos)
  useEffect(() => {
    if (!story) return;
    if (story.mediaType === 'video') return;

    setProgress(0);
    const duration = 8000;
    const interval = 50;
    let elapsed = 0;

    progressRef.current = setInterval(() => {
      elapsed += interval;
      setProgress((elapsed / duration) * 100);
      if (elapsed >= duration) {
        if (currentIndex < stories.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          onClose();
        }
      }
    }, interval);

    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [currentIndex, story]);

  // Check like status and count
  useEffect(() => {
    if (!story || !user) return;
    const checkLike = async () => {
      try {
        const { data: likes } = await supabase
          .from('story_likes')
          .select('id')
          .eq('story_id', story.id);
        
        setLikeCount(likes?.length || 0);

        const { data: myLike } = await supabase
          .from('story_likes')
          .select('id')
          .eq('story_id', story.id)
          .eq('user_id', user.id)
          .maybeSingle();
        
        setIsLiked(!!myLike);
      } catch {
        // story_likes table might not exist yet
      }
    };
    checkLike();
  }, [story?.id, user?.id]);

  const loadViewers = useCallback(async () => {
    if (!story) return;
    try {
      const { data } = await supabase
        .from('story_views')
        .select('*, profiles:user_id(name, username, avatar)')
        .eq('story_id', story.id);
      setViewers(data || []);
    } catch (err) {
      console.error('Error loading viewers:', err);
    }
  }, [story?.id]);

  useEffect(() => {
    if (showViewers) loadViewers();
  }, [showViewers, loadViewers]);

  const handleLike = async () => {
    if (!user || !story) return;
    try {
      if (isLiked) {
        await supabase
          .from('story_likes')
          .delete()
          .eq('story_id', story.id)
          .eq('user_id', user.id);
        setIsLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase
          .from('story_likes')
          .insert({ story_id: story.id, user_id: user.id });
        setIsLiked(true);
        setLikeCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !user || !story || sendingReply) return;
    setSendingReply(true);
    try {
      // Get or create direct chat with story owner
      const { data: chatId, error: chatError } = await supabase.rpc('get_or_create_direct_chat', {
        p_other_user_id: story.userId
      });
      if (chatError) throw chatError;

      // Send message with story reply indicator
      const { error: msgError } = await supabase.from('messages').insert({
        chat_id: chatId,
        user_id: user.id,
        content: `📸 Replied to your story: ${replyText.trim()}`,
        type: 'story_reply'
      });
      if (msgError) throw msgError;

      toast({ title: "Reply sent!", description: `Your reply was sent to ${story.user.name}` });
      setReplyText('');
      setShowReply(false);
    } catch (err) {
      console.error('Error sending reply:', err);
      toast({ title: "Error", description: "Failed to send reply", variant: "destructive" });
    } finally {
      setSendingReply(false);
    }
  };

  const handleEditCaption = async () => {
    if (!story || !user) return;
    try {
      const { error } = await supabase
        .from('stories')
        .update({ content: editCaption.trim() })
        .eq('id', story.id)
        .eq('user_id', user.id);
      if (error) throw error;
      toast({ title: "Caption updated" });
      setShowEditCaption(false);
      onStoriesUpdate();
    } catch (err) {
      console.error('Error editing caption:', err);
      toast({ title: "Error", description: "Failed to edit caption", variant: "destructive" });
    }
  };

  const goNext = () => {
    if (progressRef.current) clearInterval(progressRef.current);
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (progressRef.current) clearInterval(progressRef.current);
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 px-2 pt-2">
        {stories.map((_, idx) => (
          <div key={idx} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-75"
              style={{
                width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-0 right-0 z-20 px-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-white/30">
              <AvatarImage src={story.user.avatar} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {story.user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-white text-sm">{story.user.name}</p>
              <p className="text-xs text-white/60">
                {new Date(story.createdAt).toLocaleString(undefined, {
                  hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric'
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isOwnStory && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    setEditCaption(story.content || '');
                    setShowEditCaption(true);
                  }}>
                    <Edit className="w-4 h-4 mr-2" /> Edit Caption
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => {
                      onDelete(story.id);
                      if (stories.length <= 1) onClose();
                      else if (currentIndex >= stories.length - 1) setCurrentIndex(prev => prev - 1);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Story
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={onClose}>
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Story Content */}
      <div className="flex-1 flex items-center justify-center relative">
        <StoryMedia story={story} />

        {/* Navigation touch areas */}
        <div className="absolute inset-0 flex z-10">
          <div className="flex-1 cursor-pointer" onClick={goPrev} />
          <div className="flex-1 cursor-pointer" onClick={goNext} />
        </div>

        {currentIndex > 0 && (
          <Button
            variant="ghost" size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-white/20"
            onClick={goPrev}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
        )}
        {currentIndex < stories.length - 1 && (
          <Button
            variant="ghost" size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-white/20"
            onClick={goNext}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        )}
      </div>

      {/* Caption */}
      {story.content && story.mediaUrl && (
        <div className="absolute bottom-24 left-0 right-0 z-20 px-6">
          <div className="bg-black/50 backdrop-blur-sm rounded-xl px-4 py-3 max-w-md mx-auto">
            <p className="text-white text-sm text-center">{story.content}</p>
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-3 bg-gradient-to-t from-black/70 to-transparent">
        {showReply ? (
          <div className="flex items-center gap-2 max-w-md mx-auto">
            <Input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Reply to story..."
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleReply()}
            />
            <Button
              size="icon"
              onClick={handleReply}
              disabled={!replyText.trim() || sendingReply}
              className="bg-primary"
            >
              <Send className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setShowReply(false)} className="text-white">
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-6">
            {/* Views */}
            {isOwnStory && (
              <button
                onClick={() => setShowViewers(!showViewers)}
                className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors"
              >
                <Eye className="w-6 h-6" />
                <span className="text-xs">{story.viewerCount || 0}</span>
              </button>
            )}

            {/* Like */}
            <button
              onClick={handleLike}
              className="flex flex-col items-center gap-1 transition-colors"
            >
              <Heart
                className={`w-6 h-6 transition-all ${isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-white/80 hover:text-white'}`}
              />
              <span className={`text-xs ${isLiked ? 'text-red-400' : 'text-white/60'}`}>{likeCount || ''}</span>
            </button>

            {/* Reply (not on own story) */}
            {!isOwnStory && (
              <button
                onClick={() => setShowReply(true)}
                className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors"
              >
                <MessageCircle className="w-6 h-6" />
                <span className="text-xs">Reply</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Viewers Sheet */}
      {showViewers && (
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-card rounded-t-2xl max-h-[50vh] overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">
              Story Views ({viewers.length})
            </h3>
            <Button variant="ghost" size="icon" onClick={() => setShowViewers(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="max-h-[40vh]">
            <div className="p-2">
              {viewers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No views yet</p>
              ) : (
                viewers.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={v.profiles?.avatar} />
                      <AvatarFallback>{v.profiles?.name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">{v.profiles?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">@{v.profiles?.username || 'user'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Edit Caption Sheet */}
      {showEditCaption && (
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-card rounded-t-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Edit Caption</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowEditCaption(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Textarea
            value={editCaption}
            onChange={(e) => setEditCaption(e.target.value)}
            placeholder="Add a caption..."
            className="min-h-[80px] mb-4"
          />
          <Button onClick={handleEditCaption} className="w-full">
            Save Caption
          </Button>
        </div>
      )}
    </div>
  );
};

export default FullScreenStoryViewer;
