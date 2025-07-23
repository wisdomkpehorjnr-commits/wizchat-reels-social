
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { dataService } from '@/services/dataService';
import { ProfileService } from '@/services/profileService';
import { VoiceService } from '@/services/voiceService';
import { Chat as ChatType, User, VoiceCall } from '@/types';
import { MessageCircle, Plus, Search, Phone, PhoneCall, PhoneOff, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Chat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [chats, setChats] = useState<ChatType[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [incomingCall, setIncomingCall] = useState<VoiceCall | null>(null);
  const [activeCall, setActiveCall] = useState<VoiceCall | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch chats and friends
        const [chatsData, friendsData] = await Promise.all([
          dataService.getChats(),
          getFriendsList()
        ]);
        
        setChats(chatsData);
        setFriends(friendsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load chats",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
      setupRealTimeSubscriptions();
    }
  }, [user, toast]);

  const getFriendsList = async (): Promise<User[]> => {
    try {
      const friendsList = await ProfileService.getFollowing(user?.id || '');
      return friendsList.map(f => f.following);
    } catch (error) {
      console.error('Error fetching friends:', error);
      return [];
    }
  };

  const setupRealTimeSubscriptions = () => {
    if (!user) return;

    // Subscribe to voice calls
    const callsChannel = supabase
      .channel('voice-calls')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'voice_calls',
        filter: `receiver_id=eq.${user.id}`
      }, (payload) => {
        handleIncomingCall(payload.new as any);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'voice_calls'
      }, (payload) => {
        handleCallUpdate(payload.new as any);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(callsChannel);
    };
  };

  const handleIncomingCall = async (callData: any) => {
    try {
      // Fetch caller details
      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', callData.caller_id)
        .single();

      if (callerProfile) {
        const call: VoiceCall = {
          id: callData.id,
          callerId: callData.caller_id,
          receiverId: callData.receiver_id,
          caller: {
            id: callerProfile.id,
            name: callerProfile.name,
            username: callerProfile.username,
            email: callerProfile.email,
            photoURL: callerProfile.avatar || '',
            avatar: callerProfile.avatar || '',
            bio: callerProfile.bio,
            followerCount: callerProfile.follower_count,
            followingCount: callerProfile.following_count,
            profileViews: callerProfile.profile_views,
            createdAt: new Date(callerProfile.created_at)
          },
          receiver: user!,
          status: callData.status,
          startedAt: new Date(callData.started_at),
          duration: callData.duration
        };

        setIncomingCall(call);
      }
    } catch (error) {
      console.error('Error handling incoming call:', error);
    }
  };

  const handleCallUpdate = (callData: any) => {
    if (callData.status === 'ended') {
      setActiveCall(null);
      setIncomingCall(null);
    }
  };

  const startVoiceCall = async (friendId: string) => {
    try {
      const callId = await VoiceService.initializeCall(friendId);
      await VoiceService.startCall(callId);
      await VoiceService.createOffer(callId);

      const friend = friends.find(f => f.id === friendId);
      if (friend) {
        setActiveCall({
          id: callId,
          callerId: user!.id,
          receiverId: friendId,
          caller: user!,
          receiver: friend,
          status: 'calling',
          startedAt: new Date(),
          duration: 0
        });
      }

      toast({
        title: "Calling...",
        description: `Calling ${friend?.name}`,
      });
    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: "Error",
        description: "Failed to start call",
        variant: "destructive",
      });
    }
  };

  const answerCall = async () => {
    if (!incomingCall) return;

    try {
      await VoiceService.answerCall(incomingCall.id);
      setActiveCall(incomingCall);
      setIncomingCall(null);

      toast({
        title: "Call Connected",
        description: `Connected with ${incomingCall.caller.name}`,
      });
    } catch (error) {
      console.error('Error answering call:', error);
      toast({
        title: "Error",
        description: "Failed to answer call",
        variant: "destructive",
      });
    }
  };

  const rejectCall = async () => {
    if (!incomingCall) return;

    try {
      await VoiceService.rejectCall(incomingCall.id);
      setIncomingCall(null);
    } catch (error) {
      console.error('Error rejecting call:', error);
    }
  };

  const endCall = async () => {
    if (!activeCall) return;

    try {
      await VoiceService.endCall(activeCall.id);
      setActiveCall(null);

      toast({
        title: "Call Ended",
        description: "Call has been ended",
      });
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const createNewChat = async () => {
    if (selectedFriends.length === 0) return;

    try {
      const chatData = {
        participants: [user!.id, ...selectedFriends],
        isGroup: selectedFriends.length > 1,
        name: selectedFriends.length > 1 ? 'Group Chat' : undefined
      };

      // Create chat logic would go here
      console.log('Creating chat:', chatData);
      
      setShowNewChatDialog(false);
      setSelectedFriends([]);
      
      toast({
        title: "Chat Created",
        description: "New chat has been created",
      });
    } catch (error) {
      console.error('Error creating chat:', error);
      toast({
        title: "Error",
        description: "Failed to create chat",
        variant: "destructive",
      });
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Messages</h1>
          <Button onClick={() => setShowNewChatDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Friends List */}
        <Card className="backdrop-blur-md bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Friends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {friends.slice(0, 12).map((friend) => (
                <div key={friend.id} className="text-center space-y-2">
                  <div className="relative">
                    <Avatar className="w-16 h-16 mx-auto">
                      <AvatarImage src={friend.avatar} />
                      <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <Button
                      size="sm"
                      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full p-0"
                      onClick={() => startVoiceCall(friend.id)}
                    >
                      <Phone className="w-3 h-3" />
                    </Button>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white truncate">{friend.name}</p>
                    <p className="text-xs text-white/60">@{friend.username}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat List */}
        <Card className="backdrop-blur-md bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Recent Chats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {chats.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <p className="text-white/60">No chats yet</p>
                <p className="text-white/40 text-sm">Start a conversation with your friends</p>
              </div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => navigate(`/chat/${chat.id}`)}
                >
                  <div className="relative">
                    {chat.isGroup ? (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                    ) : (
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={chat.participants[0]?.avatar} />
                        <AvatarFallback>
                          {chat.participants[0]?.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white truncate">
                        {chat.name || chat.participants[0]?.name}
                      </p>
                      <span className="text-xs text-white/60">
                        {new Date(chat.lastActivity).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-white/60 truncate">
                      {chat.lastMessage?.content || 'No messages yet'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* New Chat Dialog */}
        <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
          <DialogContent className="max-w-md backdrop-blur-md bg-white/90 dark:bg-black/90">
            <DialogHeader>
              <DialogTitle>New Chat</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <Input
                placeholder="Search friends..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />

              <div className="max-h-60 overflow-y-auto space-y-2">
                {filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => {
                      const isSelected = selectedFriends.includes(friend.id);
                      setSelectedFriends(prev =>
                        isSelected
                          ? prev.filter(id => id !== friend.id)
                          : [...prev, friend.id]
                      );
                    }}
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={friend.avatar} />
                      <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{friend.name}</p>
                      <p className="text-sm text-muted-foreground">@{friend.username}</p>
                    </div>
                    {selectedFriends.includes(friend.id) && (
                      <Badge variant="default">Selected</Badge>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowNewChatDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createNewChat} disabled={selectedFriends.length === 0}>
                  Create Chat
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Incoming Call Dialog */}
        {incomingCall && (
          <Dialog open={true} onOpenChange={() => {}}>
            <DialogContent className="max-w-sm backdrop-blur-md bg-white/90 dark:bg-black/90">
              <div className="text-center space-y-4">
                <Avatar className="w-24 h-24 mx-auto">
                  <AvatarImage src={incomingCall.caller.avatar} />
                  <AvatarFallback>{incomingCall.caller.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{incomingCall.caller.name}</h3>
                  <p className="text-muted-foreground">Incoming voice call...</p>
                </div>
                <div className="flex space-x-4 justify-center">
                  <Button variant="destructive" onClick={rejectCall}>
                    <PhoneOff className="w-4 h-4" />
                  </Button>
                  <Button onClick={answerCall}>
                    <PhoneCall className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Active Call Dialog */}
        {activeCall && (
          <Dialog open={true} onOpenChange={() => {}}>
            <DialogContent className="max-w-sm backdrop-blur-md bg-white/90 dark:bg-black/90">
              <div className="text-center space-y-4">
                <Avatar className="w-24 h-24 mx-auto">
                  <AvatarImage src={activeCall.receiver.avatar} />
                  <AvatarFallback>{activeCall.receiver.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{activeCall.receiver.name}</h3>
                  <p className="text-muted-foreground">
                    {activeCall.status === 'calling' ? 'Calling...' : 'Connected'}
                  </p>
                </div>
                <Button variant="destructive" onClick={endCall}>
                  <PhoneOff className="w-4 h-4 mr-2" />
                  End Call
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  );
};

export default Chat;
