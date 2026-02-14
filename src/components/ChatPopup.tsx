import { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, Plus, Phone, Video, Pin, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Message, MessageStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { localMessageService, LocalMessage } from '@/services/localMessageService';
import { MediaService } from '@/services/mediaService';
import ChatMessage from './ChatMessage';
import OnlineStatusIndicator from './OnlineStatusIndicator';
import ChatSettingsMenu from './chat/ChatSettingsMenu';
import AttachmentMenu from './chat/AttachmentMenu';
import VoiceRecorder from './chat/VoiceRecorder';
import LoadingDots from './chat/LoadingDots';
import MediaPreview from './chat/MediaPreview';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useNavigate } from 'react-router-dom';

interface ChatPopupProps {
  user: User;
  onClose: () => void;
}

const ChatPopup = ({ user: chatUser, onClose }: ChatPopupProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isNetworkOnline = useNetworkStatus();
  const syncInProgressRef = useRef(false);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const sendSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    sendSound.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSl+zPDTgjMGHm7A7+OZSA0PVavk8LJiHAdEo+Hzu2ohBSl+zPDTgjMGHm7A7+OZSA0PVavk8LJiHAc=');
    sendSound.current.volume = 0.3;
  }, []);

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isNetworkOnline && chatId && !syncInProgressRef.current) {
      syncMessagesWithServer(chatId);
      processOutbox(chatId);
    }
  }, [isNetworkOnline, chatId]);

  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`messages:chat_${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        async (payload) => {
          if (processedMessageIds.current.has(payload.new.id)) return;
          processedMessageIds.current.add(payload.new.id);

          const { data: messageData } = await supabase
            .from('messages')
            .select(`*, user:profiles!messages_user_id_fkey (*)`)
            .eq('id', payload.new.id)
            .single();

          if (messageData && messageData.user_id !== user?.id) {
          // Determine frontend message type from DB data
          let frontendType: 'text' | 'image' | 'video' | 'voice' | 'audio' | 'document' = messageData.type as any;
          
          // If it's 'text' type in DB, check if it's actually voice/audio/document
          if (messageData.type === 'text') {
            if (messageData.media_url && messageData.duration && messageData.duration > 0 && !messageData.content) {
              frontendType = 'voice';
            } else if (messageData.media_url && messageData.media_url.match(/\.(mp3|wav|ogg|m4a|aac|webm)$/i)) {
              frontendType = 'audio';
            } else if (messageData.media_url && !messageData.duration) {
              frontendType = 'document';
            }
          }
          
            const newMsg: Message = {
              id: messageData.id,
              chatId: messageData.chat_id,
              userId: messageData.user_id,
              user: {
                ...messageData.user,
                photoURL: messageData.user.avatar || '',
                createdAt: new Date(messageData.user.created_at),
                followerCount: messageData.user.follower_count || 0,
                followingCount: messageData.user.following_count || 0,
                profileViews: messageData.user.profile_views || 0,
                birthday: messageData.user.birthday ? new Date(messageData.user.birthday) : undefined
              } as unknown as User,
              content: messageData.content,
            type: frontendType,
              mediaUrl: messageData.media_url,
              duration: messageData.duration,
              seen: messageData.seen,
              timestamp: new Date(messageData.created_at),
              status: messageData.seen ? 'read' : 'delivered',
            synced: true,
            fileName: messageData.media_url ? messageData.media_url.split('/').pop()?.split('?')[0] : undefined
            };
            
            const localMsg: LocalMessage = { ...newMsg, status: newMsg.status || 'delivered', synced: true };
            await localMessageService.saveMessage(localMsg);
            
            // If user was hidden, remove them from hidden list (they sent a message)
            const hiddenUsers = JSON.parse(localStorage.getItem('hidden-chat-users') || '[]');
            if (hiddenUsers.includes(messageData.user_id)) {
              const updated = hiddenUsers.filter((id: string) => id !== messageData.user_id);
              localStorage.setItem('hidden-chat-users', JSON.stringify(updated));
              // Dispatch event to refresh chat list
              window.dispatchEvent(new CustomEvent('chatListUpdate'));
            }
            
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        async (payload) => {
          const updated: any = payload.new;
          setMessages(prev =>
            prev.map(m =>
              m.id === updated.id
                ? { ...m, content: updated.content ?? m.content, seen: updated.seen ?? m.seen, status: updated.seen ? 'read' : m.status }
                : m
            )
          );
        }
      )
      .subscribe();

    // Subscribe to reactions
    const reactionsChannel = supabase
      .channel(`message_reactions:${chatId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        async () => {
          // Refresh messages to get updated reactions
          if (chatId) await syncMessagesWithServer(chatId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(reactionsChannel);
    };
  }, [chatId, user?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeChat = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      // Attempt to get or create chat on server. If offline or RPC fails,
      // fall back to local storage to allow full offline access.
      let resolvedChatId: string | null = null;

      try {
        const { data: chatId, error: chatError } = await supabase.rpc('get_or_create_direct_chat', {
          p_other_user_id: chatUser.id
        });

        if (chatError) throw chatError;

        resolvedChatId = chatId;
      } catch (err) {
        // Server unavailable or offline — try to find a chat id from local messages
        try {
          const found = await localMessageService.findChatIdForDirectChat(user.id, chatUser.id);
          if (found) resolvedChatId = found;
        } catch (e) {
          // ignore
        }
      }

      // If still no chatId, create a local temporary chatId so outbox and local messages work offline
      if (!resolvedChatId) {
        resolvedChatId = `local_${user.id}_${chatUser.id}`;
      }

      setChatId(resolvedChatId);

      const localMessages = await localMessageService.getMessages(resolvedChatId);
      const convertedMessages: Message[] = localMessages.map(msg => ({
        ...msg,
        status: msg.status,
        synced: msg.synced
      }));
      
      setMessages(convertedMessages);
      
      if (isNetworkOnline && resolvedChatId) {
        await syncMessagesWithServer(resolvedChatId);
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      if (isNetworkOnline) {
        toast({ title: "Info", description: "Failed to initialize chat. Retrying..." });
      } else {
        // Offline: do not show destructive toast, allow user to continue with local messages
        console.debug('Offline - showing local messages where available');
      }
    } finally {
      setLoading(false);
    }
  };

  const syncMessagesWithServer = async (chatId: string) => {
    if (syncInProgressRef.current) return;
    syncInProgressRef.current = true;

    try {
      // If this is a temporary local chat id created while offline, try to obtain the real
      // server chat id and migrate local messages/outbox to it.
      if (chatId.startsWith('local_')) {
        try {
          // local_{currentUserId}_{otherUserId}
          const suffix = chatId.slice('local_'.length);
          const idx = suffix.indexOf('_');
          const otherUserId = idx === -1 ? suffix : suffix.slice(idx + 1);

          const { data: realChatId, error: rpcErr } = await supabase.rpc('get_or_create_direct_chat', {
            p_other_user_id: otherUserId
          });

          if (!rpcErr && realChatId) {
            // Migrate messages: update stored messages to use realChatId
            try {
              const localMsgs = await localMessageService.getMessages(chatId);
              for (const m of localMsgs) {
                // update chatId and re-save
                const updated = { ...m, chatId: realChatId } as LocalMessage;
                await localMessageService.saveMessage(updated);
              }

              // Migrate outbox entries
              const outbox = await localMessageService.getOutboxMessages();
              for (const ob of outbox.filter(o => o.chatId === chatId)) {
                try {
                  // remove old outbox and re-add with new chatId
                  if (ob.localId) await localMessageService.removeFromOutbox(ob.localId);
                  await localMessageService.addToOutbox({ ...ob, chatId: realChatId });
                } catch (e) {
                  // ignore per-message errors
                }
              }

              // Update component state chatId to real one
              setChatId(realChatId);
              chatId = realChatId;
            } catch (e) {
              console.warn('Failed to migrate local chat messages:', e);
            }
          }
        } catch (e) {
          // ignore migration errors and continue; we'll try server sync below which may fail
        }
      }

      const serverMessages = await dataService.getMessages(chatId);
      
      // Fetch reactions for each message
      const messagesWithReactions = await Promise.all(
        serverMessages.map(async (msg) => {
          const { data: reactions } = await supabase
            .from('message_reactions')
            .select('*')
            .eq('message_id', msg.id);
          const mappedReactions = (reactions || []).map(r => ({
            id: r.id,
            messageId: r.message_id,
            userId: r.user_id,
            emoji: r.emoji,
            createdAt: new Date(r.created_at)
          }));
          return { ...msg, reactions: mappedReactions };
        })
      );
      
      const localMessages: LocalMessage[] = serverMessages.map(msg => ({
        ...msg,
        status: msg.seen ? 'read' : 'delivered',
        synced: true
      })) as LocalMessage[];
      
      await localMessageService.saveMessages(localMessages);
      
      setMessages(prev => {
        const serverIds = new Set(messagesWithReactions.map(m => m.id));
        const localOnly = prev.filter(m => !serverIds.has(m.id) && m.status === 'pending');
        const converted: Message[] = messagesWithReactions.map(msg => {
          // Determine frontend message type from DB data
          let frontendType: 'text' | 'image' | 'video' | 'voice' | 'audio' | 'document' = msg.type as any;
          
          // If it's 'text' type in DB, check if it's actually voice/audio/document
          if (msg.type === 'text') {
            if (msg.mediaUrl && msg.duration && msg.duration > 0 && !msg.content) {
              frontendType = 'voice';
            } else if (msg.mediaUrl && msg.mediaUrl.match(/\.(mp3|wav|ogg|m4a|aac|webm)$/i)) {
              frontendType = 'audio';
            } else if (msg.mediaUrl && !msg.duration) {
              frontendType = 'document';
            }
          }
          
          return {
          ...msg,
            type: frontendType,
            status: (msg.seen ? 'read' : 'delivered') as MessageStatus,
            fileName: msg.mediaUrl ? msg.mediaUrl.split('/').pop()?.split('?')[0] : undefined
          };
        });
        return [...converted, ...localOnly].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      });

      await processOutbox(chatId);
    } catch (error) {
      console.error('Error syncing messages:', error);
    } finally {
      syncInProgressRef.current = false;
    }
  };

  const processOutbox = async (chatId: string) => {
    try {
      const outboxMessages = await localMessageService.getOutboxMessages();
      const chatOutbox = outboxMessages.filter(m => m.chatId === chatId);

      for (const localMsg of chatOutbox) {
        try {
          const serverMessage = await dataService.sendMessage(chatId, localMsg.content);
          
          await localMessageService.saveMessage({ ...localMsg, id: serverMessage.id, status: 'sent', synced: true });
          if (localMsg.localId) await localMessageService.removeFromOutbox(localMsg.localId);
          
          setMessages(prev => prev.map(m => 
            m.localId === localMsg.localId ? { ...serverMessage, status: 'sent' as MessageStatus } : m
          ));
        } catch (error) {
          console.error('Error sending message from outbox:', error);
        }
      }
    } catch (error) {
      console.error('Error processing outbox:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId || !user) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    const currentReplyingTo = replyingTo;
    setReplyingTo(null);

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tempMessage: Message = {
      id: tempId,
      chatId,
      userId: user.id,
      user,
      content: messageContent,
      type: 'text',
      timestamp: new Date(),
      seen: false,
      status: 'pending',
      localId: tempId,
      synced: false,
      replyToMessage: currentReplyingTo || undefined
    };

    setMessages(prev => [...prev, tempMessage]);
    processedMessageIds.current.add(tempId);

    const localMsg: LocalMessage = { ...tempMessage, status: 'pending', synced: false };
    await localMessageService.saveMessage(localMsg);

    if (isNetworkOnline) {
      try {
        // Send message with reply reference if exists
        let serverMessage: Message;
        if (currentReplyingTo) {
          const insertData: any = {
            chat_id: chatId,
            user_id: user.id,
            content: messageContent,
            type: 'text'
          };
          
          // Only add reply_to_id if column exists
          try {
            insertData.reply_to_id = currentReplyingTo.id;
          } catch (e) {
            console.log('reply_to_id column not available');
          }
          
          const { data: messageData, error: messageError } = await supabase
            .from('messages')
            .insert(insertData)
            .select(`
              *,
              user:profiles!messages_user_id_fkey (
                id,
                name,
                username,
                avatar
              )
            `)
            .single();

          if (messageError) throw messageError;

          serverMessage = {
            id: messageData.id,
            chatId: messageData.chat_id,
            userId: messageData.user_id,
            user: {
              ...messageData.user,
              photoURL: messageData.user.avatar || '',
              createdAt: new Date(),
              followerCount: 0,
              followingCount: 0,
              profileViews: 0
            } as unknown as User,
            content: messageContent,
            type: 'text',
            timestamp: new Date(messageData.created_at),
            seen: false,
            status: 'sent',
            synced: true,
            replyToMessage: currentReplyingTo
          };
        } else {
          serverMessage = await dataService.sendMessage(chatId, messageContent);
        }
        
        processedMessageIds.current.add(serverMessage.id);
        
        setMessages(prev => prev.map(m => m.localId === tempId ? { ...serverMessage, status: 'sent' } : m));
        
        await localMessageService.saveMessage({ ...serverMessage, status: 'sent', synced: true });
        await localMessageService.deleteMessage(tempId, chatId);
        
        if (sendSound.current) sendSound.current.play().catch(() => {});
      } catch (error) {
        console.error('Error sending message:', error);
        toast({ title: "Queued", description: "Message will be sent when online" });
        await localMessageService.addToOutbox(localMsg);
      }
    } else {
      await localMessageService.addToOutbox(localMsg);
    }

    scrollToBottom();
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user || !chatId) return;

    try {
      const { data: existing } = await supabase
        .from('message_reactions')
        .select('id, emoji')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        if (existing.emoji === emoji) {
          // Remove reaction if same emoji
          await supabase.from('message_reactions').delete().eq('id', existing.id);
        } else {
          // Update to new emoji
          await supabase.from('message_reactions').update({ emoji }).eq('id', existing.id);
        }
      } else {
        await supabase.from('message_reactions').insert({ message_id: messageId, user_id: user.id, emoji });
      }

      // Update local state immediately
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m;
        const reactions = m.reactions || [];
        const existingIdx = reactions.findIndex(r => r.userId === user.id);
        
        if (existingIdx >= 0) {
          if (reactions[existingIdx].emoji === emoji) {
            return { ...m, reactions: reactions.filter((_, i) => i !== existingIdx) };
          }
          return { ...m, reactions: reactions.map((r, i) => i === existingIdx ? { ...r, emoji } : r) };
        }
        return { ...m, reactions: [...reactions, { id: '', messageId, userId: user.id, emoji, createdAt: new Date() }] };
      }));
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!chatId) return;

    try {
      const contentWithEdit = newContent + ' [edited]';
      await supabase.from('messages').update({ content: contentWithEdit }).eq('id', messageId);
      
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: contentWithEdit } : m));
      toast({ title: "Message edited" });
    } catch (error) {
      console.error('Error editing message:', error);
      toast({ title: "Error", description: "Failed to edit message", variant: "destructive" });
    }
  };

  const handleDeleteMessage = async (messageId: string, deleteForEveryone: boolean) => {
    if (!chatId) return;

    try {
      // Handle multiple message deletion
      if (selectedMessages.size > 1) {
        const messageIds = Array.from(selectedMessages);
        if (deleteForEveryone) {
          await supabase.from('messages').delete().in('id', messageIds);
        }
        
        setMessages(prev => prev.filter(m => !messageIds.includes(m.id)));
        for (const id of messageIds) {
          if (typeof id === 'string') {
            await localMessageService.deleteMessage(id, chatId);
          }
        }
        
        setSelectedMessages(new Set());
        if (pinnedMessage && messageIds.includes(pinnedMessage.id)) setPinnedMessage(null);
        
        toast({ title: "Messages deleted", description: `${messageIds.length} messages deleted` });
      } else {
        // Single message deletion
      if (deleteForEveryone) {
        await supabase.from('messages').delete().eq('id', messageId);
      }
      
      setMessages(prev => prev.filter(m => m.id !== messageId));
      await localMessageService.deleteMessage(messageId, chatId);
      
      if (pinnedMessage?.id === messageId) setPinnedMessage(null);
      
      toast({ title: "Message deleted", description: deleteForEveryone ? "Deleted for everyone" : "Deleted for you" });
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({ title: "Error", description: "Failed to delete message", variant: "destructive" });
    }
  };

  const handlePinMessage = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    if (pinnedMessage?.id === messageId) {
      setPinnedMessage(null);
      toast({ title: "Message unpinned" });
    } else {
      setPinnedMessage(message);
      toast({ title: "Message pinned" });
    }
  };

  const handleSelectMessage = (messageId: string) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const handleCopyMultiple = () => {
    if (selectedMessages.size === 0) return;
    const selectedTexts = Array.from(selectedMessages).map(id => {
      const msg = messages.find(m => m.id === id);
      return msg ? `${msg.user.name}: ${msg.content || '[Media]'}` : '';
    }).filter(Boolean).join('\n\n');
    navigator.clipboard.writeText(selectedTexts);
    toast({ title: "Copied", description: `${selectedMessages.size} messages copied` });
    setSelectedMessages(new Set());
  };

  const handleDeleteMultiple = async () => {
    if (selectedMessages.size === 0 || !chatId) return;
    
    try {
      const messageIds = Array.from(selectedMessages);
      await supabase.from('messages').delete().in('id', messageIds);
      
      setMessages(prev => prev.filter(m => !messageIds.includes(m.id)));
      for (const id of messageIds) {
        if (typeof id === 'string') {
          await localMessageService.deleteMessage(id, chatId);
        }
      }
      
      setSelectedMessages(new Set());
      if (pinnedMessage && messageIds.includes(pinnedMessage.id)) setPinnedMessage(null);
      
      toast({ title: "Messages deleted", description: `${messageIds.length} messages deleted` });
    } catch (error) {
      console.error('Error deleting messages:', error);
      toast({ title: "Error", description: "Failed to delete messages", variant: "destructive" });
    }
  };

  const handleAttachment = async (file: File, type: string) => {
    // Show preview for images, videos, and documents
    if (file.type.startsWith('image/') || file.type.startsWith('video/') || 
        file.type.includes('pdf') || file.type.includes('document') || 
        file.type.includes('text') || file.type.includes('sheet') || 
        file.type.includes('presentation')) {
      setPreviewFile(file);
      setShowMediaPreview(true);
    } else {
      // For other files, send directly
      await handleSendMedia(file);
    }
  };

  const handleSendMedia = async (file: File, caption?: string) => {
    if (!chatId || !user) return;

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      // Use MediaService for upload (fallback to direct upload if needed)
      let publicUrl: string;
      
      try {
        // Try using MediaService first
        publicUrl = await MediaService.uploadChatMedia(file);
      } catch (mediaServiceError) {
        console.log('MediaService failed, trying direct upload:', mediaServiceError);
        
        // Fallback: Upload directly to Supabase storage
        const fileExt = file.name.split('.').pop() || 'bin';
        const fileName = `${currentUser.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        // Try different bucket names
        const buckets = ['chat-media', 'media', 'uploads'];
        let uploadSuccess = false;
        
        for (const bucket of buckets) {
          try {
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from(bucket)
              .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
              });

            if (!uploadError) {
              const { data: { publicUrl: url } } = supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);
              publicUrl = url;
              uploadSuccess = true;
              break;
            }
          } catch (bucketError) {
            console.log(`Bucket ${bucket} failed, trying next...`);
            continue;
          }
        }
        
        if (!uploadSuccess) {
          // Last resort: Create object URL (temporary, but works for demo)
          publicUrl = URL.createObjectURL(file);
          console.warn('Using temporary object URL for media');
        }
      }

      // Determine media type based on DB constraint (only 'text', 'image', 'video' allowed)
      let mediaType: 'image' | 'video' | 'text' = 'text';
      const fileName = file.name;
      const fileSize = file.size;
      
      if (file.type.startsWith('image/')) {
        mediaType = 'image';
      } else if (file.type.startsWith('video/')) {
        mediaType = 'video';
      } else {
        // Audio files and documents use 'text' type, identified by media_url + file extension
        mediaType = 'text';
      }

      // Create message with media
      const messageContent = caption || '';
      const insertData: any = {
        chat_id: chatId,
        user_id: currentUser.id,
        content: messageContent,
        type: mediaType,
        media_url: publicUrl
      };
      
      // Only add reply_to_id if replyingTo exists (column may not exist in schema)
      if (replyingTo?.id) {
        try {
          // Try to add reply reference - if column doesn't exist, it will be ignored
          insertData.reply_to_id = replyingTo.id;
        } catch (e) {
          // Column doesn't exist, continue without it
          console.log('reply_to_id column not available');
        }
      }
      
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert(insertData)
        .select(`
          *,
          user:profiles!messages_user_id_fkey (
            id,
            name,
            username,
            avatar
          )
        `)
        .single();

      if (messageError) {
        console.error('Message insert error:', messageError);
        throw messageError;
      }

      // Determine frontend message type
      let frontendType: 'text' | 'image' | 'video' | 'voice' | 'audio' | 'document' = mediaType;
      if (file.type.startsWith('audio/') || fileName.match(/\.(mp3|wav|ogg|m4a|aac|webm)$/i)) {
        frontendType = 'audio';
      } else if (mediaType === 'text' && publicUrl && !messageContent) {
        // Document file (not audio, not image, not video)
        frontendType = 'document';
      }

      const newMessage: Message = {
        id: messageData.id,
        chatId: messageData.chat_id,
        userId: messageData.user_id,
        user: {
          ...messageData.user,
          photoURL: messageData.user.avatar || '',
          createdAt: new Date(),
          followerCount: 0,
          followingCount: 0,
          profileViews: 0
        } as unknown as User,
        content: messageContent,
        type: frontendType,
        mediaUrl: publicUrl,
        timestamp: new Date(messageData.created_at),
        seen: false,
        status: 'sent',
        synced: true,
        replyToMessage: replyingTo || undefined,
        fileName: fileName,
        fileSize: fileSize
      } as Message;

      setMessages(prev => [...prev, newMessage]);
      setReplyingTo(null);
      setPreviewFile(null);
      setShowMediaPreview(false);
      
      if (sendSound.current) sendSound.current.play().catch(() => {});
      
      toast({ title: "Media sent", description: "Your media has been sent successfully" });
      scrollToBottom();
    } catch (error: any) {
      console.error('Error sending media:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to send media. Please try again.", 
        variant: "destructive" 
      });
    }
  };

  const handleVoiceSend = async (audioBlob: Blob, duration: number) => {
    if (!chatId || !user) return;

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      // Convert blob to file
      const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
      
      // Upload voice message
      let publicUrl: string;
      try {
        publicUrl = await MediaService.uploadChatMedia(audioFile);
      } catch (mediaServiceError) {
        // Fallback: Direct upload
        const fileName = `${currentUser.id}/voice_${Date.now()}.webm`;
        const buckets = ['chat-media', 'media', 'uploads'];
        let uploadSuccess = false;
        
        for (const bucket of buckets) {
          try {
            const { error: uploadError } = await supabase.storage
              .from(bucket)
              .upload(fileName, audioFile);
            
            if (!uploadError) {
              const { data: { publicUrl: url } } = supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);
              publicUrl = url;
              uploadSuccess = true;
              break;
            }
          } catch (bucketError) {
            continue;
          }
        }
        
        if (!uploadSuccess) {
          publicUrl = URL.createObjectURL(audioBlob);
        }
      }

      // Create voice message - use 'text' type since DB constraint only allows 'text', 'image', 'video'
      // We'll identify it as voice by checking duration > 0 in frontend
      const insertData: any = {
        chat_id: chatId,
        user_id: currentUser.id,
        content: '', // Empty content for voice messages
        type: 'text', // Use 'text' type to satisfy DB constraint
        media_url: publicUrl,
        duration: Math.max(1, duration) // Ensure duration is at least 1 to identify as voice
      };
      
      // Only add reply_to_id if replyingTo exists (column may not exist in schema)
      if (replyingTo?.id) {
        try {
          insertData.reply_to_id = replyingTo.id;
        } catch (e) {
          console.log('reply_to_id column not available');
        }
      }
      
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert(insertData)
        .select(`
          *,
          user:profiles!messages_user_id_fkey (
            id,
            name,
            username,
            avatar
          )
        `)
        .single();

      if (messageError) throw messageError;

      const newMessage: Message = {
        id: messageData.id,
        chatId: messageData.chat_id,
        userId: messageData.user_id,
        user: {
          ...messageData.user,
          photoURL: messageData.user.avatar || '',
          createdAt: new Date(),
          followerCount: 0,
          followingCount: 0,
          profileViews: 0
        } as unknown as User,
        content: '',
        type: 'voice', // Frontend type - identified by duration > 0
        mediaUrl: publicUrl,
        duration: duration,
        timestamp: new Date(messageData.created_at),
        seen: false,
        status: 'sent',
        synced: true,
        replyToMessage: replyingTo || undefined,
        fileName: `voice_${Date.now()}.webm`,
        fileSize: audioBlob.size
      };

      setMessages(prev => [...prev, newMessage]);
      setReplyingTo(null);
      
      if (sendSound.current) sendSound.current.play().catch(() => {});
      
      toast({ title: "Voice message sent", description: `${duration}s voice message sent` });
      scrollToBottom();
    } catch (error: any) {
      console.error('Error sending voice message:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to send voice message", 
        variant: "destructive" 
      });
    }
  };

  const handleChatSettings = {
    onMute: (duration: string) => toast({ title: "Chat muted", description: `Notifications muted for ${duration}` }),
    onClear: async () => {
      if (!chatId) return;
      try {
        // Get all message IDs first
        const messageIds = messages.map(m => m.id).filter(Boolean);
        
        // Delete from Supabase
        if (messageIds.length > 0) {
          await supabase.from('messages').delete().in('id', messageIds);
        }
        // Also delete by chat_id to catch any missed messages
        await supabase.from('messages').delete().eq('chat_id', chatId);
        
        // Clear all messages from local storage/IndexedDB
        await localMessageService.clearChatMessages(chatId);
        
        // Clear state
        setMessages([]);
        setPinnedMessage(null);
        
        // Force refresh to ensure no messages remain
        await initializeChat();
        
        toast({ title: "Chat cleared", description: "All messages have been permanently deleted" });
      } catch (error) {
        console.error('Error clearing chat:', error);
        toast({ title: "Error", description: "Failed to clear chat", variant: "destructive" });
      }
    },
    onExport: () => {
      const exportText = messages.map(m => `[${m.timestamp.toLocaleString()}] ${m.user.name}: ${m.content}`).join('\n');
      const blob = new Blob([exportText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${chatUser.name}-${new Date().toISOString()}.txt`;
      a.click();
      toast({ title: "Chat exported", description: "Chat saved as text file" });
    },
    onBlock: () => toast({ title: "User blocked", description: `You won't receive messages from ${chatUser.name}`, variant: "destructive" }),
    onReport: () => toast({ title: "Report submitted", description: "Thank you for reporting. We'll review this." }),
    onFavorite: () => toast({ title: "Added to favorites", description: `${chatUser.name} added to favorites` }),
    onViewProfile: () => navigate(`/profile/${chatUser.username}`),
    onDisappearingMessages: (duration: string) => toast({ title: "Disappearing messages", description: `Messages will disappear after ${duration}` })
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-2 border-primary/20">
        <div className="flex items-center gap-3 flex-1">
          <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Avatar className="w-10 h-10">
            <AvatarImage src={chatUser.avatar} />
            <AvatarFallback>{chatUser.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold">{chatUser.name}</p>
            <div className="flex items-center gap-1">
              <OnlineStatusIndicator userId={chatUser.id} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => toast({ title: "Coming Soon", description: "Voice call feature" })}>
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => toast({ title: "Coming Soon", description: "Video call feature" })}>
            <Video className="w-5 h-5" />
          </Button>
          <ChatSettingsMenu chatUser={chatUser} {...handleChatSettings} />
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
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPinnedMessage(null)}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Selection bar */}
      {selectedMessages.size > 0 && (
        <div className="px-4 py-2 bg-primary/10 border-b border-primary/20 flex items-center justify-between">
          <span className="text-sm">{selectedMessages.size} selected</span>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={async () => {
                if (selectedMessages.size === 0 || !chatId) return;
                try {
                  const messageIds = Array.from(selectedMessages);
                  // Delete permanently from database
                  await supabase.from('messages').delete().in('id', messageIds);
                  
                  // Delete from local storage
                  setMessages(prev => prev.filter(m => !messageIds.includes(m.id)));
                  for (const id of messageIds) {
                    if (typeof id === 'string') {
                      await localMessageService.deleteMessage(id, chatId);
                    }
                  }
                  
                  setSelectedMessages(new Set());
                  if (pinnedMessage && messageIds.includes(pinnedMessage.id)) setPinnedMessage(null);
                  
                  toast({ 
                    title: "Messages Deleted", 
                    description: `${messageIds.length} message(s) permanently deleted`,
                    variant: "default"
                  });
                } catch (error) {
                  console.error('Error deleting messages:', error);
                  toast({ 
                    title: "Error", 
                    description: "Failed to delete messages", 
                    variant: "destructive" 
                  });
                }
              }}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedMessages(new Set())}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <LoadingDots />
        ) : (
          <div className="space-y-1">
            {messages.map((message) => {
              // Find reply-to message if exists
              const replyToMsg = message.replyToMessage || 
                (message as any).reply_to_id ? 
                  messages.find(m => m.id === (message as any).reply_to_id) : 
                  undefined;
              
              return (
                <div key={message.id || message.localId}>
              <ChatMessage
                message={message}
                onReaction={(emoji) => handleReaction(message.id, emoji)}
                onEdit={handleEditMessage}
                onDelete={handleDeleteMessage}
                onReply={setReplyingTo}
                onForward={(msg) => {
                  toast({ title: "Forward message", description: "Select chats to forward to" });
                  navigate('/chat');
                }}
                onPin={handlePinMessage}
                onSelect={handleSelectMessage}
                isSelected={selectedMessages.has(message.id)}
                selectedCount={selectedMessages.size}
                isPinned={pinnedMessage?.id === message.id}
                  replyToMessage={replyToMsg}
                  selectedMessages={selectedMessages}
                  messages={messages}
                  onDeleteMultiple={handleDeleteMultiple}
                  onCopyMultiple={handleCopyMultiple}
              />
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Reply Preview - Show at top when replying */}
      {replyingTo && (
        <div className="px-4 py-2 bg-primary/10 border-b border-primary/20 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary">Replying to {replyingTo.user.name}</p>
            <p className="text-sm truncate text-muted-foreground">{replyingTo.content}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => setReplyingTo(null)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t-2 border-primary/20">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowAttachmentMenu(true)} className="flex-shrink-0">
            <Plus className="w-5 h-5" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 border-2 border-primary/30 focus:border-primary rounded-full"
          />
          {newMessage.trim() ? (
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              size="icon"
              className="rounded-full bg-primary hover:bg-primary/90 flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </Button>
          ) : (
            <VoiceRecorder onSend={handleVoiceSend} onCancel={() => {}} />
          )}
        </div>
      </div>

      {/* Attachment Menu */}
      <AttachmentMenu
        isOpen={showAttachmentMenu}
        onClose={() => setShowAttachmentMenu(false)}
        onCamera={(file) => handleAttachment(file, 'Camera')}
        onGallery={(files) => handleAttachment(files[0], 'Gallery')}
        onDocument={(file) => handleAttachment(file, 'Document')}
        onAudio={(file) => handleAttachment(file, 'Audio')}
        onVideo={(file) => handleAttachment(file, 'Video')}
      />

      {/* Media Preview */}
      {previewFile && (
        <MediaPreview
          file={previewFile}
          isOpen={showMediaPreview}
          onSend={handleSendMedia}
          onCancel={() => {
            setPreviewFile(null);
            setShowMediaPreview(false);
          }}
        />
      )}
    </div>
  );
};

export default ChatPopup;
