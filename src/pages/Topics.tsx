import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Users, Flame } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTabCache } from "@/hooks/useTabCache";
import { TopicRoomSkeleton, ListSkeleton } from "@/components/SkeletonLoaders";
import { SmartLoading } from "@/components/SmartLoading";

interface TopicRoomType {
  id: string;
  name: string;
  description: string;
  participant_count?: number;
  isJoined?: boolean;
}

const Topics = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Persistent room cache (won't reload on tab revisit)
  const { cachedData: cachedRooms, cacheData: cacheRooms, cacheStatus } = useTabCache({
    tabId: 'topics-rooms',
    enabled: true,
    ttl: 30 * 60 * 1000, // 30 minutes - rooms don't change often
    onStatusChange: (status) => {
      console.debug(`[Topics] Cache status: ${status}`);
    },
  });

  const [rooms, setRooms] = useState<TopicRoomType[]>(cachedRooms || []);
  const [loading, setLoading] = useState(!cachedRooms);
  const [error, setError] = useState<Error | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadRooms();
      
      // Subscribe to room_participants changes for real-time updates
      const channel = supabase
        .channel('room_participants_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'room_participants'
        }, () => {
          // Reload participant counts when someone joins/leaves
          loadRooms();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      loadRooms();
    }
  }, [user?.id]);

  const loadRooms = async () => {
    try {
      setError(null);
      const { data, error } = await supabase.from("topic_rooms").select("*");
      if (error) {
        console.error("Error fetching rooms:", error);
        throw error;
      } else {
        // Fetch participant counts and check if user has joined
        const roomsWithCounts = await Promise.all(
          (data || []).map(async (room) => {
            const { count } = await supabase
              .from('room_participants')
              .select('*', { count: 'exact', head: true })
              .eq('room_id', room.id);

            let isJoined = false;
            if (user?.id) {
              const { data: participant } = await supabase
                .from('room_participants')
                .select('id')
                .eq('room_id', room.id)
                .eq('user_id', user.id)
                .single();
              isJoined = !!participant;
            }

            return {
              ...room,
              participant_count: count || 0,
              isJoined
            };
          })
        );
        setRooms(roomsWithCounts);
        await cacheRooms(roomsWithCounts); // Persist in cache
      }
      setDataLoaded(true);
    } catch (err) {
      console.error('Error loading rooms:', err);
      const error = err instanceof Error ? err : new Error('Failed to load rooms');
      setError(error);
      toast({
        title: "Error",
        description: "Failed to load topic rooms",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to join topic rooms",
        variant: "destructive"
      });
      return;
    }

    setJoiningRoomId(roomId);
    try {
      const { error } = await supabase
        .from('room_participants')
        .upsert({
          room_id: roomId,
          user_id: user.id,
          joined_at: new Date().toISOString()
        }, {
          onConflict: 'room_id,user_id'
        });

      if (error) throw error;

      // Update local state
      setRooms(prev => prev.map(room => 
        room.id === roomId 
          ? { 
              ...room, 
              isJoined: true, 
              participant_count: (room.participant_count || 0) + 1 
            }
          : room
      ));

      toast({
        title: "Success! 🎉",
        description: "You've successfully joined the topic room!"
      });

      // Navigate to room after a brief delay
      setTimeout(() => {
        navigate(`/topic-room/${roomId}`);
      }, 500);
    } catch (error: any) {
      console.error('Error joining room:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to join room. Please try again.",
        variant: "destructive"
      });
    } finally {
      setJoiningRoomId(null);
    }
  };

  const handleOpenRoom = (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/topic-room/${roomId}`);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Topic Rooms Header Card */}
          <Card className="border-2 border-green-500 bg-white dark:bg-gray-800 shadow-lg">
            <CardHeader className="p-6">
              <CardTitle className="text-4xl font-extrabold text-gray-900 dark:text-white">
                Topic Rooms
              </CardTitle>
              <p className="text-gray-600 dark:text-gray-300 mt-2 text-lg">
                Join discussions on topics you're interested in
              </p>
            </CardHeader>
          </Card>

          {/* Hot Topic Rooms Section */}
          <Card className="border-2 border-green-500 bg-white dark:bg-gray-800 shadow-lg">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Flame className="w-6 h-6 text-orange-500" />
                Hot Topic Rooms
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-3">
              {loading ? (
                <div className="py-4">
                  <ListSkeleton itemType="topic" count={4} />
                </div>
              ) : rooms.length === 0 && dataLoaded ? (
                <p className="text-center text-gray-600 dark:text-gray-300 py-8">
                  No topic rooms yet.
                </p>
              ) : (
                rooms.map((room) => (
                  <Card
                    key={room.id}
                    className="border border-green-500 hover:border-green-600 cursor-pointer bg-white dark:bg-gray-700 transition-all shadow-sm"
                    onClick={() => room.isJoined ? navigate(`/topic-room/${room.id}`) : undefined}
                  >
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Chat Icon */}
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                            <MessageCircle className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        
                        {/* Topic Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-gray-900 dark:text-white font-semibold text-base mb-1 truncate">
                            {room.name}
                          </h3>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                              <Users className="w-4 h-4" />
                              <span>{room.participant_count || 0}</span>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-1 flex-1">
                              {room.description || "Join the discussion"}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Join/Open Button */}
                      <div className="flex-shrink-0">
                        {room.isJoined ? (
                          <Button
                            className="bg-green-600 hover:bg-green-700 text-white px-6 h-9"
                            onClick={(e) => handleOpenRoom(room.id, e)}
                          >
                            Open
                          </Button>
                        ) : (
                          <Button
                            className="bg-green-600 hover:bg-green-700 text-white px-6 h-9"
                            onClick={(e) => handleJoinRoom(room.id, e)}
                            disabled={joiningRoomId === room.id}
                          >
                            {joiningRoomId === room.id ? 'Joining...' : 'Join'}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Topics;
