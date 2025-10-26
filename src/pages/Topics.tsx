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
          <Card className="border-2 border-green-500 mb-6">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-green-800">
                Topic Rooms
              </CardTitle>
              <p className="text-green-700">
                Join discussions on topics you're interested in
              </p>
            </CardHeader>
          </Card>

          <div className="grid gap-4">
            {rooms.length === 0 && (
              <p className="text-center text-green-700 py-8">No topic rooms yet.</p>
            )}

            {rooms.map((room) => (
              <Card
                key={room.id}
                className="border-2 border-green-500 hover:border-green-700 cursor-pointer"
                onClick={() => navigate(`/topic-room/${room.id}`)}
              >
                <CardContent>
                  <h3 className="text-green-800 font-semibold text-lg">{room.name}</h3>
                  <p className="text-green-700">{room.description}</p>
                  <Button className="mt-2 bg-green-600 text-white hover:bg-green-700">
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
