
import { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, Plus, Phone, Video, Paperclip, Users, X } from 'lucide-react';
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
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chatWallpaper, setChatWallpaper] = useState<string | null>(() => localStorage.getItem('chat-wallpaper'));

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
          const { data: messageData } = await supabase
            .from('messages')
            .select(`*, user:profiles!messages_user_id_fkey (id, name, username, avatar)`)
            .eq('id', payload.new.id)
            .single();

          if (messageData) {
            const newMsg: Message = {
              id: messageData.id,
              chatId: messageData.chat_id,
              userId: messageData.user_id,
              user: messageData.user as any as User,
              content: messageData.content,
              type: (messageData.type as any) || 'text',
              mediaUrl: messageData.media_url,
              duration: messageData.duration,
              seen: messageData.seen,
              timestamp: new Date(messageData.created_at)
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
    } catch {}
  };

  const loadGroupChat = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const chats = await dataService.getChats();
      let groupChat = chats.find(c => c.id === groupId);
      
      if (!groupChat) {
        // Try loading messages directly
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
          throw new Error('Group chat not found');
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
      if (!chat) {
        toast({
          title: "Error",
          description: "Failed to load group chat",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chat || !user) return;
    const content = newMessage.trim();
    setNewMessage('');

    // Optimistic message
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
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    }
  };

  const handleVoiceMessage = async (audioBlob: Blob, duration: number) => {
    if (!chat) return;
    try {
      const audioUrl = await MediaService.uploadChatMedia(new File([audioBlob], 'voice.webm', { type: 'audio/webm' }));
      await dataService.createVoiceMessage(chat.id, audioUrl, duration);
    } catch (error) {
      console.error('Error sending voice message:', error);
      toast({ title: "Error", description: "Failed to send voice message", variant: "destructive" });
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
      toast({ title: "Error", description: "Failed to upload file", variant: "destructive" });
    }
  };

  const groupName = chat?.name || 'Group Chat';
  const memberCount = chat?.participants?.length || 0;

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
          <p className="text-muted-foreground">Loading group chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header - same style as ChatPopup */}
      <div className="flex items-center justify-between p-3 border-b bg-card">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarImage src={chat?.avatar} />
            <AvatarFallback className="bg-primary/20">
              <Users className="w-5 h-5 text-primary" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
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
              <DropdownMenuItem onClick={() => toast({ title: "Group Info", description: `${groupName} - ${memberCount} members` })}>
                Group Info
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
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isOwn={message.userId === user?.id}
              isGroup={true}
            />
          ))}
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
