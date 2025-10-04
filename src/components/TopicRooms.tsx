
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Users, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { TopicRoom } from '@/types';
import { useToast } from '@/hooks/use-toast';

const TopicRooms: React.FC = () => {
  const [rooms, setRooms] = useState<TopicRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadRooms();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('topic-rooms-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'topic_rooms'
      }, () => {
        loadRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('topic_rooms')
        .select('*')
        .eq('is_active', true)
        .order('participant_count', { ascending: false })
        .limit(6);

      if (error) throw error;

      setRooms(data?.map(room => ({
        id: room.id,
        name: room.name,
        description: room.description,
        isActive: room.is_active,
        participantCount: room.participant_count,
        createdAt: new Date(room.created_at),
        updatedAt: new Date(room.updated_at)
      })) || []);
    } catch (error) {
      console.error('Error loading topic rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (roomId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        return;
      }

      console.log('Joining room:', roomId, 'for user:', user.id);

      // Check if already a participant
      const { data: existing, error: checkError } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking participant:', checkError);
        throw checkError;
      }

      if (!existing) {
        console.log('Adding user as participant');
        const { error } = await supabase
          .from('room_participants')
          .insert({
            room_id: roomId,
            user_id: user.id
          });

        if (error) {
          console.error('Error inserting participant:', error);
          throw error;
        }
      }

      console.log('Successfully joined room, navigating...');
      
      toast({
        title: "Topic Successfully Joined 🫵🏻😁",
        description: `You've joined ${rooms.find(r => r.id === roomId)?.name || 'the topic'}!`,
        duration: 3000,
      });
      
      // Small delay for animation before navigation
      setTimeout(() => {
        navigate(`/topic-room/${roomId}`);
      }, 800);
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: "Error",
        description: "Failed to join topic. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="border-2 green-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Flame className="w-5 h-5" />
            Hot Topic Rooms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 green-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Flame className="w-5 h-5" />
          Hot Topic Rooms
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rooms.map((room) => (
          <div
            key={room.id}
            className="flex items-center justify-between p-3 rounded-lg border border-green-500/50 hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-primary" />
                <h4 className="font-medium text-foreground">{room.name}</h4>
                <Badge variant="secondary" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  <span className="text-foreground">{room.participantCount}</span>
                </Badge>
              </div>
              {room.description && (
                <p className="text-sm text-muted-foreground truncate">
                  {room.description}
                </p>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => joinRoom(room.id)}
              className="text-foreground"
            >
              Join
            </Button>
          </div>
        ))}

        {rooms.length === 0 && (
          <p className="text-muted-foreground text-center py-4">
            No active topic rooms. Create one to get started!
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default TopicRooms;
