import { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, Phone, Video, Paperclip, Users, X, Plus, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Chat, Message, User, MessageStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { MediaService } from '@/services/mediaService';
import ChatMessage from './ChatMessage';
import VoiceRecorder from './chat/VoiceRecorder';
import AttachmentMenu from './chat/AttachmentMenu';
import MediaPreview from './chat/MediaPreview';
import LoadingDots from './chat/LoadingDots';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { localMessageService, LocalMessage } from '@/services/localMessageService';
import { markChatRead, markChatDelivered, getMessageStatuses } from '@/services/chatRealtimeService';
import { MoreVertical } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
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
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const [chatWallpaper, setChatWallpaper] = useState<string | null>(() => localStorage.getItem('chat-wallpaper'));
  const [showSettings, setShowSettings] = useState(false);

  // Load from cache first
  useEffect(() => {
    try {
      const cachedChat = localStorage.getItem(GROUP_CHAT_CACHE_KEY + groupId);
      if (cachedChat) setChat(JSON.parse(cachedChat));
      const cachedMsgs = localStorage.getItem(GROUP_MESSAGES_CACHE_KEY + groupId);
      if (cachedMsgs) {
        setMessages(JSON.parse(cachedMsgs).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
        setLoading(false);
      }
    } catch {}
  }, [groupId]);

  useEffect(() => { loadGroupChat(); }, [groupId]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Mark as read
  useEffect(() => {
    if (groupId && navigator.onLine) {
      markChatDelivered(groupId).catch(() => {});
      markChatRead(groupId).then(() => window.dispatchEvent(new CustomEvent('chatListUpdate'))).catch(() => {});
    }
  }, [groupId]);

  // Real-time subscription
  useEffect(() => {
    const chatId = chat?.id || groupId;
    if (!chatId) return;

    const channel = supabase
      .channel(`group_messages_${chatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        async (payload) => {
          const msgPayload = payload.new as any;
          if (processedMessageIds.current.has(msgPayload.id)) return;
          if (msgPayload.user_id === user?.id) return;
          processedMessageIds.current.add(msgPayload.id);

          const { data: profile } = await supabase.from('profiles').select('*').eq('id', msgPayload.user_id).single();
          const senderProfile = profile || { id: msgPayload.user_id, name: 'Unknown', username: '', avatar: '', email: '' };

          // Resolve reply
          let replyToMessage: Message | undefined;
          if (msgPayload.reply_to_id) {
            const existing = messages.find(m => m.id === msgPayload.reply_to_id);
            if (existing) { replyToMessage = existing; }
            else {
              const { data: replyMsg } = await supabase.from('messages').select('*').eq('id', msgPayload.reply_to_id).single();
              if (replyMsg) {
                const { data: replyUser } = await supabase.from('profiles').select('*').eq('id', replyMsg.user_id).single();
                replyToMessage = {
                  id: replyMsg.id, chatId: replyMsg.chat_id, userId: replyMsg.user_id,
                  user: { id: replyUser?.id || replyMsg.user_id, name: replyUser?.name || 'Unknown', username: '', email: '', avatar: replyUser?.avatar || '', photoURL: '', createdAt: new Date(), followerCount: 0, followingCount: 0, profileViews: 0 } as User,
                  content: replyMsg.content, type: replyMsg.type as any, mediaUrl: replyMsg.media_url,
                  timestamp: new Date(replyMsg.created_at), seen: replyMsg.seen,
                };
              }
            }
          }

          markChatRead(chatId).catch(() => {});

          let frontendType: any = msgPayload.type;
          if (msgPayload.type === 'text') {
            if (msgPayload.media_url && msgPayload.duration > 0 && !msgPayload.content) frontendType = 'voice';
            else if (msgPayload.media_url?.match(/\.(mp3|wav|ogg|m4a|aac|webm)$/i)) frontendType = 'audio';
            else if (msgPayload.media_url && !msgPayload.duration) frontendType = 'document';
          }

          const newMsg: Message = {
            id: msgPayload.id, chatId: msgPayload.chat_id, userId: msgPayload.user_id,
            user: { id: senderProfile.id, name: (senderProfile as any).name, username: (senderProfile as any).username || '', email: '', avatar: (senderProfile as any).avatar || '', photoURL: (senderProfile as any).avatar || '', createdAt: new Date(), followerCount: 0, followingCount: 0, profileViews: 0 } as User,
            content: msgPayload.content, type: frontendType, mediaUrl: msgPayload.media_url,
            duration: msgPayload.duration, seen: msgPayload.seen, timestamp: new Date(msgPayload.created_at),
            status: 'delivered', synced: true, replyToId: msgPayload.reply_to_id, replyToMessage,
            isDeleted: msgPayload.is_deleted,
          } as any;

          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            const updated = [...prev, newMsg];
            cacheMessages(updated);
            return updated;
          });

          window.dispatchEvent(new CustomEvent('chatMessageReceived', {
            detail: { chatId, content: msgPayload.content, type: msgPayload.type, userId: msgPayload.user_id, createdAt: msgPayload.created_at }
          }));
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        async (payload) => {
          const updated: any = payload.new;
          setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, content: updated.content ?? m.content, seen: updated.seen ?? m.seen, isDeleted: updated.is_deleted } as any : m));
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_receipts', filter: `chat_id=eq.${chatId}` },
        async () => {
          if (!user?.id) return;
          const ownIds = messages.filter(m => m.userId === user.id).map(m => m.id);
          if (ownIds.length === 0) return;
          const statuses = await getMessageStatuses(chatId, ownIds);
          setMessages(prev => prev.map(m => { const st = statuses[m.id]; return st && m.userId === user.id ? { ...m, status: st } : m; }));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chat?.id, groupId, user?.id]);

  const cacheMessages = (msgs: Message[]) => {
    try {
      localStorage.setItem(GROUP_MESSAGES_CACHE_KEY + groupId, JSON.stringify(msgs));
      if (msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        let preview = (lastMsg as any).isDeleted ? '🚫 This message was deleted' : lastMsg.content || '';
        if (lastMsg.type === 'image') preview = '📷 Photo';
        else if (lastMsg.type === 'video') preview = '🎥 Video';
        else if (lastMsg.type === 'voice') preview = '🎤 Voice message';
        if (preview.length > 60) preview = preview.substring(0, 60) + '...';
        localStorage.setItem(`wizchat_group_preview_${groupId}`, JSON.stringify({ message: preview, time: lastMsg.timestamp }));
      }
    } catch {}
  };

  const loadGroupChat = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const chatMessages = await dataService.getMessages(groupId);
      // Enrich with is_deleted from DB
      const enriched = chatMessages.map(m => ({ ...m, isDeleted: false }));
      
      // Try to get chat metadata
      const chats = await dataService.getChats();
      const groupChat = chats.find(c => c.id === groupId);
      if (groupChat) {
        setChat(groupChat);
        try { localStorage.setItem(GROUP_CHAT_CACHE_KEY + groupId, JSON.stringify(groupChat)); } catch {}
      }

      setMessages(enriched as any);
      cacheMessages(enriched as any);
    } catch (error) {
      console.error('Error loading group chat:', error);
    } finally { setLoading(false); }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    const content = newMessage.trim();
    const chatId = chat?.id || groupId;
    setNewMessage('');
    const currentReplyingTo = replyingTo;
    setReplyingTo(null);

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const optimisticMsg: Message = {
      id: tempId, chatId, userId: user.id,
      user: { id: user.id, name: 'You', username: '', email: '', avatar: '' } as any,
      content, type: 'text', seen: false, timestamp: new Date(),
      status: 'pending', localId: tempId, synced: false,
      replyToMessage: currentReplyingTo || undefined,
    };
    setMessages(prev => [...prev, optimisticMsg]);
    processedMessageIds.current.add(tempId);

    try {
      const insertData: any = { chat_id: chatId, user_id: user.id, content, type: 'text' };
      if (currentReplyingTo) insertData.reply_to_id = currentReplyingTo.id;

      const { data: messageData, error } = await supabase.from('messages').insert(insertData).select('*').single();
      if (error) throw error;

      const serverMessage: Message = {
        ...optimisticMsg, id: messageData.id, timestamp: new Date(messageData.created_at),
        status: 'sent', synced: true, replyToId: currentReplyingTo?.id, replyToMessage: currentReplyingTo || undefined,
      };
      processedMessageIds.current.add(serverMessage.id);
      setMessages(prev => {
        const updated = prev.map(m => m.localId === tempId ? serverMessage : m);
        cacheMessages(updated);
        return updated;
      });

      window.dispatchEvent(new CustomEvent('chatMessageReceived', {
        detail: { chatId, content, type: 'text', userId: user.id, createdAt: new Date().toISOString() }
      }));
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.map(m => m.localId === tempId ? { ...m, status: 'failed' as MessageStatus } : m));
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    try {
      const { data: existing } = await supabase.from('message_reactions').select('id, emoji').eq('message_id', messageId).eq('user_id', user.id).single();
      if (existing) {
        if (existing.emoji === emoji) await supabase.from('message_reactions').delete().eq('id', existing.id);
        else await supabase.from('message_reactions').update({ emoji }).eq('id', existing.id);
      } else {
        await supabase.from('message_reactions').insert({ message_id: messageId, user_id: user.id, emoji });
      }
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m;
        const reactions = m.reactions || [];
        const idx = reactions.findIndex(r => r.userId === user.id);
        if (idx >= 0) {
          if (reactions[idx].emoji === emoji) return { ...m, reactions: reactions.filter((_, i) => i !== idx) };
          return { ...m, reactions: reactions.map((r, i) => i === idx ? { ...r, emoji } : r) };
        }
        return { ...m, reactions: [...reactions, { id: '', messageId, userId: user.id, emoji, createdAt: new Date() }] };
      }));
    } catch {}
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      await supabase.from('messages').update({ content: newContent + ' [edited]' }).eq('id', messageId);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: newContent + ' [edited]' } : m));
      toast({ title: "Message edited" });
    } catch { toast({ title: "Error", description: "Failed to edit", variant: "destructive" }); }
  };

  const handleDeleteMessage = async (messageId: string, deleteForEveryone: boolean) => {
    const chatId = chat?.id || groupId;
    try {
      if (deleteForEveryone) {
        await supabase.from('messages').update({ is_deleted: true, content: 'This message was deleted' }).eq('id', messageId);
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: 'This message was deleted', isDeleted: true } as any : m));
      } else {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
      if (pinnedMessage?.id === messageId) setPinnedMessage(null);
      toast({ title: "Message deleted" });
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handlePinMessage = (messageId: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;
    if (pinnedMessage?.id === messageId) { setPinnedMessage(null); toast({ title: "Unpinned" }); }
    else { setPinnedMessage(msg); toast({ title: "Pinned" }); }
  };

  const handleSelectMessage = (messageId: string) => {
    setSelectedMessages(prev => { const n = new Set(prev); n.has(messageId) ? n.delete(messageId) : n.add(messageId); return n; });
  };

  const handleVoiceSend = async (audioBlob: Blob, duration: number) => {
    if (!user) return;
    const chatId = chat?.id || groupId;
    try {
      const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
      const publicUrl = await MediaService.uploadChatMedia(audioFile);
      const { data, error } = await supabase.from('messages').insert({
        chat_id: chatId, user_id: user.id, content: '', type: 'text', media_url: publicUrl, duration: Math.max(1, duration),
      }).select('*').single();
      if (error) throw error;
      const newMsg: Message = {
        id: data.id, chatId, userId: user.id, user: { id: user.id, name: 'You' } as any,
        content: '', type: 'voice', mediaUrl: publicUrl, duration, timestamp: new Date(data.created_at), seen: false, status: 'sent', synced: true,
      };
      setMessages(prev => [...prev, newMsg]);
    } catch (error) { toast({ title: "Error", description: "Failed to send voice", variant: "destructive" }); }
  };

  const handleAttachment = async (file: File) => {
    setPreviewFile(file);
    setShowMediaPreview(true);
  };

  const handleSendMedia = async (file: File, caption?: string) => {
    if (!user) return;
    const chatId = chat?.id || groupId;
    try {
      const publicUrl = await MediaService.uploadChatMedia(file);
      let mediaType: 'image' | 'video' | 'text' = 'text';
      if (file.type.startsWith('image/')) mediaType = 'image';
      else if (file.type.startsWith('video/')) mediaType = 'video';
      const insertData: any = { chat_id: chatId, user_id: user.id, content: caption || '', type: mediaType, media_url: publicUrl };
      if (replyingTo?.id) insertData.reply_to_id = replyingTo.id;
      const { data, error } = await supabase.from('messages').insert(insertData).select('*').single();
      if (error) throw error;
      let frontendType: any = mediaType;
      if (file.type.startsWith('audio/')) frontendType = 'audio';
      const newMsg: Message = {
        id: data.id, chatId, userId: user.id, user: { id: user.id, name: 'You' } as any,
        content: caption || '', type: frontendType, mediaUrl: publicUrl, timestamp: new Date(data.created_at),
        seen: false, status: 'sent', synced: true, fileName: file.name, fileSize: file.size,
      };
      setMessages(prev => [...prev, newMsg]);
      setReplyingTo(null);
      setPreviewFile(null);
      setShowMediaPreview(false);
    } catch (error) { toast({ title: "Error", description: "Failed to send media", variant: "destructive" }); }
  };

  const handleRetrySend = async (message: Message) => {
    const chatId = chat?.id || groupId;
    const tempId = message.localId || message.id;
    setMessages(prev => prev.map(m => (m.localId === tempId || m.id === tempId) ? { ...m, status: 'pending' as MessageStatus } : m));
    try {
      const serverMessage = await dataService.sendMessage(chatId, message.content);
      processedMessageIds.current.add(serverMessage.id);
      setMessages(prev => prev.map(m => (m.localId === tempId || m.id === tempId) ? { ...serverMessage, status: 'sent' } : m));
    } catch {
      setMessages(prev => prev.map(m => (m.localId === tempId || m.id === tempId) ? { ...m, status: 'failed' as MessageStatus } : m));
    }
  };

  const groupName = chat?.name || 'Group Chat';
  const memberCount = chat?.participants?.length || 0;

  if (showSettings) {
    return <GroupSettingsPanel chatId={groupId} onClose={() => setShowSettings(false)} onGroupDeleted={onClose} />;
  }

  if (loading && !chat) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="flex items-center p-4 border-b bg-card gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="flex-1"><div className="h-4 w-32 bg-muted animate-pulse rounded" /></div>
        </div>
        <div className="flex-1 flex items-center justify-center"><LoadingDots /></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-card/95 backdrop-blur-md">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0"><ArrowLeft className="w-5 h-5" /></Button>
          <Avatar className="w-10 h-10 flex-shrink-0 cursor-pointer" onClick={() => setShowSettings(true)}>
            <AvatarImage src={chat?.avatar} />
            <AvatarFallback className="bg-primary/20"><Users className="w-5 h-5 text-primary" /></AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setShowSettings(true)}>
            <h3 className="font-semibold text-foreground truncate">{groupName}</h3>
            <p className="text-xs text-muted-foreground truncate">{memberCount} members{!isNetworkOnline && ' • Offline'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={() => toast({ title: "Coming Soon" })}><Phone className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" onClick={() => toast({ title: "Coming Soon" })}><Video className="w-5 h-5" /></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowSettings(true)}>Group Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setMessages([]); cacheMessages([]); toast({ title: "Chat Cleared" }); }} className="text-destructive">Clear Chat</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Pinned Message */}
      {pinnedMessage && (
        <div className="px-4 py-2 bg-primary/10 border-b border-primary/20 flex items-center gap-2">
          <Pin className="w-4 h-4 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Pinned message</p>
            <p className="text-sm truncate">{pinnedMessage.content}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPinnedMessage(null)}><X className="w-3 h-3" /></Button>
        </div>
      )}

      {/* Selection bar */}
      {selectedMessages.size > 0 && (
        <div className="px-4 py-2 bg-primary/10 border-b flex items-center justify-between">
          <span className="text-sm">{selectedMessages.size} selected</span>
          <Button variant="ghost" size="sm" onClick={() => setSelectedMessages(new Set())}>Cancel</Button>
        </div>
      )}

      {/* Messages - uses shared ChatMessage component */}
      <ScrollArea className="flex-1 p-4" style={chatWallpaper ? { backgroundImage: `url(${chatWallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
        {loading ? <LoadingDots /> : (
          <div className="space-y-1">
            {messages.map((message) => {
              const replyToMsg = message.replyToMessage || (message.replyToId ? messages.find(m => m.id === message.replyToId) : undefined);
              return (
                <div key={message.id || message.localId}>
                  <ChatMessage
                    message={message}
                    onReaction={(emoji) => handleReaction(message.id, emoji)}
                    onEdit={handleEditMessage}
                    onDelete={handleDeleteMessage}
                    onReply={setReplyingTo}
                    onForward={(msg) => toast({ title: "Forward", description: "Select chats to forward to" })}
                    onPin={handlePinMessage}
                    onSelect={handleSelectMessage}
                    isSelected={selectedMessages.has(message.id)}
                    selectedCount={selectedMessages.size}
                    isPinned={pinnedMessage?.id === message.id}
                    replyToMessage={replyToMsg}
                    selectedMessages={selectedMessages}
                    messages={messages}
                    onRetry={handleRetrySend}
                  />
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-primary/10 border-b border-primary/20 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary">Replying to {replyingTo.user.name}</p>
            <p className="text-sm truncate text-muted-foreground">{replyingTo.content}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => setReplyingTo(null)}><X className="w-4 h-4" /></Button>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t bg-card/95 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowAttachmentMenu(true)} className="flex-shrink-0"><Plus className="w-5 h-5" /></Button>
          <Input
            value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            className="flex-1 border border-border rounded-full"
          />
          {newMessage.trim() ? (
            <Button onClick={sendMessage} size="icon" disabled={!newMessage.trim()} className="rounded-full bg-primary hover:bg-primary/90 flex-shrink-0"><Send className="w-5 h-5" /></Button>
          ) : (
            <VoiceRecorder onSend={handleVoiceSend} onCancel={() => {}} />
          )}
        </div>
      </div>

      <AttachmentMenu
        isOpen={showAttachmentMenu}
        onClose={() => setShowAttachmentMenu(false)}
        onCamera={(file) => handleAttachment(file)}
        onGallery={(files) => handleAttachment(files[0])}
        onDocument={(file) => handleAttachment(file)}
        onAudio={(file) => handleAttachment(file)}
        onVideo={(file) => handleAttachment(file)}
      />

      {previewFile && (
        <MediaPreview file={previewFile} isOpen={showMediaPreview} onSend={handleSendMedia}
          onCancel={() => { setPreviewFile(null); setShowMediaPreview(false); }} />
      )}
    </div>
  );
};

export default GroupChatPopup;
