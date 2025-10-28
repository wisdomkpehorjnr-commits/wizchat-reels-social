import React from "react";

interface AvatarPreview3DProps {
  avatar: {
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
  };
}

export default function AvatarPreview3D({ avatar }: AvatarPreview3DProps) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-inner">
      <div className="w-40 h-40 rounded-full flex items-center justify-center bg-white shadow-lg border border-green-200 text-6xl">
        🧑
      </div>
      <div className="mt-4 text-green-700 text-sm">
        <p>👕 Outfit: {avatar.outfit}</p>
        <p>🎨 Outfit Color: {avatar.outfitColor}</p>
        <p>💇 Hair: {avatar.hair}</p>
        <p>🧢 Accessories: {avatar.accessories}</p>
      </div>
    </div>
  );
}
