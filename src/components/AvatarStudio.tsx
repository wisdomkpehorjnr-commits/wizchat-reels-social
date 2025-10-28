import React, { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function AvatarStudio() {
  const [selectedPart, setSelectedPart] = useState("face");
  const [avatar, setAvatar] = useState({
    skin: "#f5cba7",
    hair: "#2c1a0e",
    outfit: "#4ade80",
  });

  const handleChange = (part: string, value: string) => {
    setAvatar((prev) => ({ ...prev, [part]: value }));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-green-50 p-4">
      {/* Header */}
      <div className="flex justify-between items-center w-full max-w-4xl mb-2">
        <h1 className="text-2xl font-semibold text-green-700">Customize Avatar</h1>
        <div className="flex gap-2">
          <Button
            className="bg-gray-300 text-black hover:bg-gray-400"
            onClick={() => window.history.back()}
          >
            Cancel
          </Button>
          <Button className="bg-green-600 text-white hover:bg-green-700">
            Save
          </Button>
        </div>
      </div>

      {/* Avatar Preview */}
      <Card className="relative w-full max-w-4xl flex flex-col items-center bg-white shadow-lg rounded-2xl p-4">
        <div className="w-full h-[400px] flex items-center justify-center">
          <Canvas camera={{ position: [0, 0, 5] }}>
            <ambientLight intensity={1.2} />
            <directionalLight position={[3, 3, 5]} />
            <mesh>
              <sphereGeometry args={[1.2, 32, 32]} />
              <meshStandardMaterial color={avatar.skin} />
            </mesh>
            <mesh position={[0, 1.8, 0]}>
              <coneGeometry args={[0.8, 1, 32]} />
              <meshStandardMaterial color={avatar.hair} />
            </mesh>
            <mesh position={[0, -1.5, 0]}>
              <boxGeometry args={[2, 1.2, 1]} />
              <meshStandardMaterial color={avatar.outfit} />
            </mesh>
            <OrbitControls />
          </Canvas>
        </div>

        {/* Customization Tabs */}
        <div className="flex justify-center gap-6 mt-4 border-t border-green-200 pt-4">
          {["face", "hair", "outfit"].map((part) => (
            <motion.button
              key={part}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedPart(part)}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                selectedPart === part
                  ? "bg-green-600 text-white"
                  : "bg-green-100 text-green-700 hover:bg-green-200"
              }`}
            >
              {part.charAt(0).toUpperCase() + part.slice(1)}
            </motion.button>
          ))}
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-6 gap-3 mt-6">
          {selectedPart === "face" &&
            ["#f5cba7", "#e0ac69", "#8d5524", "#ffdbac"].map((color) => (
              <div
                key={color}
                onClick={() => handleChange("skin", color)}
                className={`w-10 h-10 rounded-full cursor-pointer border-2 ${
                  avatar.skin === color ? "border-green-600" : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
              ></div>
            ))}

          {selectedPart === "hair" &&
            ["#2c1a0e", "#8b4513", "#000", "#d2b48c"].map((color) => (
              <div
                key={color}
                onClick={() => handleChange("hair", color)}
                className={`w-10 h-10 rounded-full cursor-pointer border-2 ${
                  avatar.hair === color ? "border-green-600" : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
              ></div>
            ))}

          {selectedPart === "outfit" &&
            ["#4ade80", "#2563eb", "#f43f5e", "#facc15"].map((color) => (
              <div
                key={color}
                onClick={() => handleChange("outfit", color)}
                className={`w-10 h-10 rounded-full cursor-pointer border-2 ${
                  avatar.outfit === color ? "border-green-600" : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
              ></div>
            ))}
        </div>
      </Card>

      {/* Footer */}
      <p className="text-gray-500 mt-6 mb-2 text-sm">Inspired by Snapchat’s avatar design 💚</p>
    </div>
  );
}
