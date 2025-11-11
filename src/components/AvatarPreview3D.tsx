import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { EnhancedAvatarData } from "./AvatarStudio";
import * as THREE from "three";

interface AvatarPreview3DProps {
  avatar: EnhancedAvatarData;
  size?: "small" | "medium" | "large";
}

// Helper functions for shapes (same as in AvatarStudio)
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

// LEGO 3D Avatar Component (same as in AvatarStudio)
const LegoAvatar3D: React.FC<{ avatar: EnhancedAvatarData }> = ({ avatar }) => {
  const legoYellow = "#FFD700";
  const legoRed = "#DC143C";
  const legoBlue = "#0066CC";
  
  return (
    <group>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <directionalLight position={[-5, 5, -5]} intensity={0.5} />
      
      {/* LEGO Head */}
      <group position={[0, 1.2, 0]}>
        <mesh>
          <cylinderGeometry args={[0.4, 0.4, 0.5, 16]} />
          <meshStandardMaterial color={avatar.headColor || legoYellow} roughness={0.3} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 0.05, 16]} />
          <meshStandardMaterial color={avatar.headColor || legoYellow} roughness={0.3} metalness={0.1} />
        </mesh>
        
        {/* Face */}
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
        <mesh>
          <boxGeometry args={[0.6, 0.7, 0.4]} />
          <meshStandardMaterial color={avatar.shirtColor || legoRed} roughness={0.3} metalness={0.1} />
        </mesh>
        
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
          <LegoAvatar3D avatar={avatar} />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1} />
        </Canvas>
      </div>
    </div>
  );
}
