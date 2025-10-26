// src/components/TopicRooms.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function TopicRooms() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        // ✅ FIXED: proper destructuring
        const { data } = await supabase.auth.getUser();
        const user = data?.user;

        if (!user) {
          navigate("/login");
          return;
        }

        setCurrentUser(user);
        await loadRooms();
      } catch (err) {
        console.error("Error loading user:", err);
      }
    };

    init();
  }, []);

  const loadRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("topic_rooms")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRooms(data || []);
    } catch (err) {
      console.error("Error loading rooms:", err);
      toast({ title: "Failed to load rooms", variant: "destructive" });
    }
  };

  const handleEnterRoom = (roomId: string) => {
    navigate(`/topic/${roomId}`);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Topic Rooms</h1>

      {rooms.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No topic rooms available.
        </p>
      ) : (
        <div className="space-y-4">
          {rooms.map((room) => (
            <Card key={room.id}>
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-semibold">{room.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Created on {new Date(room.created_at).toLocaleString()}
                  </p>
                </div>
                <Button
                  onClick={() => handleEnterRoom(room.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Enter
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
