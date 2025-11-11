import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Users, Flame } from "lucide-react";

interface TopicRoomType {
  id: string;
  name: string;
  description: string;
  participant_count?: number;
}

const Topics = () => {
  const [rooms, setRooms] = useState<TopicRoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadRooms = async () => {
      try {
        const { data, error } = await supabase.from("topic_rooms").select("*");
        if (error) {
          console.error("Error fetching rooms:", error);
        } else {
          // Fetch participant counts for each room
          const roomsWithCounts = await Promise.all(
            (data || []).map(async (room) => {
              const { count } = await supabase
                .from('room_participants')
                .select('*', { count: 'exact', head: true })
                .eq('room_id', room.id);
              return {
                ...room,
                participant_count: count || 0
              };
            })
          );
          setRooms(roomsWithCounts);
        }
        setDataLoaded(true);
      } finally {
        setLoading(false);
      }
    };
    loadRooms();
  }, []);

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
                <div className="flex justify-center items-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
                    <p className="text-gray-600 dark:text-gray-300 font-medium">Loading...</p>
                  </div>
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
                    onClick={() => navigate(`/topic-room/${room.id}`)}
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
                      
                      {/* Join Button */}
                      <div className="flex-shrink-0">
                        <Button
                          className="bg-green-600 hover:bg-green-700 text-white px-6 h-9"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/topic-room/${room.id}`);
                          }}
                        >
                          Join
                        </Button>
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
