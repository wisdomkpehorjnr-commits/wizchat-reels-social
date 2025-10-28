import React, { useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

function AvatarModel({ skin, hair, outfit, eyes, lips }: any) {
  // Load your custom full-body model
  const { scene } = useGLTF("/models/Asian Boy.glb");

  scene.traverse((child: any) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      const name = child.name.toLowerCase();
      if (name.includes("hair")) {
        child.material.color.set(hair);
      } else if (name.includes("shirt") || name.includes("cloth") || name.includes("outfit")) {
        child.material.color.set(outfit);
      } else if (name.includes("skin") || name.includes("face")) {
        child.material.color.set(skin);
      } else if (name.includes("eye")) {
        child.material.color.set(eyes);
      } else if (name.includes("lip") || name.includes("mouth")) {
        child.material.color.set(lips);
      }
    }
  });

  return <primitive object={scene} scale={2.4} position={[0, -1.5, 0]} />;
}

function Loader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
    </div>
  );
}

export default function AvatarStudio() {
  const [selectedPart, setSelectedPart] = useState("skin");
  const [avatar, setAvatar] = useState({
    skin: "#f5cba7",
    hair: "#2c1a0e",
    outfit: "#4ade80",
    eyes: "#000000",
    lips: "#e57373",
  });

  const navigate = useNavigate();

  const handleChange = (part: string, value: string) => {
    setAvatar((prev) => ({ ...prev, [part]: value }));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-gradient-to-b from-green-50 to-white p-4">
      {/* Header */}
      <div className="flex justify-between items-center w-full max-w-5xl mb-3">
        <h1 className="text-2xl font-semibold text-green-700">
          Avatar Customization
        </h1>
        <div className="flex gap-2">
          <Button
            className="bg-green-500 hover:bg-green-600 text-white"
            onClick={() => navigate(-1)}
          >
            Exit
          </Button>
          <Button className="bg-green-700 text-white hover:bg-green-800">
            Save
          </Button>
        </div>
      </div>

      {/* Avatar 3D Preview */}
      <Card className="relative w-full max-w-5xl flex flex-col items-center bg-white shadow-xl rounded-2xl p-4">
        <div className="w-full h-[480px] flex items-center justify-center">
          <Canvas camera={{ position: [0, 1.4, 3.6], fov: 45 }}>
            <ambientLight intensity={1.2} />
            <directionalLight position={[5, 5, 5]} intensity={1.4} castShadow />
            <Suspense fallback={<Loader />}>
              <AvatarModel {...avatar} />
              <Environment preset="sunset" />
            </Suspense>
            <OrbitControls enableZoom={true} />
          </Canvas>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-3 mt-6 border-t border-green-200 pt-4 flex-wrap">
          {["skin", "hair", "outfit", "eyes", "lips"].map((part) => (
            <motion.button
              key={part}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedPart(part)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                selectedPart === part
                  ? "bg-green-600 text-white"
                  : "bg-green-100 text-green-700 hover:bg-green-200"
              }`}
            >
              {part.charAt(0).toUpperCase() + part.slice(1)}
            </motion.button>
          ))}
        </div>

        {/* Customization Options */}
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-3 mt-6 mb-3">
          {selectedPart === "skin" &&
            ["#f5cba7", "#e0ac69", "#8d5524", "#ffdbac", "#d19a66"].map((color) => (
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
            ["#2c1a0e", "#8b4513", "#000", "#d2b48c", "#704214", "#444"].map((color) => (
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
            ["#4ade80", "#2563eb", "#f43f5e", "#facc15", "#9333ea", "#0ea5e9"].map((color) => (
              <div
                key={color}
                onClick={() => handleChange("outfit", color)}
                className={`w-10 h-10 rounded-full cursor-pointer border-2 ${
                  avatar.outfit === color ? "border-green-600" : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
              ></div>
            ))}

          {selectedPart === "eyes" &&
            ["#000", "#3b82f6", "#22d3ee", "#7c3aed", "#65a30d"].map((color) => (
              <div
                key={color}
                onClick={() => handleChange("eyes", color)}
                className={`w-10 h-10 rounded-full cursor-pointer border-2 ${
                  avatar.eyes === color ? "border-green-600" : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
              ></div>
            ))}

          {selectedPart === "lips" &&
            ["#f87171", "#db2777", "#fb7185", "#fda4af", "#e57373"].map((color) => (
              <div
                key={color}
                onClick={() => handleChange("lips", color)}
                className={`w-10 h-10 rounded-full cursor-pointer border-2 ${
                  avatar.lips === color ? "border-green-600" : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
              ></div>
            ))}
        </div>
      </Card>
    </div>
  );
}

useGLTF.preload("/models/Asian Boy.glb");
