import React, { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";
import * as THREE from "three";

// Enhanced Avatar Data Interface
export interface EnhancedAvatarData {
  // Head & Face
  skinColor: string;
  headSize: number;
  
  // Facial Features
  eyeColor: string;
  eyeSize: number;
  eyeSpacing: number;
  eyebrowColor: string;
  eyebrowThickness: number;
  
  noseSize: number;
  noseWidth: number;
  
  mouthSize: number;
  mouthWidth: number;
  lipColor: string;
  
  earSize: number;
  earPosition: number;
  
  // Hair
  hairColor: string;
  hairStyle: string;
  hairLength: number;
  
  // Body
  bodyColor: string;
  bodySize: number;
  shoulderWidth: number;
  
  // Outfit
  outfitColor: string;
  outfitStyle: string;
  
  // Accessories
  accessories: string[];
}

interface AvatarStudioProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave?: (avatarData: EnhancedAvatarData) => void;
  initialAvatar?: Partial<EnhancedAvatarData>;
}

// 3D Avatar Component
const Avatar3D: React.FC<{ avatar: EnhancedAvatarData }> = ({ avatar }) => {
  return (
    <group>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-5, 5, -5]} intensity={0.4} />
      <pointLight position={[0, 3, 0]} intensity={0.3} />
      
      {/* Head */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.5 * avatar.headSize, 32, 32]} />
        <meshStandardMaterial color={avatar.skinColor} roughness={0.7} />
      </mesh>
      
      {/* Hair */}
      {avatar.hairStyle === "short" && (
        <mesh position={[0, 1.8, 0]}>
          <sphereGeometry args={[0.52 * avatar.headSize, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
          <meshStandardMaterial color={avatar.hairColor} />
        </mesh>
      )}
      {avatar.hairStyle === "medium" && (
        <group>
          <mesh position={[0, 1.8, 0]}>
            <sphereGeometry args={[0.52 * avatar.headSize, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
            <meshStandardMaterial color={avatar.hairColor} />
          </mesh>
          <mesh position={[0, 1.5, 0.3]}>
            <boxGeometry args={[0.4, 0.3 * avatar.hairLength, 0.2]} />
            <meshStandardMaterial color={avatar.hairColor} />
          </mesh>
        </group>
      )}
      {avatar.hairStyle === "long" && (
        <group>
          <mesh position={[0, 1.8, 0]}>
            <sphereGeometry args={[0.52 * avatar.headSize, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
            <meshStandardMaterial color={avatar.hairColor} />
          </mesh>
          <mesh position={[0, 1.2, 0.4]}>
            <boxGeometry args={[0.5, 0.5 * avatar.hairLength, 0.15]} />
            <meshStandardMaterial color={avatar.hairColor} />
          </mesh>
        </group>
      )}
      {avatar.hairStyle === "curly" && (
        <group>
          {[...Array(8)].map((_, i) => (
            <mesh key={i} position={[
              Math.cos(i * Math.PI / 4) * 0.3,
              1.7 + Math.sin(i * 0.5) * 0.1,
              Math.sin(i * Math.PI / 4) * 0.3
            ]}>
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshStandardMaterial color={avatar.hairColor} />
            </mesh>
          ))}
        </group>
      )}
      
      {/* Eyes */}
      <group>
        {/* Left Eye */}
        <mesh position={[-0.15 * avatar.eyeSpacing, 1.6, 0.4]}>
          <sphereGeometry args={[0.08 * avatar.eyeSize, 16, 16]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[-0.15 * avatar.eyeSpacing, 1.6, 0.42]}>
          <sphereGeometry args={[0.06 * avatar.eyeSize, 16, 16]} />
          <meshStandardMaterial color={avatar.eyeColor} />
        </mesh>
        <mesh position={[-0.15 * avatar.eyeSpacing, 1.6, 0.44]}>
          <sphereGeometry args={[0.03 * avatar.eyeSize, 16, 16]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        
        {/* Right Eye */}
        <mesh position={[0.15 * avatar.eyeSpacing, 1.6, 0.4]}>
          <sphereGeometry args={[0.08 * avatar.eyeSize, 16, 16]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.15 * avatar.eyeSpacing, 1.6, 0.42]}>
          <sphereGeometry args={[0.06 * avatar.eyeSize, 16, 16]} />
          <meshStandardMaterial color={avatar.eyeColor} />
        </mesh>
        <mesh position={[0.15 * avatar.eyeSpacing, 1.6, 0.44]}>
          <sphereGeometry args={[0.03 * avatar.eyeSize, 16, 16]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
      </group>
      
      {/* Eyebrows */}
      <mesh position={[-0.15 * avatar.eyeSpacing, 1.75, 0.38]}>
        <boxGeometry args={[0.12, 0.02 * avatar.eyebrowThickness, 0.05]} />
        <meshStandardMaterial color={avatar.eyebrowColor} />
      </mesh>
      <mesh position={[0.15 * avatar.eyeSpacing, 1.75, 0.38]}>
        <boxGeometry args={[0.12, 0.02 * avatar.eyebrowThickness, 0.05]} />
        <meshStandardMaterial color={avatar.eyebrowColor} />
      </mesh>
      
      {/* Nose */}
      <mesh position={[0, 1.5, 0.45]}>
        <coneGeometry args={[0.05 * avatar.noseWidth, 0.1 * avatar.noseSize, 8]} />
        <meshStandardMaterial color={avatar.skinColor} roughness={0.7} />
      </mesh>
      
      {/* Mouth */}
      <mesh position={[0, 1.35, 0.42]}>
        <torusGeometry args={[0.06 * avatar.mouthWidth, 0.02 * avatar.mouthSize, 8, 16, Math.PI]} />
        <meshStandardMaterial color={avatar.lipColor} />
      </mesh>
      
      {/* Ears */}
      <mesh position={[-0.5 * avatar.headSize, 1.5, 0]}>
        <sphereGeometry args={[0.08 * avatar.earSize, 16, 16]} />
        <meshStandardMaterial color={avatar.skinColor} roughness={0.7} />
      </mesh>
      <mesh position={[0.5 * avatar.headSize, 1.5, 0]}>
        <sphereGeometry args={[0.08 * avatar.earSize, 16, 16]} />
        <meshStandardMaterial color={avatar.skinColor} roughness={0.7} />
      </mesh>
      
      {/* Neck */}
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.3, 16]} />
        <meshStandardMaterial color={avatar.skinColor} roughness={0.7} />
      </mesh>
      
      {/* Torso/Body */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.8 * avatar.shoulderWidth, 1.2 * avatar.bodySize, 0.5]} />
        <meshStandardMaterial color={avatar.bodyColor} />
      </mesh>
      
      {/* Outfit */}
      {avatar.outfitStyle === "shirt" && (
        <mesh position={[0, 0.2, 0.26]}>
          <boxGeometry args={[0.85 * avatar.shoulderWidth, 1.25 * avatar.bodySize, 0.1]} />
          <meshStandardMaterial color={avatar.outfitColor} />
        </mesh>
      )}
      {avatar.outfitStyle === "jacket" && (
        <mesh position={[0, 0.2, 0.26]}>
          <boxGeometry args={[0.9 * avatar.shoulderWidth, 1.3 * avatar.bodySize, 0.12]} />
          <meshStandardMaterial color={avatar.outfitColor} />
        </mesh>
      )}
      {avatar.outfitStyle === "dress" && (
        <mesh position={[0, -0.1, 0.26]}>
          <coneGeometry args={[0.5 * avatar.shoulderWidth, 1.5 * avatar.bodySize, 8]} />
          <meshStandardMaterial color={avatar.outfitColor} />
        </mesh>
      )}
      
      {/* Arms */}
      <mesh position={[-0.5 * avatar.shoulderWidth, 0.2, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.8, 16]} />
        <meshStandardMaterial color={avatar.skinColor} roughness={0.7} />
      </mesh>
      <mesh position={[0.5 * avatar.shoulderWidth, 0.2, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.8, 16]} />
        <meshStandardMaterial color={avatar.skinColor} roughness={0.7} />
      </mesh>
      
      {/* Legs */}
      <mesh position={[-0.2, -0.8, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.8, 16]} />
        <meshStandardMaterial color={avatar.skinColor} roughness={0.7} />
      </mesh>
      <mesh position={[0.2, -0.8, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.8, 16]} />
        <meshStandardMaterial color={avatar.skinColor} roughness={0.7} />
      </mesh>
      
      {/* Accessories - Glasses */}
      {avatar.accessories.includes("glasses") && (
        <group>
          <mesh position={[-0.15 * avatar.eyeSpacing, 1.6, 0.38]}>
            <torusGeometry args={[0.1, 0.01, 8, 16]} />
            <meshStandardMaterial color="#333333" metalness={0.8} />
          </mesh>
          <mesh position={[0.15 * avatar.eyeSpacing, 1.6, 0.38]}>
            <torusGeometry args={[0.1, 0.01, 8, 16]} />
            <meshStandardMaterial color="#333333" metalness={0.8} />
          </mesh>
          <mesh position={[0, 1.6, 0.38]}>
            <boxGeometry args={[0.3, 0.01, 0.01]} />
            <meshStandardMaterial color="#333333" metalness={0.8} />
          </mesh>
        </group>
      )}
      
      {/* Accessories - Hat */}
      {avatar.accessories.includes("hat") && (
        <mesh position={[0, 2.0, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 0.15, 16]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      )}
    </group>
  );
};

const AvatarStudio: React.FC<AvatarStudioProps> = ({ open = true, onOpenChange, onSave, initialAvatar }) => {
  const [avatar, setAvatar] = useState<EnhancedAvatarData>({
    // Head & Face
    skinColor: "#f5cba7",
    headSize: 1.0,
    
    // Facial Features
    eyeColor: "#4a90e2",
    eyeSize: 1.0,
    eyeSpacing: 1.0,
    eyebrowColor: "#2c1a0e",
    eyebrowThickness: 1.0,
    
    noseSize: 1.0,
    noseWidth: 1.0,
    
    mouthSize: 1.0,
    mouthWidth: 1.0,
    lipColor: "#d4a574",
    
    earSize: 1.0,
    earPosition: 1.0,
    
    // Hair
    hairColor: "#2c1a0e",
    hairStyle: "short",
    hairLength: 1.0,
    
    // Body
    bodyColor: "#f5cba7",
    bodySize: 1.0,
    shoulderWidth: 1.0,
    
    // Outfit
    outfitColor: "#4ade80",
    outfitStyle: "shirt",
    
    // Accessories
    accessories: [],
  });

  useEffect(() => {
    if (initialAvatar) {
      setAvatar((prev) => ({ ...prev, ...initialAvatar }));
    }
  }, [initialAvatar]);

  const handleChange = (key: keyof EnhancedAvatarData, value: any) => {
    setAvatar((prev) => ({ ...prev, [key]: value }));
  };

  const toggleAccessory = (accessory: string) => {
    setAvatar((prev) => ({
      ...prev,
      accessories: prev.accessories.includes(accessory)
        ? prev.accessories.filter((a) => a !== accessory)
        : [...prev.accessories, accessory],
    }));
  };

  const handleSave = () => {
    if (onSave) onSave(avatar);
    if (onOpenChange) onOpenChange(false);
  };

  if (!open) return null;

  const skinColors = ["#f5cba7", "#e0ac69", "#8d5524", "#ffdbac", "#d4a574", "#c68642"];
  const hairColors = ["#2c1a0e", "#8b4513", "#000000", "#d2b48c", "#ffd700", "#ff69b4", "#4b0082"];
  const eyeColors = ["#4a90e2", "#2e7d32", "#8b4513", "#000000", "#9c27b0", "#ff5722", "#00bcd4"];
  const outfitColors = ["#4ade80", "#2563eb", "#f43f5e", "#facc15", "#8b5cf6", "#06b6d4", "#ffffff", "#000000"];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h1 className="text-2xl font-semibold text-green-700 dark:text-green-400">Customize Your Avatar</h1>
          <div className="flex gap-2">
            <Button 
              className="bg-gray-300 text-black hover:bg-gray-400 dark:bg-gray-700 dark:text-white" 
              onClick={() => onOpenChange && onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              className="bg-green-600 text-white hover:bg-green-700" 
              onClick={handleSave}
            >
              Save Avatar
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 3D Preview */}
            <Card className="relative flex flex-col items-center bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-800 dark:to-gray-900 shadow-lg rounded-2xl p-4">
              <div className="w-full h-[500px] flex items-center justify-center">
                <Canvas camera={{ position: [0, 1, 5], fov: 50 }}>
                  <PerspectiveCamera makeDefault position={[0, 1, 5]} fov={50} />
                  <Avatar3D avatar={avatar} />
                  <OrbitControls enableZoom={true} enablePan={false} minDistance={3} maxDistance={8} />
                </Canvas>
              </div>
            </Card>

            {/* Customization Panel */}
            <div className="space-y-4">
              <Tabs defaultValue="face" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="face">Face</TabsTrigger>
                  <TabsTrigger value="hair">Hair</TabsTrigger>
                  <TabsTrigger value="body">Body</TabsTrigger>
                  <TabsTrigger value="style">Style</TabsTrigger>
                </TabsList>

                {/* Face Tab */}
                <TabsContent value="face" className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Skin Color</label>
                    <div className="grid grid-cols-6 gap-2">
                      {skinColors.map((color) => (
                        <div
                          key={color}
                          onClick={() => handleChange("skinColor", color)}
                          className={`w-10 h-10 rounded-full cursor-pointer border-2 transition-all ${
                            avatar.skinColor === color
                              ? "border-green-600 scale-110"
                              : "border-transparent hover:scale-105"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Head Size: {avatar.headSize.toFixed(1)}</label>
                    <Slider
                      value={[avatar.headSize]}
                      onValueChange={(value) => handleChange("headSize", value[0])}
                      min={0.8}
                      max={1.3}
                      step={0.1}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Eye Color</label>
                    <div className="grid grid-cols-7 gap-2">
                      {eyeColors.map((color) => (
                        <div
                          key={color}
                          onClick={() => handleChange("eyeColor", color)}
                          className={`w-10 h-10 rounded-full cursor-pointer border-2 transition-all ${
                            avatar.eyeColor === color
                              ? "border-green-600 scale-110"
                              : "border-transparent hover:scale-105"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Eye Size: {avatar.eyeSize.toFixed(1)}</label>
                    <Slider
                      value={[avatar.eyeSize]}
                      onValueChange={(value) => handleChange("eyeSize", value[0])}
                      min={0.7}
                      max={1.5}
                      step={0.1}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Eye Spacing: {avatar.eyeSpacing.toFixed(1)}</label>
                    <Slider
                      value={[avatar.eyeSpacing]}
                      onValueChange={(value) => handleChange("eyeSpacing", value[0])}
                      min={0.7}
                      max={1.5}
                      step={0.1}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Eyebrow Color</label>
                    <div className="grid grid-cols-4 gap-2">
                      {hairColors.slice(0, 4).map((color) => (
                        <div
                          key={color}
                          onClick={() => handleChange("eyebrowColor", color)}
                          className={`w-10 h-10 rounded-full cursor-pointer border-2 transition-all ${
                            avatar.eyebrowColor === color
                              ? "border-green-600 scale-110"
                              : "border-transparent hover:scale-105"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Nose Size: {avatar.noseSize.toFixed(1)}</label>
                    <Slider
                      value={[avatar.noseSize]}
                      onValueChange={(value) => handleChange("noseSize", value[0])}
                      min={0.7}
                      max={1.5}
                      step={0.1}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Mouth Size: {avatar.mouthSize.toFixed(1)}</label>
                    <Slider
                      value={[avatar.mouthSize]}
                      onValueChange={(value) => handleChange("mouthSize", value[0])}
                      min={0.7}
                      max={1.5}
                      step={0.1}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Ear Size: {avatar.earSize.toFixed(1)}</label>
                    <Slider
                      value={[avatar.earSize]}
                      onValueChange={(value) => handleChange("earSize", value[0])}
                      min={0.7}
                      max={1.5}
                      step={0.1}
                    />
                  </div>
                </TabsContent>

                {/* Hair Tab */}
                <TabsContent value="hair" className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Hair Color</label>
                    <div className="grid grid-cols-7 gap-2">
                      {hairColors.map((color) => (
                        <div
                          key={color}
                          onClick={() => handleChange("hairColor", color)}
                          className={`w-10 h-10 rounded-full cursor-pointer border-2 transition-all ${
                            avatar.hairColor === color
                              ? "border-green-600 scale-110"
                              : "border-transparent hover:scale-105"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Hair Style</label>
                    <div className="grid grid-cols-4 gap-2">
                      {["short", "medium", "long", "curly"].map((style) => (
                        <motion.button
                          key={style}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleChange("hairStyle", style)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            avatar.hairStyle === style
                              ? "bg-green-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {style.charAt(0).toUpperCase() + style.slice(1)}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {avatar.hairStyle !== "short" && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Hair Length: {avatar.hairLength.toFixed(1)}</label>
                      <Slider
                        value={[avatar.hairLength]}
                        onValueChange={(value) => handleChange("hairLength", value[0])}
                        min={0.8}
                        max={1.5}
                        step={0.1}
                      />
                    </div>
                  )}
                </TabsContent>

                {/* Body Tab */}
                <TabsContent value="body" className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Body Size: {avatar.bodySize.toFixed(1)}</label>
                    <Slider
                      value={[avatar.bodySize]}
                      onValueChange={(value) => handleChange("bodySize", value[0])}
                      min={0.8}
                      max={1.3}
                      step={0.1}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Shoulder Width: {avatar.shoulderWidth.toFixed(1)}</label>
                    <Slider
                      value={[avatar.shoulderWidth]}
                      onValueChange={(value) => handleChange("shoulderWidth", value[0])}
                      min={0.8}
                      max={1.3}
                      step={0.1}
                    />
                  </div>
                </TabsContent>

                {/* Style Tab */}
                <TabsContent value="style" className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Outfit Color</label>
                    <div className="grid grid-cols-8 gap-2">
                      {outfitColors.map((color) => (
                        <div
                          key={color}
                          onClick={() => handleChange("outfitColor", color)}
                          className={`w-10 h-10 rounded-full cursor-pointer border-2 transition-all ${
                            avatar.outfitColor === color
                              ? "border-green-600 scale-110"
                              : "border-transparent hover:scale-105"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Outfit Style</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["shirt", "jacket", "dress"].map((style) => (
                        <motion.button
                          key={style}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleChange("outfitStyle", style)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            avatar.outfitStyle === style
                              ? "bg-green-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {style.charAt(0).toUpperCase() + style.slice(1)}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Accessories</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["glasses", "hat"].map((accessory) => (
                        <motion.button
                          key={accessory}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => toggleAccessory(accessory)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            avatar.accessories.includes(accessory)
                              ? "bg-green-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {accessory.charAt(0).toUpperCase() + accessory.slice(1)}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        <p className="text-gray-500 dark:text-gray-400 mt-4 text-sm text-center p-4 border-t">
          Create your unique avatar with detailed customization options! 💚
        </p>
      </div>
    </div>
  );
};

export default AvatarStudio;
