import React, { useEffect, useRef, useState } from 'react';
import Layout from '@/components/Layout';
import ChatListItem from '@/components/ChatListItem';
import MessageItem from '@/components/MessageItem';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Search, MoreVertical, ArrowLeft, Send, Paperclip } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCache } from '@/hooks/useCache';
import WizAiChat from '@/components/WizAiChat';
import { User, Message } from '@/types';

const WIZAI_USER: User = {
  id: 'wizai',
  name: 'WizAi',
  email: 'wizai@wizchat.app',
  username: 'wizai',
  avatar: 'data:image/svg+xml;utf8,<svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" rx="100" fill="white"/><ellipse cx="100" cy="85" rx="55" ry="45" fill="black"/><ellipse cx="82" cy="80" rx="6" ry="6" fill="white"/><ellipse cx="118" cy="80" rx="6" ry="6" fill="white"/><rect x="70" y="124" width="60" height="19" rx="9.5" fill="black" stroke="white" stroke-width="4"/></svg>',
  bio: 'Your AI assistant',
  photoURL: '',
  followerCount: 0,
  followingCount: 0,
  profileViews: 0,
  createdAt: new Date(),
};

export default function ChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { cachedData: cachedFriends, setCache: setCachedFriends, isStale } = useCache({ key: 'chat-friends-list', ttl: 2 * 60 * 1000 });

  const [friends, setFriends] = useState<User[]>(cachedFriends || []);
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [disappearingMessages, setDisappearingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { loadFriends(); }, [user]);

  const loadFriends = async () => {
    if (!user) return;
    try {
      if (!isStale && cachedFriends) setFriends(cachedFriends as User[]);
      const f = await dataService.getFriends();
      setFriends(f.map(fr => fr.requesterId === user.id ? fr.addressee : fr.requester) as unknown as User[]);
      setCachedFriends(f as any);
    } catch (err) {
      console.error('Error loading friends:', err);
      toast({ title: 'Error', description: 'Failed to load friends', variant: 'destructive' });
    }
  };

  // When selectedFriend changes we ensure a chat exists and load messages
  useEffect(() => {
    if (!selectedFriend) {
      setChatId(null);
      setMessages([]);
      return;
    }

    if (selectedFriend.id === 'wizai') return; // WizAi handled separately

    let mounted = true;

    const ensureChatAndLoad = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Try to create or fetch chat using dataService.createChat (safe)
        const chatObj = await dataService.createChat([user.id, selectedFriend.id], false, undefined, undefined);
        if (!mounted) return;
        setChatId(chatObj.id);

        const msgs = await dataService.getMessages(chatObj.id);
        if (!mounted) return;
        setMessages(msgs || []);
        setTimeout(scrollToBottom, 100);
      } catch (err) {
        console.error('Error ensuring/loading chat:', err);
        toast({ title: 'Error', description: 'Failed to open conversation', variant: 'destructive' });
        setChatId(null);
        setMessages([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    ensureChatAndLoad();

    return () => { mounted = false; };
  }, [selectedFriend?.id]);

  // Realtime subscription for messages in the open chat
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`messages:chat_${chatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, async (payload) => {
        try {
          const { data: messageData } = await supabase
            .from('messages')
            .select(`*, user:profiles!messages_user_id_fkey (id,name,username,avatar)`)
            .eq('id', payload.new.id)
            .single();

          if (messageData) {
            const newMsg: Message = {
              id: messageData.id,
              chatId: messageData.chat_id,
              userId: messageData.user_id,
              user: messageData.user as User,
              content: messageData.content,
              type: messageData.type as any,
              mediaUrl: messageData.media_url,
              duration: messageData.duration,
              seen: messageData.seen,
              timestamp: new Date(messageData.created_at),
            };

            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              const tempIndex = prev.findIndex(m => typeof m.id === 'string' && m.id.startsWith('temp-') && m.userId === newMsg.userId && m.content === newMsg.content && Math.abs(newMsg.timestamp.getTime() - m.timestamp.getTime()) < 5000);
              if (tempIndex !== -1) {
                const copy = [...prev]; copy[tempIndex] = newMsg; return copy;
              }
              return [...prev, newMsg];
            });

            setTimeout(scrollToBottom, 50);
          }
        } catch (err) { console.error('Realtime insert handler error:', err); }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, (payload) => {
        const updated: any = payload.new;
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, content: updated.content ?? m.content, mediaUrl: updated.media_url ?? m.mediaUrl, seen: updated.seen ?? m.seen } : m));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, (payload) => {
        const removed: any = payload.old; setMessages(prev => prev.filter(m => m.id !== removed.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chatId]);

  const handleSend = async () => {
    if (!newMessage.trim() || !chatId || !user) return;
    setSending(true);
    const content = newMessage.trim();
    const replyToId = replyingTo?.id;
    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = { id: tempId, chatId: chatId!, userId: user.id, user: { id: user.id, name: user.name || '', username: (user as any).username || '', email: user.email || '', avatar: (user as any).avatar || (user as any).photoURL || '' }, content, type: 'text', mediaUrl: undefined, duration: undefined, seen: false, timestamp: new Date() };
    setMessages(prev => [...prev, tempMsg]);
    setNewMessage(''); setReplyingTo(null);
    scrollToBottom();

    try {
      const sent = await dataService.sendMessage(chatId!, content, replyToId);
      setMessages(prev => prev.map(m => m.id === tempId ? sent : m));
      await supabase.from('chats').update({ updated_at: new Date().toISOString() }).eq('id', chatId);
    } catch (err) {
      console.error('Send error:', err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(content);
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    } finally { setSending(false); }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await dataService.addMessageReaction(messageId, emoji);
      toast({ title: 'Reaction', description: emoji });
    } catch (err: any) {
      if (err?.message === 'Reaction removed') toast({ title: 'Reaction removed' });
      else { console.error('Reaction error:', err); toast({ title: 'Error', description: 'Failed to add reaction', variant: 'destructive' }); }
    }
  };

  const filteredFriends = friends.filter(f => f.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <Layout>
      <div className="flex h-full min-h-[80vh] bg-white dark:bg-gray-900 shadow-inner rounded-lg overflow-hidden">
        {/* Left pane: contacts */}
        <div className="w-80 border-r border-green-200 dark:border-green-700 bg-white dark:bg-gray-900 p-2 flex flex-col">
          <div className="flex items-center gap-3 px-2 py-3">
            <h2 className="text-xl font-bold text-green-700 dark:text-green-300">Chats</h2>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-2 top-2" />
                <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search" className="pl-8 pr-2 w-56" />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="space-y-1">
              <ChatListItem friend={WIZAI_USER} onClick={() => setSelectedFriend(WIZAI_USER)} isPinned isWizAi />
              {filteredFriends.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">No friends</div>
              ) : (
                filteredFriends.map(friend => (
                  <ChatListItem key={friend.id} friend={friend} onClick={() => setSelectedFriend(friend)} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right pane: chat view */}
        <div className="flex-1 flex flex-col bg-[#f8fff8] dark:bg-[#07110a]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-green-200 dark:border-green-700">
            <div className="flex items-center gap-3">
              {selectedFriend ? (
                <Avatar className="w-10 h-10">
                  <AvatarImage src={selectedFriend.avatar} />
                  <AvatarFallback>{selectedFriend.name?.charAt(0)}</AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900" />
              )}
              <div>
                <div className="font-semibold text-green-800 dark:text-green-200">{selectedFriend?.name || 'Select a chat'}</div>
                <div className="text-xs text-muted-foreground">{selectedFriend ? 'Online' : 'No chat selected'}</div>
              </div>
            </div>

            <div className="relative">
              <Button variant="ghost" size="icon" onClick={() => setShowHeaderMenu(prev => !prev)} className="text-foreground">
                <MoreVertical className="w-5 h-5" />
              </Button>
              {showHeaderMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-border rounded-lg shadow-lg z-50">
                  <div className="p-2">
                    <button className="w-full text-left p-2 rounded hover:bg-accent" onClick={() => { setDisappearingMessages(prev => !prev); toast({ title: disappearingMessages ? 'Disabled' : 'Enabled', description: 'Disappearing messages toggled' }); setShowHeaderMenu(false); }}>
                      {disappearingMessages ? 'Turn off disappearing messages' : 'Turn on disappearing messages'}
                    </button>
                    <button className="w-full text-left p-2 rounded hover:bg-accent" onClick={() => { if (!chatId) return; supabase.from('messages').delete().eq('chat_id', chatId).then(() => { setMessages([]); toast({ title: 'Cleared', description: 'Chat cleared' }); }); setShowHeaderMenu(false); }}>Clear chat</button>
                    <button className="w-full text-left p-2 rounded hover:bg-accent" onClick={() => { toast({ title: 'Report', description: 'Reported user' }); setShowHeaderMenu(false); }}>Report</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="text-center text-muted-foreground">Loading messages...</div>
            ) : selectedFriend && selectedFriend.id === 'wizai' ? (
              <WizAiChat onClose={() => setSelectedFriend(null)} />
            ) : (
              <div className="space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} id={`message-${msg.id}`}>
                    <MessageItem
                      message={msg}
                      onEdit={(id, newContent) => setMessages(prev => prev.map(m => m.id === id ? { ...m, content: newContent } : m))}
                      onDelete={(id) => setMessages(prev => prev.filter(m => m.id !== id))}
                      onLongPress={() => {}}
                      onSwipeReply={(m) => setReplyingTo(m)}
                      onSelect={() => {}}
                      onReaction={handleReaction}
                    />
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Reply preview */}
          {replyingTo && (
            <div className="p-2 border-t border-green-200 dark:border-green-700 bg-white/50 dark:bg-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-foreground">Replying to {replyingTo.user?.name}</div>
                <div className="text-xs text-muted-foreground truncate max-w-xs">{replyingTo.content || 'Media'}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setReplyingTo(null)}><ArrowLeft className="w-4 h-4" /></Button>
            </div>
          )}

          {/* Input area */}
          <div className="p-3 border-t border-green-200 dark:border-green-700 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <input type="file" id="chat-file" className="hidden" />
              <Button variant="ghost" size="icon" onClick={() => document.getElementById('chat-file')?.click()}><Paperclip className="w-5 h-5" /></Button>
              <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder={selectedFriend ? 'Type a message' : 'Select a chat to begin'} onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }} className="flex-1" />
              <Button onClick={handleSend} disabled={!newMessage.trim() || !selectedFriend} className="bg-green-600 hover:bg-green-700 text-white">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

