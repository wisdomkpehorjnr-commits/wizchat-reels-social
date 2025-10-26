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
          {/* Heading Card */}
          <Card className="bg-green-600 mb-6">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-white">
                Topic Rooms
              </CardTitle>
              <p className="text-white font-semibold mt-2">
                Join discussions on topics you're interested in
              </p>
            </CardHeader>
          </Card>

          {/* Topic Room Cards */}
          <div className="grid gap-3">
            {rooms.length === 0 && (
              <p className="text-center text-white py-8">
                No topic rooms yet.
              </p>
            )}

            {rooms.map((room) => (
              <Card
                key={room.id}
                className="bg-green-700 hover:bg-green-800 cursor-pointer p-3"
                onClick={() => navigate(`/topic-room/${room.id}`)}
              >
                <CardContent className="p-2">
                  <h3 className="text-white font-bold text-lg">{room.name}</h3>
                  <p className="text-white text-sm mt-1">{room.description}</p>
                  <Button
                    className="mt-2 bg-white text-green-700 hover:bg-green-100"
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
