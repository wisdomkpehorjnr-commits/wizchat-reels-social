
import { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, Phone, Video, Paperclip, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Chat, Message, User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { MediaService } from '@/services/mediaService';
import VoiceRecorder from './chat/VoiceRecorder';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import GroupSettingsPanel from './GroupSettingsPanel';

interface GroupChatPopupProps {
  groupId: string;
  onClose: () => void;
}

const GROUP_MESSAGES_CACHE_KEY = 'wizchat_group_messages_';
const GROUP_CHAT_CACHE_KEY = 'wizchat_group_chat_';

const GroupChatPopup = ({ groupId, onClose }: GroupChatPopupProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isNetworkOnline = useNetworkStatus();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chatWallpaper, setChatWallpaper] = useState<string | null>(() => localStorage.getItem('chat-wallpaper'));
  const [showSettings, setShowSettings] = useState(false);

  // Load from cache first
  useEffect(() => {
    try {
      const cachedChat = localStorage.getItem(GROUP_CHAT_CACHE_KEY + groupId);
      if (cachedChat) {
        setChat(JSON.parse(cachedChat));
      }
      const cachedMsgs = localStorage.getItem(GROUP_MESSAGES_CACHE_KEY + groupId);
      if (cachedMsgs) {
        const parsed = JSON.parse(cachedMsgs);
        setMessages(parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })));
        setLoading(false);
      }
    } catch {}
  }, [groupId]);

  useEffect(() => {
    loadGroupChat();
  }, [groupId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time subscription
  useEffect(() => {
    if (!chat?.id) return;

    const channel = supabase
      .channel(`group_messages_${chat.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chat.id}` },
        async (payload) => {
          const msgPayload = payload.new as any;
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', msgPayload.user_id)
            .single();

          if (msgPayload) {
            const newMsg: Message = {
              id: msgPayload.id,
              chatId: msgPayload.chat_id,
              userId: msgPayload.user_id,
              user: { id: profile?.id || msgPayload.user_id, name: profile?.name || 'Unknown', username: profile?.username || '', email: '', avatar: profile?.avatar || '', photoURL: profile?.avatar || '', createdAt: new Date(), followerCount: 0, followingCount: 0, profileViews: 0 } as User,
              content: msgPayload.content,
              type: (msgPayload.type as any) || 'text',
              mediaUrl: msgPayload.media_url,
              duration: msgPayload.duration,
              seen: msgPayload.seen,
              timestamp: new Date(msgPayload.created_at)
            };
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              const updated = [...prev, newMsg];
              cacheMessages(updated);
              return updated;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chat.id}` },
        (payload) => {
          const removed: any = payload.old;
          setMessages(prev => {
            const updated = prev.filter(m => m.id !== removed.id);
            cacheMessages(updated);
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chat?.id]);

  const cacheMessages = (msgs: Message[]) => {
    try {
      localStorage.setItem(GROUP_MESSAGES_CACHE_KEY + groupId, JSON.stringify(msgs));
      if (msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        let preview = lastMsg.content || '';
        if (lastMsg.type === 'image') preview = '📷 Photo';
        else if (lastMsg.type === 'video') preview = '🎥 Video';
        else if (lastMsg.type === 'voice') preview = '🎤 Voice message';
        if (preview.length > 60) preview = preview.substring(0, 60) + '...';
        localStorage.setItem(`wizchat_group_preview_${groupId}`, JSON.stringify({
          message: preview,
          time: lastMsg.timestamp,
        }));
      }
    } catch {}
  };

  const loadGroupChat = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const chats = await dataService.getChats();
      let groupChat = chats.find(c => c.id === groupId);
      
      if (!groupChat) {
        try {
          const chatMessages = await dataService.getMessages(groupId);
          const placeholderChat: Chat = {
            id: groupId,
            name: 'Group Chat',
            isGroup: true,
            participants: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any;
          setChat(placeholderChat);
          setMessages(chatMessages);
          cacheMessages(chatMessages);
          try { localStorage.setItem(GROUP_CHAT_CACHE_KEY + groupId, JSON.stringify(placeholderChat)); } catch {}
        } catch {
          // Silent fail - use cached data
          console.warn('Group chat not found, using cache');
        }
        return;
      }

      setChat(groupChat);
      try { localStorage.setItem(GROUP_CHAT_CACHE_KEY + groupId, JSON.stringify(groupChat)); } catch {}
      
      const chatMessages = await dataService.getMessages(groupChat.id);
      setMessages(chatMessages);
      cacheMessages(chatMessages);
    } catch (error) {
      console.error('Error loading group chat:', error);
      // Don't show toast for offline errors
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chat || !user) return;
    const content = newMessage.trim();
    setNewMessage('');

    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      chatId: chat.id,
      userId: user.id,
      user: { id: user.id, name: 'You', username: '', email: '', avatar: '' } as any,
      content,
      type: 'text',
      seen: false,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const message = await dataService.sendMessage(chat.id, content);
      setMessages(prev => {
        const updated = prev.filter(m => m.id !== optimisticMsg.id);
        if (!updated.some(m => m.id === message.id)) {
          updated.push(message);
        }
        cacheMessages(updated);
        return updated;
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(content);
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    }
  };

  const handleVoiceMessage = async (audioBlob: Blob, duration: number) => {
    if (!chat) return;
    try {
      const audioUrl = await MediaService.uploadChatMedia(new File([audioBlob], 'voice.webm', { type: 'audio/webm' }));
      await dataService.createVoiceMessage(chat.id, audioUrl, duration);
    } catch (error) {
      console.error('Error sending voice message:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !chat) return;
    try {
      const mediaUrl = await MediaService.uploadChatMedia(file);
      const mediaType = MediaService.getMediaType(file);
      if (mediaType === 'image' || mediaType === 'video') {
        await dataService.createMediaMessage(chat.id, mediaUrl, mediaType);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const groupName = chat?.name || 'Group Chat';
  const memberCount = chat?.participants?.length || 0;

  // Show settings panel
  if (showSettings) {
    return (
      <GroupSettingsPanel
        chatId={groupId}
        onClose={() => setShowSettings(false)}
        onGroupDeleted={onClose}
      />
    );
  }

  if (loading && !chat) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="flex items-center p-4 border-b bg-card gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            <div className="h-3 w-20 bg-muted animate-pulse rounded mt-1" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-card">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Avatar className="w-10 h-10 flex-shrink-0 cursor-pointer" onClick={() => setShowSettings(true)}>
            <AvatarImage src={chat?.avatar} />
            <AvatarFallback className="bg-primary/20">
              <Users className="w-5 h-5 text-primary" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setShowSettings(true)}>
            <h3 className="font-semibold text-foreground truncate">{groupName}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {memberCount} members{!isNetworkOnline && ' • Offline'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={() => toast({ title: "Voice Call", description: "Group voice calls coming soon" })}>
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => toast({ title: "Video Call", description: "Group video calls coming soon" })}>
            <Video className="w-5 h-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowSettings(true)}>
                Group Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e: any) => {
                  const file = e.target?.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const wp = ev.target?.result as string;
                      setChatWallpaper(wp);
                      localStorage.setItem('chat-wallpaper', wp);
                    };
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              }}>
                Change Wallpaper
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setMessages([]); cacheMessages([]); toast({ title: "Chat Cleared" }); }} className="text-destructive">
                Clear Chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea 
        className="flex-1 p-4"
        style={chatWallpaper ? {
          backgroundImage: `url(${chatWallpaper})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : undefined}
      >
        <div className="space-y-1">
          {messages.length === 0 && !loading && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No messages yet. Start the conversation!</p>
            </div>
          )}
          {messages.map((message) => {
            const isOwn = message.userId === user?.id;
            return (
              <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
                <div className={`flex items-end gap-2 max-w-[75%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                  {!isOwn && (
                    <Avatar className="w-7 h-7 flex-shrink-0">
                      <AvatarImage src={message.user?.avatar} />
                      <AvatarFallback className="text-xs">{message.user?.name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`rounded-2xl px-3 py-2 ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                    {!isOwn && (
                      <p className="text-xs font-semibold mb-0.5 text-primary">{message.user?.name}</p>
                    )}
                    {message.type === 'image' && message.mediaUrl && (
                      <img src={message.mediaUrl} alt="" className="rounded-lg max-w-48 mb-1" />
                    )}
                    {message.type === 'video' && message.mediaUrl && (
                      <video src={message.mediaUrl} controls className="rounded-lg max-w-48 mb-1" />
                    )}
                    {message.type === 'voice' && message.mediaUrl && (
                      <audio controls className="max-w-40"><source src={message.mediaUrl} /></audio>
                    )}
                    {(message.type === 'text' || !message.type) && (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                    <p className={`text-[10px] mt-0.5 ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t p-3 bg-card">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0"
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            className="flex-1 bg-background text-foreground"
          />
          <VoiceRecorder
            onSend={handleVoiceMessage}
            onCancel={() => {}}
          />
          <Button onClick={sendMessage} size="icon" disabled={!newMessage.trim()} className="flex-shrink-0">
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GroupChatPopup;
