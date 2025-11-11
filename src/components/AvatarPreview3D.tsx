import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { EnhancedAvatarData } from "./AvatarStudio";
import * as THREE from "three";

interface AvatarPreview3DProps {
  avatar: EnhancedAvatarData;
  size?: "small" | "medium" | "large";
}

// 3D Avatar Component (same as in AvatarStudio)
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

export default function AvatarPreview3D({ avatar, size = "medium" }: AvatarPreview3DProps) {
  const sizeMap = {
    small: { width: "w-32", height: "h-32" },
    medium: { width: "w-40", height: "h-40" },
    large: { width: "w-64", height: "h-64" },
  };

  const dimensions = sizeMap[size];

  return (
    <div className={`flex flex-col items-center justify-center ${dimensions.width} ${dimensions.height} bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-inner`}>
      <div className={`${dimensions.width} ${dimensions.height} rounded-full flex items-center justify-center bg-white dark:bg-gray-800 shadow-lg border border-green-200 dark:border-gray-700 overflow-hidden`}>
        <Canvas camera={{ position: [0, 1, 3], fov: 50 }}>
          <PerspectiveCamera makeDefault position={[0, 1, 3]} fov={50} />
          <Avatar3D avatar={avatar} />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1} />
        </Canvas>
      </div>
    </div>
  );
}
