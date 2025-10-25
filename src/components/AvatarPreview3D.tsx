import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';

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

const colorMap: Record<string, string> = {
  // Skin
  light: '#FFE0BD',
  fair: '#F1C27D',
  medium: '#C68642',
  olive: '#8D5524',
  brown: '#6B4423',
  deep: '#4A2C1A',
  // Hair & generic
  black: '#1a1a1a',
  brown: '#4A2C1A',
  blonde: '#E6C27A',
  red: '#8B2C2C',
  blue: '#3B82F6',
  pink: '#EC4899',
  purple: '#8B5CF6',
  green: '#10B981',
  // Eyes
  hazel: '#8E7618',
  gray: '#808080',
};

const getColor = (id: string, fallback: string) => colorMap[id] || fallback;

const Head: React.FC<{ skinColor: THREE.Color; eyeColor: THREE.Color; mouthStyle: string; eyeStyle: string }> = ({
  skinColor,
  eyeColor,
  mouthStyle,
  eyeStyle,
}) => {
  const headRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);

  useFrame(({ camera }) => {
    if (headRef.current && leftEyeRef.current && rightEyeRef.current) {
      const headPos = new THREE.Vector3();
      headRef.current.getWorldPosition(headPos);
      const direction = new THREE.Vector3().subVectors(camera.position, headPos).normalize();
      const lookOffset = new THREE.Vector3(direction.x * 0.2, direction.y * 0.1, 0);
      leftEyeRef.current.lookAt(headPos.clone().add(lookOffset));
      rightEyeRef.current.lookAt(headPos.clone().add(lookOffset));
    }
  });

  const mouthY = mouthStyle === 'smile' ? 0.02 : mouthStyle === 'frown' ? -0.02 : 0;
  const eyeOpen = eyeStyle === 'sleepy' ? 0.02 : 0.04;

  return (
    <group position={[0, 1.7, 0]}>
      <mesh ref={headRef} castShadow>
        <sphereGeometry args={[0.32, 48, 48]} />
        <meshStandardMaterial color={skinColor} roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh ref={leftEyeRef} position={[-0.11, 1.73, 0.28]}>
        <sphereGeometry args={[eyeOpen, 24, 24]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh ref={rightEyeRef} position={[0.11, 1.73, 0.28]}>
        <sphereGeometry args={[eyeOpen, 24, 24]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-0.11, 1.73, 0.31]}>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshStandardMaterial color={eyeColor} />
      </mesh>
      <mesh position={[0.11, 1.73, 0.31]}>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshStandardMaterial color={eyeColor} />
      </mesh>
      <mesh position={[-0.12, 1.82, 0.28]} rotation={[0, 0, eyeStyle === 'sleepy' ? 0.3 : eyeStyle === 'almond' ? -0.2 : 0]}>
        <boxGeometry args={[0.12, 0.015, 0.02]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[0.12, 1.82, 0.28]} rotation={[0, 0, eyeStyle === 'sleepy' ? -0.3 : eyeStyle === 'almond' ? 0.2 : 0]}>
        <boxGeometry args={[0.12, 0.015, 0.02]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[0, 1.65, 0.3]}>
        <coneGeometry args={[0.035, 0.1, 16]} />
        <meshStandardMaterial color={skinColor} />
      </mesh>
      <mesh position={[0, 1.58 + mouthY, 0.31]}>
        <boxGeometry args={[0.12, 0.015, 0.02]} />
        <meshStandardMaterial color="#d15e5e" />
      </mesh>
    </group>
  );
};

const Hair: React.FC<{ style: string; color: THREE.Color }> = ({ style, color }) => {
  if (style === 'none') return null;
  const geometry = useMemo(() => {
    switch (style) {
      case 'buzz': return new THREE.SphereGeometry(0.33, 32, 16, 0, Math.PI * 2, 0, Math.PI / 3);
      case 'long': return new THREE.CapsuleGeometry(0.35, 0.5, 4, 32);
      case 'afro': return new THREE.SphereGeometry(0.42, 32, 32);
      default: return new THREE.SphereGeometry(0.35, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    }
  }, [style]);
  return (
    <mesh castShadow position={[0, style === 'long' ? 1.6 : 1.82, 0]}>
      <primitive object={geometry} />
      <meshStandardMaterial color={color} roughness={0.9} metalness={0.1} />
    </mesh>
  );
};

const Body: React.FC<{ outfitColor: THREE.Color }> = ({ outfitColor }) => (
  <group position={[0, 0.6, 0]}>
    <mesh castShadow>
      <capsuleGeometry args={[0.4, 0.8, 4, 32]} />
      <meshStandardMaterial color={outfitColor} roughness={0.8} metalness={0.1} />
    </mesh>
    <mesh castShadow position={[0, 0.7, 0]}>
      <cylinderGeometry args={[0.15, 0.15, 0.2, 16]} />
      <meshStandardMaterial color="#C68642" />
    </mesh>
  </group>
);

const FacialHair: React.FC<{ style: string; hairColor: THREE.Color }> = ({ style, hairColor }) => {
  if (style === 'none') return null;
  return (
    <mesh position={[0, 1.52, 0.29]}>
      <torusGeometry args={[0.11, 0.025, 12, 32, Math.PI]} />
      <meshStandardMaterial color={hairColor} />
    </mesh>
  );
};

const Accessories: React.FC<{ type: string; hairColor: THREE.Color }> = ({ type, hairColor }) => {
  if (type === 'none') return null;
  return (
    <mesh castShadow position={[0, 1.95, 0]}>
      <capsuleGeometry args={[0.38, 0.1, 4, 32]} />
      <meshStandardMaterial color={hairColor} roughness={0.7} />
    </mesh>
  );
};

const AvatarModel: React.FC<{ avatar: AvatarState }> = ({ avatar }) => {
  const skinColor = new THREE.Color(getColor(avatar.skin, '#F1C27D'));
  const hairColor = new THREE.Color(getColor(avatar.hairColor, '#4A2C1A'));
  const eyeColor = new THREE.Color(getColor(avatar.eyeColor, '#3B82F6'));
  const outfitColor = new THREE.Color(getColor(avatar.outfitColor, '#3B82F6'));

  return (
    <group position={[0, -0.6, 0]}>
      <Body outfitColor={outfitColor} />
      <Head skinColor={skinColor} eyeColor={eyeColor} mouthStyle={avatar.mouth} eyeStyle={avatar.eyes} />
      <Hair style={avatar.hair} color={hairColor} />
      <FacialHair style={avatar.facialHair} hairColor={hairColor} />
      <Accessories type={avatar.accessories} hairColor={hairColor} />
    </group>
  );
};

const Scene: React.FC<{ avatar: AvatarState }> = ({ avatar }) => {
  const { camera } = useThree();
  camera.position.set(0, 1.6, 3);
  camera.fov = 40;
  camera.updateProjectionMatrix();

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 3]} intensity={1} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-5, 5, 5]} intensity={0.4} />
      <AvatarModel avatar={avatar} />
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        enableRotate={true}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2}
        autoRotate={true}
        autoRotateSpeed={0.5}
      />
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[10, 10]} />
        <shadowMaterial opacity={0.2} />
      </mesh>
    </>
  );
};

const AvatarPreview3D: React.FC<{ avatar: AvatarState }> = ({ avatar }) => {
  return (
    <div className="w-full h-full rounded-xl overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100">
      <Canvas shadows>
        <Scene avatar={avatar} />
      </Canvas>
    </div>
  );
};

export default AvatarPreview3D;