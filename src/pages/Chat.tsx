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
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import ChatPopup from '@/components/ChatPopup';
import WizAiChat from '@/components/WizAiChat';
import ChatListItem from '@/components/ChatListItem';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MessageCircle, Bot } from 'lucide-react';
import { Friend, User } from '@/types';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCache } from '@/hooks/useCache';
import { supabase } from '@/integrations/supabase/client';

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

const Chat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { cachedData: cachedFriends, setCache: setCachedFriends, isStale } = useCache<Friend[]>({ 
    key: 'chat-friends-list',
    ttl: 2 * 60 * 1000 // 2 minutes cache
  });
  
  const [friends, setFriends] = useState<Friend[]>(cachedFriends || []);
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(!cachedFriends);
  const [pinnedFriends, setPinnedFriends] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      loadData();
    }
    
    // Listen for custom event to open chat with a specific user
    const handleOpenChatWithUser = async (event: CustomEvent) => {
      const { userId, chatId } = event.detail;
      
      if (!userId) return;
      
      try {
        // Fetch user profile
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (error || !profile) {
          toast({
            title: "Error",
            description: "User not found",
            variant: "destructive"
          });
          return;
        }
        
        const chatUser: User = {
          id: profile.id,
          name: profile.name,
          username: profile.username,
          email: profile.email,
          avatar: profile.avatar,
          photoURL: profile.avatar,
          bio: profile.bio,
          followerCount: profile.follower_count || 0,
          followingCount: profile.following_count || 0,
          profileViews: profile.profile_views || 0,
          createdAt: new Date(profile.created_at)
        };
        
        setSelectedFriend(chatUser);
      } catch (error) {
        console.error('Error opening chat with user:', error);
        toast({
          title: "Error",
          description: "Failed to open chat",
          variant: "destructive"
        });
      }
    };
    
    window.addEventListener('openChatWithUser', handleOpenChatWithUser as EventListener);
    
    return () => {
      window.removeEventListener('openChatWithUser', handleOpenChatWithUser as EventListener);
    };
  }, [user, toast]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      // Show cached data immediately if available
      if (!isStale && cachedFriends) {
        setFriends(cachedFriends);
        setLoading(false);
      } else {
        setLoading(true);
      }
      
      const userFriends = await dataService.getFriends();
      setFriends(userFriends);
      setCachedFriends(userFriends); // Update cache
    } catch (error) {
      console.error('Error loading friends:', error);
      toast({
        title: "Error",
        description: "Failed to load friends",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const openChat = (friend: User) => {
    setSelectedFriend(friend);
  };

  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  
  // Get friend user data
  const friendsData = acceptedFriends.map(friend => 
    friend.requester.id === user?.id ? friend.addressee : friend.requester
  );

  const filteredFriends = friendsData.filter(friend =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort friends: pinned first, then alphabetically
  const sortedFriends = [...filteredFriends].sort((a, b) => {
    const aIsPinned = pinnedFriends.has(a.id);
    const bIsPinned = pinnedFriends.has(b.id);
    
    if (aIsPinned && !bIsPinned) return -1;
    if (!aIsPinned && bIsPinned) return 1;
    return a.name.localeCompare(b.name);
  });

  const handlePinToggle = (friendId: string) => {
    setPinnedFriends(prev => {
      const newSet = new Set(prev);
      if (newSet.has(friendId)) {
        newSet.delete(friendId);
      } else {
        newSet.add(friendId);
      }
      return newSet;
    });
  };

  if (selectedFriend) {
    if (selectedFriend.id === 'wizai') {
      return <WizAiChat onClose={() => setSelectedFriend(null)} />;
    }
    
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        <ChatPopup 
          user={selectedFriend} 
          onClose={() => setSelectedFriend(null)} 
        />
      </div>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-2 green-border mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-foreground">Chat</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search friends..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-foreground border-2 green-border"
                />
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <Card className="border-2 green-border">
              <CardContent className="p-4">
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="w-32 h-4" />
                        <Skeleton className="w-48 h-3" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 green-border">
              <CardContent className="p-0">
                <div>
                  {/* WizAi Chat - Always Pinned */}
                  <ChatListItem
                    friend={WIZAI_USER}
                    onClick={() => openChat(WIZAI_USER)}
                    isPinned
                    isWizAi
                  />
                  
                  {/* Friends list for chatting */}
                  {sortedFriends.map((friend) => (
                    <ChatListItem
                      key={friend.id}
                      friend={friend}
                      onClick={() => openChat(friend)}
                      isPinned={pinnedFriends.has(friend.id)}
                      onPinToggle={() => handlePinToggle(friend.id)}
                    />
                  ))}
                  
                  {filteredFriends.length === 0 && (
                    <div className="p-8 text-center">
                      <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {searchTerm ? 'No friends found' : 'No friends to chat with'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Add friends to start conversations
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Chat;
