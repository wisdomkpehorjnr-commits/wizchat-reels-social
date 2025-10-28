import React, { useState } from "react";
import AvatarPreview3D from "./AvatarPreview3D";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Save, RefreshCcw } from "lucide-react";
import { motion } from "framer-motion";

export default function AvatarStudio() {
  const [avatar, setAvatar] = useState({
    skin: "fair",
    hair: "short",
    hairColor: "brown",
    eyes: "almond",
    eyeColor: "hazel",
    nose: "default",
    mouth: "smile",
    facialHair: "none",
    outfit: "hoodie",
    outfitColor: "green",
    accessories: "none",
  });

  const updateAvatar = (key: string, value: string) => {
    setAvatar((prev) => ({ ...prev, [key]: value }));
  };

  const colorOptions = ["green", "blue", "pink", "purple", "black", "brown"];

  return (
    <div className="min-h-screen bg-white text-green-900 flex flex-col items-center p-6">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-semibold mb-6 text-green-600"
      >
        Avatar Studio
      </motion.h1>

      <Card className="w-full max-w-6xl border-green-200 shadow-lg">
        <CardContent className="flex flex-col md:flex-row gap-8 p-6">
          {/* --- Left: 3D Avatar Preview --- */}
          <div className="w-full md:w-1/2 bg-green-50 rounded-2xl overflow-hidden flex flex-col items-center justify-center shadow-inner">
            <div className="w-full h-[500px]">
              <AvatarPreview3D avatar={avatar} />
            </div>
            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                className="border-green-600 text-green-600 hover:bg-green-100"
              >
                <RefreshCcw size={16} className="mr-2" /> Randomize
              </Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Save size={16} className="mr-2" /> Save
              </Button>
            </div>
          </div>

          {/* --- Right: Customization Controls --- */}
          <div className="w-full md:w-1/2">
            <Tabs defaultValue="features" className="w-full">
              <TabsList className="grid grid-cols-3 bg-green-100 rounded-lg mb-4">
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="hair">Hair</TabsTrigger>
                <TabsTrigger value="fashion">Fashion</TabsTrigger>
              </TabsList>

              {/* === Features === */}
              <TabsContent value="features">
                <h3 className="font-semibold mb-2 text-green-700">Skin Tone</h3>
                <div className="flex gap-3 mb-4">
                  {["light", "fair", "medium", "olive", "brown", "deep"].map((tone) => (
                    <button
                      key={tone}
                      onClick={() => updateAvatar("skin", tone)}
                      className={`w-10 h-10 rounded-full border-2 ${
                        avatar.skin === tone ? "border-green-500" : "border-transparent"
                      }`}
                      style={{ backgroundColor: `var(--${tone}-color, #ccc)` }}
                    />
                  ))}
                </div>

                <h3 className="font-semibold mb-2 text-green-700">Eye Color</h3>
                <div className="flex gap-3">
                  {["blue", "green", "hazel", "gray", "brown"].map((color) => (
                    <button
                      key={color}
                      onClick={() => updateAvatar("eyeColor", color)}
                      className={`w-10 h-10 rounded-full border-2 ${
                        avatar.eyeColor === color ? "border-green-500" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </TabsContent>

              {/* === Hair === */}
              <TabsContent value="hair">
                <h3 className="font-semibold mb-2 text-green-700">Hair Style</h3>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {["short", "buzz", "long", "afro"].map((style) => (
                    <Button
                      key={style}
                      variant={avatar.hair === style ? "default" : "outline"}
                      onClick={() => updateAvatar("hair", style)}
                      className={`${
                        avatar.hair === style
                          ? "bg-green-600 text-white"
                          : "border-green-500 text-green-600"
                      }`}
                    >
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                    </Button>
                  ))}
                </div>

                <h3 className="font-semibold mb-2 text-green-700">Hair Color</h3>
                <div className="flex gap-3">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => updateAvatar("hairColor", color)}
                      className={`w-10 h-10 rounded-full border-2 ${
                        avatar.hairColor === color ? "border-green-500" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </TabsContent>

              {/* === Fashion === */}
              <TabsContent value="fashion">
                <h3 className="font-semibold mb-2 text-green-700">Outfit</h3>
                <Input
                  placeholder="Type outfit (e.g., Hoodie, Jacket)"
                  className="border-green-300 focus:border-green-500 mb-4"
                  value={avatar.outfit}
                  onChange={(e) => updateAvatar("outfit", e.target.value)}
                />

                <h3 className="font-semibold mb-2 text-green-700">Outfit Color</h3>
                <div className="flex gap-3 mb-4">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => updateAvatar("outfitColor", color)}
                      className={`w-10 h-10 rounded-full border-2 ${
                        avatar.outfitColor === color ? "border-green-500" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                <h3 className="font-semibold mb-2 text-green-700">Accessories</h3>
                <div className="grid grid-cols-3 gap-2">
                  {["none", "cap", "headband", "glasses"].map((acc) => (
                    <Button
                      key={acc}
                      variant={avatar.accessories === acc ? "default" : "outline"}
                      onClick={() => updateAvatar("accessories", acc)}
                      className={`${
                        avatar.accessories === acc
                          ? "bg-green-600 text-white"
                          : "border-green-500 text-green-600"
                      }`}
                    >
                      {acc.charAt(0).toUpperCase() + acc.slice(1)}
                    </Button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
