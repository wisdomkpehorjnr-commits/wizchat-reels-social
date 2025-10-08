import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AvatarState {
  skin: string;
  hair: string;
  hairColor: string;
  eyes: string;
  eyeColor: string;
  nose: string;
  mouth: string;
  facialHair: string;
  outfit: string;
  outfitColor: string;
  accessories: string;
}

function mapColor(id: string, fallback: string) {
  const map: Record<string, string> = {
    // hair & generic palette
    black: '#1a1a1a',
    brown: '#4A2C1A',
    blonde: '#E6C27A',
    red: '#8B2C2C',
    blue: '#3B82F6',
    pink: '#EC4899',
    purple: '#8B5CF6',
    green: '#10B981',
    // eyes
    hazel: '#8E7618',
    gray: '#808080'
  };
  return map[id] || fallback;
}

const AvatarMesh: React.FC<{ avatar: AvatarState }> = ({ avatar }) => {
  const group = useRef<THREE.Group>(null!);

  useFrame((_state, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.3; // slow auto-rotate
    }
  });

  // Basic proportions
  const skinColor = new THREE.Color(
    {
      light: '#FFE0BD',
      fair: '#F1C27D',
      medium: '#C68642',
      olive: '#8D5524',
      brown: '#6B4423',
      deep: '#4A2C1A',
    }[avatar.skin] || '#F1C27D'
  );
  const hairColor = new THREE.Color(mapColor(avatar.hairColor, '#4A2C1A'));
  const eyeColor = new THREE.Color(mapColor(avatar.eyeColor, '#4A2C1A'));
  const outfitColor = new THREE.Color(mapColor(avatar.outfitColor, '#3B82F6'));

  return (
    <group ref={group} position={[0, -0.6, 0]}>
      {/* Body */}
      <mesh castShadow position={[0, 0.6, 0]}> 
        <cylinderGeometry args={[0.45, 0.6, 1.2, 24]} />
        <meshStandardMaterial color={outfitColor} metalness={0.05} roughness={0.7} />
      </mesh>

      {/* Neck */}
      <mesh castShadow position={[0, 1.3, 0]}> 
        <cylinderGeometry args={[0.17, 0.17, 0.18, 12]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>

      {/* Head */}
      <mesh castShadow position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>

      {/* Hair - simple cap; change shape by style id slightly */}
      <mesh castShadow position={[0, 1.82, 0]}>
        <sphereGeometry args={[0.36, 32, 32, 0, Math.PI * 2, 0, avatar.hair === 'buzz' ? Math.PI / 3 : Math.PI / 2]} />
        <meshStandardMaterial color={hairColor} roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.12, 1.72, 0.31]}>
        <sphereGeometry args={[0.045 + (avatar.eyes === 'round' ? 0.01 : 0), 16, 16]} />
        <meshStandardMaterial color={'#ffffff'} />
      </mesh>
      <mesh position={[0.12, 1.72, 0.31]}>
        <sphereGeometry args={[0.045 + (avatar.eyes === 'round' ? 0.01 : 0), 16, 16]} />
        <meshStandardMaterial color={'#ffffff'} />
      </mesh>

      {/* Irises */}
      <mesh position={[-0.12, 1.72, 0.345]}>
        <circleGeometry args={[0.02 + (avatar.eyes === 'sleepy' ? -0.004 : 0), 16]} />
        <meshStandardMaterial color={eyeColor} />
      </mesh>
      <mesh position={[0.12, 1.72, 0.345]}>
        <circleGeometry args={[0.02 + (avatar.eyes === 'sleepy' ? -0.004 : 0), 16]} />
        <meshStandardMaterial color={eyeColor} />
      </mesh>

      {/* Brows */}
      <mesh position={[-0.12, 1.82, 0.30]} rotation={[0,0,avatar.eyes==='sleepy'?0.2:avatar.eyes==='almond'?-0.2:0]}> 
        <boxGeometry args={[0.12, 0.02, 0.02]} />
        <meshStandardMaterial color={hairColor} />
      </mesh>
      <mesh position={[0.12, 1.82, 0.30]} rotation={[0,0,avatar.eyes==='sleepy'?-0.2:avatar.eyes==='almond'?0.2:0]}> 
        <boxGeometry args={[0.12, 0.02, 0.02]} />
        <meshStandardMaterial color={hairColor} />
      </mesh>

      {/* Nose */}
      <mesh position={[0, 1.64, 0.34]}>
        <coneGeometry args={[0.04, 0.12, 12]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>

      {/* Mouth */}
      <mesh position={[0, 1.55, 0.33]} rotation={[0,0,avatar.mouth==='smile'?0.15:avatar.mouth==='frown'?-0.15:0]}>
        <boxGeometry args={[0.16, 0.02, 0.02]} />
        <meshStandardMaterial color={'#c94f4f'} />
      </mesh>

      {/* Simple facial hair */}
      {avatar.facialHair !== 'none' && (
        <mesh position={[0, 1.5, 0.32]}> 
          <torusGeometry args={[0.12, 0.02, 8, 24, Math.PI]} />
          <meshStandardMaterial color={hairColor} />
        </mesh>
      )}

      {/* Accessories - simple hat */}
      {avatar.accessories === 'hat' && (
        <mesh castShadow position={[0, 1.95, 0]}> 
          <cylinderGeometry args={[0.42, 0.45, 0.15, 24]} />
          <meshStandardMaterial color={hairColor} />
        </mesh>
      )}
    </group>
  );
};

const AvatarPreview3D: React.FC<{ avatar: AvatarState }> = ({ avatar }) => {
  return (
    <div className="w-full h-full">
      <Canvas shadows camera={{ position: [0, 1.6, 3], fov: 40 }}>
        <color attach="background" args={["#00000000"]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 2]} intensity={0.8} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        <spotLight position={[-4, 6, 5]} angle={0.3} intensity={0.5} />
        <group>
          <AvatarMesh avatar={avatar} />
          {/* Ground */}
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
            <planeGeometry args={[10, 10]} />
            <shadowMaterial opacity={0.25} />
          </mesh>
        </group>
      </Canvas>
    </div>
  );
};

export default AvatarPreview3D;
