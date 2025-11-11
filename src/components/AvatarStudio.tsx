import React, { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import * as THREE from "three";

// LEGO Avatar Data Interface
export interface EnhancedAvatarData {
  // Gender
  gender: "male" | "female";
  
  // Head & Face (LEGO style - simple)
  headColor: string; // LEGO heads are typically yellow
  faceExpression: "happy" | "neutral" | "wink" | "surprised";
  
  // Hair
  hairColor: string;
  hairStyle: string;
  
  // Torso/Shirt
  shirtStyle: string;
  shirtColor: string;
  shirtPattern?: string;
  
  // Legs
  legStyle: "pants" | "shorts";
  legColor: string;
  legPattern?: string;
  
  // Accessories
  accessories: string[];
  
  // Hands (LEGO C-shaped)
  handColor: string;
}

interface AvatarStudioProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave?: (avatarData: EnhancedAvatarData) => void;
  initialAvatar?: Partial<EnhancedAvatarData>;
}

// LEGO-style clothing options
const SHIRT_STYLES = [
  { id: "basic", name: "Basic Shirt", pattern: null },
  { id: "striped", name: "Striped Shirt", pattern: "stripes" },
  { id: "polka", name: "Polka Dot", pattern: "polka" },
  { id: "heart", name: "Heart Design", pattern: "heart" },
  { id: "star", name: "Star Design", pattern: "star" },
  { id: "checkered", name: "Checkered", pattern: "checkered" },
  { id: "solid", name: "Solid Color", pattern: null },
  { id: "vneck", name: "V-Neck", pattern: null },
];

const PANTS_STYLES = [
  { id: "jeans", name: "Jeans", pattern: "denim" },
  { id: "cargo", name: "Cargo Pants", pattern: "cargo" },
  { id: "sweatpants", name: "Sweatpants", pattern: null },
  { id: "dress", name: "Dress Pants", pattern: null },
];

const SHORTS_STYLES = [
  { id: "casual", name: "Casual Shorts", pattern: null },
  { id: "athletic", name: "Athletic Shorts", pattern: "stripes" },
  { id: "cargo", name: "Cargo Shorts", pattern: "cargo" },
  { id: "denim", name: "Denim Shorts", pattern: "denim" },
];

const HAIR_STYLES = {
  male: [
    { id: "short", name: "Short" },
    { id: "spiky", name: "Spiky" },
    { id: "curly", name: "Curly" },
    { id: "slicked", name: "Slicked Back" },
    { id: "afro", name: "Afro" },
    { id: "buzz", name: "Buzz Cut" },
  ],
  female: [
    { id: "long", name: "Long Hair" },
    { id: "ponytail", name: "Ponytail" },
    { id: "bob", name: "Bob Cut" },
    { id: "curly", name: "Curly" },
    { id: "braids", name: "Braids" },
    { id: "bun", name: "Bun" },
  ],
};

// LEGO 3D Avatar Component
const LegoAvatar3D: React.FC<{ avatar: EnhancedAvatarData }> = ({ avatar }) => {
  // LEGO colors
  const legoYellow = "#FFD700";
  const legoRed = "#DC143C";
  const legoBlue = "#0066CC";
  const legoGreen = "#00AA44";
  
  return (
    <group>
      {/* Lighting */}
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <directionalLight position={[-5, 5, -5]} intensity={0.5} />
      
      {/* LEGO Head - Cylindrical with flat top */}
      <group position={[0, 1.2, 0]}>
        {/* Main head cylinder */}
        <mesh>
          <cylinderGeometry args={[0.4, 0.4, 0.5, 16]} />
          <meshStandardMaterial color={avatar.headColor || legoYellow} roughness={0.3} metalness={0.1} />
        </mesh>
        
        {/* Flat top */}
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 0.05, 16]} />
          <meshStandardMaterial color={avatar.headColor || legoYellow} roughness={0.3} metalness={0.1} />
        </mesh>
        
        {/* Face - Simple printed details */}
        {/* Eyes */}
        {avatar.faceExpression === "happy" || avatar.faceExpression === "neutral" ? (
          <>
            <mesh position={[-0.12, 0.05, 0.41]}>
              <circleGeometry args={[0.03, 16]} />
              <meshStandardMaterial color="#000000" />
            </mesh>
            <mesh position={[0.12, 0.05, 0.41]}>
              <circleGeometry args={[0.03, 16]} />
              <meshStandardMaterial color="#000000" />
            </mesh>
          </>
        ) : avatar.faceExpression === "wink" ? (
          <>
            <mesh position={[-0.12, 0.05, 0.41]}>
              <circleGeometry args={[0.03, 16]} />
              <meshStandardMaterial color="#000000" />
            </mesh>
            <mesh position={[0.12, 0.05, 0.41]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.06, 0.01, 0.01]} />
              <meshStandardMaterial color="#000000" />
            </mesh>
          </>
        ) : (
          <>
            <mesh position={[-0.12, 0.08, 0.41]}>
              <circleGeometry args={[0.04, 16]} />
              <meshStandardMaterial color="#000000" />
            </mesh>
            <mesh position={[0.12, 0.08, 0.41]}>
              <circleGeometry args={[0.04, 16]} />
              <meshStandardMaterial color="#000000" />
            </mesh>
          </>
        )}
        
        {/* Mouth */}
        {avatar.faceExpression === "happy" ? (
          <mesh position={[0, -0.1, 0.41]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.08, 0.01, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#000000" />
          </mesh>
        ) : avatar.faceExpression === "surprised" ? (
          <mesh position={[0, -0.1, 0.41]}>
            <circleGeometry args={[0.06, 16]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
        ) : (
          <mesh position={[0, -0.1, 0.41]}>
            <boxGeometry args={[0.12, 0.02, 0.01]} />
            <meshStandardMaterial color="#000000" />
          </mesh>
        )}
      </group>
      
      {/* Hair */}
      {avatar.hairStyle && (
        <group position={[0, 1.45, 0]}>
          {avatar.hairStyle === "short" && (
            <mesh>
              <cylinderGeometry args={[0.42, 0.42, 0.15, 16]} />
              <meshStandardMaterial color={avatar.hairColor} roughness={0.4} />
            </mesh>
          )}
          {avatar.hairStyle === "spiky" && (
            <group>
              {[...Array(5)].map((_, i) => (
                <mesh key={i} position={[Math.cos(i * Math.PI * 0.4) * 0.3, 0.1, Math.sin(i * Math.PI * 0.4) * 0.3]}>
                  <boxGeometry args={[0.05, 0.15, 0.05]} />
                  <meshStandardMaterial color={avatar.hairColor} roughness={0.4} />
                </mesh>
              ))}
            </group>
          )}
          {avatar.hairStyle === "curly" && (
            <group>
              {[...Array(8)].map((_, i) => (
                <mesh key={i} position={[
                  Math.cos(i * Math.PI / 4) * 0.3,
                  0.05 + Math.sin(i * 0.5) * 0.05,
                  Math.sin(i * Math.PI / 4) * 0.3
                ]}>
                  <sphereGeometry args={[0.06, 8, 8]} />
                  <meshStandardMaterial color={avatar.hairColor} roughness={0.4} />
                </mesh>
              ))}
            </group>
          )}
          {avatar.hairStyle === "slicked" && (
            <mesh rotation={[0, 0, 0]}>
              <boxGeometry args={[0.4, 0.1, 0.3]} />
              <meshStandardMaterial color={avatar.hairColor} roughness={0.4} />
            </mesh>
          )}
          {avatar.hairStyle === "afro" && (
            <mesh>
              <sphereGeometry args={[0.45, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.7]} />
              <meshStandardMaterial color={avatar.hairColor} roughness={0.4} />
            </mesh>
          )}
          {avatar.hairStyle === "buzz" && (
            <mesh>
              <cylinderGeometry args={[0.41, 0.41, 0.05, 16]} />
              <meshStandardMaterial color={avatar.hairColor} roughness={0.4} />
            </mesh>
          )}
          {avatar.hairStyle === "long" && (
            <group>
              <mesh>
                <cylinderGeometry args={[0.42, 0.42, 0.2, 16]} />
                <meshStandardMaterial color={avatar.hairColor} roughness={0.4} />
              </mesh>
              <mesh position={[0, -0.3, 0.2]}>
                <boxGeometry args={[0.35, 0.4, 0.1]} />
                <meshStandardMaterial color={avatar.hairColor} roughness={0.4} />
              </mesh>
            </group>
          )}
          {avatar.hairStyle === "ponytail" && (
            <group>
              <mesh>
                <cylinderGeometry args={[0.42, 0.42, 0.15, 16]} />
                <meshStandardMaterial color={avatar.hairColor} roughness={0.4} />
              </mesh>
              <mesh position={[0, -0.2, 0.25]}>
                <cylinderGeometry args={[0.08, 0.08, 0.3, 8]} />
                <meshStandardMaterial color={avatar.hairColor} roughness={0.4} />
              </mesh>
            </group>
          )}
          {avatar.hairStyle === "bob" && (
            <mesh>
              <cylinderGeometry args={[0.42, 0.42, 0.2, 16]} />
              <meshStandardMaterial color={avatar.hairColor} roughness={0.4} />
            </mesh>
          )}
          {avatar.hairStyle === "braids" && (
            <group>
              <mesh>
                <cylinderGeometry args={[0.42, 0.42, 0.15, 16]} />
                <meshStandardMaterial color={avatar.hairColor} roughness={0.4} />
              </mesh>
              {[-1, 1].map((side) => (
                <mesh key={side} position={[side * 0.3, -0.2, 0.2]}>
                  <cylinderGeometry args={[0.06, 0.06, 0.3, 8]} />
                  <meshStandardMaterial color={avatar.hairColor} roughness={0.4} />
                </mesh>
              ))}
            </group>
          )}
          {avatar.hairStyle === "bun" && (
            <group>
              <mesh>
                <cylinderGeometry args={[0.42, 0.42, 0.1, 16]} />
                <meshStandardMaterial color={avatar.hairColor} roughness={0.4} />
              </mesh>
              <mesh position={[0, 0.05, 0.2]}>
                <torusGeometry args={[0.12, 0.04, 8, 16]} />
                <meshStandardMaterial color={avatar.hairColor} roughness={0.4} />
              </mesh>
            </group>
          )}
        </group>
      )}
      
      {/* Torso/Shirt */}
      <group position={[0, 0.5, 0]}>
        {/* Base torso */}
        <mesh>
          <boxGeometry args={[0.6, 0.7, 0.4]} />
          <meshStandardMaterial color={avatar.shirtColor || legoRed} roughness={0.3} metalness={0.1} />
        </mesh>
        
        {/* Shirt patterns */}
        {avatar.shirtPattern === "stripes" && (
          <>
            {[...Array(5)].map((_, i) => (
              <mesh key={i} position={[0, -0.35 + i * 0.175, 0.21]}>
                <boxGeometry args={[0.6, 0.02, 0.01]} />
                <meshStandardMaterial color="#FFFFFF" />
              </mesh>
            ))}
          </>
        )}
        {avatar.shirtPattern === "polka" && (
          <>
            {[0, 1, 2].map((row) => (
              [-1, 0, 1].map((col) => (
                <mesh key={`${row}-${col}`} position={[col * 0.2, -0.2 + row * 0.2, 0.21]}>
                  <circleGeometry args={[0.05, 8]} />
                  <meshStandardMaterial color="#FFFFFF" />
                </mesh>
              ))
            ))}
          </>
        )}
        {avatar.shirtPattern === "heart" && (
          <mesh position={[0, 0, 0.21]}>
            <shapeGeometry args={[createHeartShape()]} />
            <meshStandardMaterial color="#FF69B4" />
          </mesh>
        )}
        {avatar.shirtPattern === "star" && (
          <mesh position={[0, 0, 0.21]}>
            <shapeGeometry args={[createStarShape()]} />
            <meshStandardMaterial color="#FFD700" />
          </mesh>
        )}
        {avatar.shirtPattern === "checkered" && (
          <>
            {[0, 1].map((row) => (
              [0, 1].map((col) => (
                <mesh key={`${row}-${col}`} position={[-0.15 + col * 0.3, -0.15 + row * 0.3, 0.21]}>
                  <boxGeometry args={[0.25, 0.25, 0.01]} />
                  <meshStandardMaterial color="#FFFFFF" />
                </mesh>
              ))
            ))}
          </>
        )}
        
        {/* V-neck */}
        {avatar.shirtStyle === "vneck" && (
          <mesh position={[0, 0.25, 0.21]}>
            <shapeGeometry args={[createVNeckShape()]} />
            <meshStandardMaterial color="#000000" />
          </mesh>
        )}
      </group>
      
      {/* Arms */}
      <mesh position={[-0.4, 0.5, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.5, 8]} />
        <meshStandardMaterial color={avatar.shirtColor || legoRed} roughness={0.3} metalness={0.1} />
      </mesh>
      <mesh position={[0.4, 0.5, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.5, 8]} />
        <meshStandardMaterial color={avatar.shirtColor || legoRed} roughness={0.3} metalness={0.1} />
      </mesh>
      
      {/* LEGO C-shaped Hands */}
      <mesh position={[-0.4, 0.2, 0.15]}>
        <torusGeometry args={[0.1, 0.05, 8, 16, Math.PI]} />
        <meshStandardMaterial color={avatar.handColor || legoYellow} roughness={0.3} />
      </mesh>
      <mesh position={[0.4, 0.2, 0.15]}>
        <torusGeometry args={[0.1, 0.05, 8, 16, Math.PI]} />
        <meshStandardMaterial color={avatar.handColor || legoYellow} roughness={0.3} />
      </mesh>
      
      {/* Legs */}
      <group position={[0, -0.3, 0]}>
        {avatar.legStyle === "pants" ? (
          <>
            <mesh position={[-0.15, 0, 0]}>
              <boxGeometry args={[0.2, 0.8, 0.2]} />
              <meshStandardMaterial 
                color={avatar.legColor || legoBlue} 
                roughness={avatar.legPattern === "denim" ? 0.6 : 0.3}
                metalness={0.1}
              />
            </mesh>
            <mesh position={[0.15, 0, 0]}>
              <boxGeometry args={[0.2, 0.8, 0.2]} />
              <meshStandardMaterial 
                color={avatar.legColor || legoBlue} 
                roughness={avatar.legPattern === "denim" ? 0.6 : 0.3}
                metalness={0.1}
              />
            </mesh>
            {/* Denim stitching */}
            {avatar.legPattern === "denim" && (
              <>
                <mesh position={[-0.15, -0.2, 0.11]}>
                  <boxGeometry args={[0.18, 0.02, 0.01]} />
                  <meshStandardMaterial color="#87CEEB" />
                </mesh>
                <mesh position={[0.15, -0.2, 0.11]}>
                  <boxGeometry args={[0.18, 0.02, 0.01]} />
                  <meshStandardMaterial color="#87CEEB" />
                </mesh>
              </>
            )}
            {/* Cargo pockets */}
            {avatar.legPattern === "cargo" && (
              <>
                {[-1, 1].map((side) => (
                  <mesh key={side} position={[side * 0.15, 0.1, 0.11]}>
                    <boxGeometry args={[0.08, 0.1, 0.02]} />
                    <meshStandardMaterial color={avatar.legColor || legoBlue} />
                  </mesh>
                ))}
              </>
            )}
          </>
        ) : (
          <>
            <mesh position={[-0.15, 0.2, 0]}>
              <boxGeometry args={[0.2, 0.4, 0.2]} />
              <meshStandardMaterial 
                color={avatar.legColor || legoBlue} 
                roughness={avatar.legPattern === "denim" ? 0.6 : 0.3}
                metalness={0.1}
              />
            </mesh>
            <mesh position={[0.15, 0.2, 0]}>
              <boxGeometry args={[0.2, 0.4, 0.2]} />
              <meshStandardMaterial 
                color={avatar.legColor || legoBlue} 
                roughness={avatar.legPattern === "denim" ? 0.6 : 0.3}
                metalness={0.1}
              />
            </mesh>
            {/* Athletic stripes */}
            {avatar.legPattern === "stripes" && (
              <>
                <mesh position={[-0.15, 0.3, 0.11]}>
                  <boxGeometry args={[0.18, 0.02, 0.01]} />
                  <meshStandardMaterial color="#FFFFFF" />
                </mesh>
                <mesh position={[0.15, 0.3, 0.11]}>
                  <boxGeometry args={[0.18, 0.02, 0.01]} />
                  <meshStandardMaterial color="#FFFFFF" />
                </mesh>
              </>
            )}
          </>
        )}
      </group>
      
      {/* Accessories */}
      {avatar.accessories.includes("backpack") && (
        <mesh position={[0, 0.3, -0.25]}>
          <boxGeometry args={[0.4, 0.5, 0.15]} />
          <meshStandardMaterial color="#333333" roughness={0.5} />
        </mesh>
      )}
      {avatar.accessories.includes("bag") && (
        <mesh position={[0.35, 0.4, 0]}>
          <boxGeometry args={[0.15, 0.2, 0.1]} />
          <meshStandardMaterial color="#8B4513" roughness={0.6} />
        </mesh>
      )}
      {avatar.accessories.includes("hat") && (
        <mesh position={[0, 1.7, 0]}>
          <cylinderGeometry args={[0.45, 0.45, 0.1, 16]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.4} />
        </mesh>
      )}
      {avatar.accessories.includes("cap") && (
        <group position={[0, 1.65, 0]}>
          <mesh>
            <cylinderGeometry args={[0.42, 0.42, 0.08, 16]} />
            <meshStandardMaterial color="#0066CC" roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.04, 0.2]}>
            <boxGeometry args={[0.35, 0.05, 0.15]} />
            <meshStandardMaterial color="#0066CC" roughness={0.4} />
          </mesh>
        </group>
      )}
      {avatar.accessories.includes("glasses") && (
        <group position={[0, 1.2, 0.4]}>
          <mesh position={[-0.12, 0, 0]}>
            <torusGeometry args={[0.1, 0.01, 8, 16]} />
            <meshStandardMaterial color="#333333" metalness={0.8} />
          </mesh>
          <mesh position={[0.12, 0, 0]}>
            <torusGeometry args={[0.1, 0.01, 8, 16]} />
            <meshStandardMaterial color="#333333" metalness={0.8} />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.24, 0.01, 0.01]} />
            <meshStandardMaterial color="#333333" metalness={0.8} />
          </mesh>
        </group>
      )}
    </group>
  );
};

// Helper functions for shapes
function createHeartShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.1);
  shape.bezierCurveTo(0, 0.1, -0.1, 0, -0.1, -0.05);
  shape.bezierCurveTo(-0.1, -0.1, 0, -0.1, 0, -0.05);
  shape.bezierCurveTo(0, -0.1, 0.1, -0.1, 0.1, -0.05);
  shape.bezierCurveTo(0.1, 0, 0, 0.1, 0, 0.1);
  return shape;
}

function createStarShape() {
  const shape = new THREE.Shape();
  const spikes = 5;
  const outerRadius = 0.15;
  const innerRadius = 0.08;
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i * Math.PI) / spikes;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function createVNeckShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.15, 0.35);
  shape.lineTo(0, 0.2);
  shape.lineTo(0.15, 0.35);
  shape.lineTo(0.15, 0.35);
  return shape;
}

const AvatarStudio: React.FC<AvatarStudioProps> = ({ open = true, onOpenChange, onSave, initialAvatar }) => {
  const [avatar, setAvatar] = useState<EnhancedAvatarData>({
    gender: "male",
    headColor: "#FFD700",
    faceExpression: "happy",
    hairColor: "#8B4513",
    hairStyle: "short",
    shirtStyle: "basic",
    shirtColor: "#DC143C",
    legStyle: "pants",
    legColor: "#0066CC",
    accessories: [],
    handColor: "#FFD700",
  });

  const [selectedClothingType, setSelectedClothingType] = useState<"shirt" | "pants" | "shorts" | null>(null);

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

  const hairColors = ["#8B4513", "#2C1A0E", "#000000", "#FFD700", "#FF69B4", "#FFFFFF", "#4B0082"];
  const shirtColors = ["#DC143C", "#0066CC", "#00AA44", "#FFD700", "#FF69B4", "#FFFFFF", "#000000", "#8B4513"];
  const legColors = ["#0066CC", "#000000", "#8B4513", "#FFFFFF", "#DC143C", "#00AA44", "#808080"];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h1 className="text-2xl font-semibold text-green-700 dark:text-green-400">Build Your LEGO Avatar</h1>
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
                  <LegoAvatar3D avatar={avatar} />
                  <OrbitControls enableZoom={true} enablePan={false} minDistance={3} maxDistance={8} />
                </Canvas>
              </div>
            </Card>

            {/* Customization Panel */}
            <div className="space-y-4">
              {/* Gender Toggle */}
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">Gender</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["male", "female"] as const).map((gender) => (
                    <motion.button
                      key={gender}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        handleChange("gender", gender);
                        // Reset hair style to first option for selected gender
                        const firstHairStyle = HAIR_STYLES[gender][0].id;
                        handleChange("hairStyle", firstHairStyle);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        avatar.gender === gender
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {gender.charAt(0).toUpperCase() + gender.slice(1)}
                    </motion.button>
                  ))}
                </div>
              </div>

              <Tabs defaultValue="face" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="face">Face</TabsTrigger>
                  <TabsTrigger value="hair">Hair</TabsTrigger>
                  <TabsTrigger value="clothing">Clothing</TabsTrigger>
                  <TabsTrigger value="accessories">Extras</TabsTrigger>
                </TabsList>

                {/* Face Tab */}
                <TabsContent value="face" className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Face Expression</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(["happy", "neutral", "wink", "surprised"] as const).map((expr) => (
                        <motion.button
                          key={expr}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleChange("faceExpression", expr)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            avatar.faceExpression === expr
                              ? "bg-green-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {expr.charAt(0).toUpperCase() + expr.slice(1)}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Hair Tab */}
                <TabsContent value="hair" className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Hair Style</label>
                    <div className="grid grid-cols-3 gap-2">
                      {HAIR_STYLES[avatar.gender].map((style) => (
                        <motion.button
                          key={style.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleChange("hairStyle", style.id)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            avatar.hairStyle === style.id
                              ? "bg-green-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {style.name}
                        </motion.button>
                      ))}
                    </div>
                  </div>

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
                </TabsContent>

                {/* Clothing Tab */}
                <TabsContent value="clothing" className="space-y-4 mt-4">
                  {/* Shirt Selection */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Shirt</label>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedClothingType(selectedClothingType === "shirt" ? null : "shirt")}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedClothingType === "shirt"
                              ? "bg-green-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          Choose Shirt
                        </motion.button>
                        {selectedClothingType === "shirt" && (
                          <div className="col-span-2 grid grid-cols-4 gap-2 mt-2">
                            {SHIRT_STYLES.map((shirt) => (
                              <motion.button
                                key={shirt.id}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  handleChange("shirtStyle", shirt.id);
                                  if (shirt.pattern) handleChange("shirtPattern", shirt.pattern);
                                  else handleChange("shirtPattern", undefined);
                                  setSelectedClothingType(null);
                                }}
                                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                                  avatar.shirtStyle === shirt.id
                                    ? "bg-green-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                                }`}
                              >
                                {shirt.name}
                              </motion.button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Shirt Color</label>
                        <div className="grid grid-cols-8 gap-2">
                          {shirtColors.map((color) => (
                            <div
                              key={color}
                              onClick={() => handleChange("shirtColor", color)}
                              className={`w-8 h-8 rounded-full cursor-pointer border-2 transition-all ${
                                avatar.shirtColor === color
                                  ? "border-green-600 scale-110"
                                  : "border-transparent hover:scale-105"
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pants Selection */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Pants</label>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            handleChange("legStyle", "pants");
                            setSelectedClothingType(selectedClothingType === "pants" ? null : "pants");
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            avatar.legStyle === "pants" && selectedClothingType === "pants"
                              ? "bg-green-600 text-white"
                              : avatar.legStyle === "pants"
                              ? "bg-green-200 text-green-700 dark:bg-green-800 dark:text-green-300"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          Choose Pants
                        </motion.button>
                        {selectedClothingType === "pants" && (
                          <div className="col-span-2 grid grid-cols-4 gap-2 mt-2">
                            {PANTS_STYLES.map((pant) => (
                              <motion.button
                                key={pant.id}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  handleChange("legStyle", "pants");
                                  if (pant.pattern) handleChange("legPattern", pant.pattern);
                                  else handleChange("legPattern", undefined);
                                  setSelectedClothingType(null);
                                }}
                                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                                  avatar.legPattern === pant.pattern && avatar.legStyle === "pants"
                                    ? "bg-green-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                                }`}
                              >
                                {pant.name}
                              </motion.button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Pants Color</label>
                        <div className="grid grid-cols-7 gap-2">
                          {legColors.map((color) => (
                            <div
                              key={color}
                              onClick={() => handleChange("legColor", color)}
                              className={`w-8 h-8 rounded-full cursor-pointer border-2 transition-all ${
                                avatar.legColor === color && avatar.legStyle === "pants"
                                  ? "border-green-600 scale-110"
                                  : "border-transparent hover:scale-105"
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Shorts Selection */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Shorts</label>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            handleChange("legStyle", "shorts");
                            setSelectedClothingType(selectedClothingType === "shorts" ? null : "shorts");
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            avatar.legStyle === "shorts" && selectedClothingType === "shorts"
                              ? "bg-green-600 text-white"
                              : avatar.legStyle === "shorts"
                              ? "bg-green-200 text-green-700 dark:bg-green-800 dark:text-green-300"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          Choose Shorts
                        </motion.button>
                        {selectedClothingType === "shorts" && (
                          <div className="col-span-2 grid grid-cols-4 gap-2 mt-2">
                            {SHORTS_STYLES.map((short) => (
                              <motion.button
                                key={short.id}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  handleChange("legStyle", "shorts");
                                  if (short.pattern) handleChange("legPattern", short.pattern);
                                  else handleChange("legPattern", undefined);
                                  setSelectedClothingType(null);
                                }}
                                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                                  avatar.legPattern === short.pattern && avatar.legStyle === "shorts"
                                    ? "bg-green-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                                }`}
                              >
                                {short.name}
                              </motion.button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Shorts Color</label>
                        <div className="grid grid-cols-7 gap-2">
                          {legColors.map((color) => (
                            <div
                              key={color}
                              onClick={() => handleChange("legColor", color)}
                              className={`w-8 h-8 rounded-full cursor-pointer border-2 transition-all ${
                                avatar.legColor === color && avatar.legStyle === "shorts"
                                  ? "border-green-600 scale-110"
                                  : "border-transparent hover:scale-105"
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Accessories Tab */}
                <TabsContent value="accessories" className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Accessories</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["glasses", "hat", "cap", "backpack", "bag"].map((accessory) => (
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
          Build your unique LEGO minifigure! 🧱
        </p>
      </div>
    </div>
  );
};

export default AvatarStudio;
