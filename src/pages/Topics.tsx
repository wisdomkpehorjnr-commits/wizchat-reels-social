import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface TopicRoomType {
  id: string;
  name: string;
  description: string;
}

const Topics = () => {
  const [rooms, setRooms] = useState<TopicRoomType[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadRooms = async () => {
      const { data, error } = await supabase.from("topic_rooms").select("*");
      if (error) {
        console.error("Error fetching rooms:", error);
        return;
      }
      setRooms(data || []);
    };
    loadRooms();
  }, []);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">

          {/* Main Heading Card - Bigger and Highlighted */}
          <Card className="border-2 border-green-500 mb-6 bg-green-600 dark:bg-green-900">
            <CardHeader className="p-6">
              <CardTitle className="text-4xl font-extrabold text-white">
                Topic Rooms
              </CardTitle>
              <p className="text-white mt-2 text-lg">
                Join discussions on topics you're interested in
              </p>
            </CardHeader>
          </Card>

          {/* Topic Room Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rooms.length === 0 && (
              <p className="text-center text-gray-800 dark:text-gray-300 py-8 col-span-full">
                No topic rooms yet.
              </p>
            )}

            {rooms.map((room) => (
              <Card
                key={room.id}
                className="border-2 border-green-500 hover:border-green-700 cursor-pointer bg-white dark:bg-gray-800 transition-all"
                onClick={() => navigate(`/topic-room/${room.id}`)}
              >
                <CardContent className="py-4 px-4">
                  <h3 className="text-black dark:text-white font-semibold text-base">
                    {room.name}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 text-xs mt-1 line-clamp-2">
                    {room.description}
                  </p>
                  <Button
                    className="mt-3 bg-green-600 hover:bg-green-700 text-white dark:text-white text-sm h-9"
                  >
                    Enter Room
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

        </div>
      </div>
    </Layout>
  );
};

export default Topics;
