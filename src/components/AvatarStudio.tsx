import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Undo2, Redo2, Save, Check, Sparkles, Shuffle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AvatarPreview3D from './AvatarPreview3D';

interface AvatarStudioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (avatarUrl: string) => void;
}

const AvatarStudio = ({ open, onOpenChange, onSave }: AvatarStudioProps) => {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('features');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [avatar, setAvatar] = useState({
    skin: 'light',
    hair: 'short',
    hairColor: 'brown',
    eyes: 'almond',
    eyeColor: 'brown',
    nose: 'medium',
    mouth: 'smile',
    facialHair: 'none',
    outfit: 'casual',
    outfitColor: 'blue',
    accessories: 'none'
  });

  const skinTones = [
    { id: 'light', name: 'Light', color: '#FFE0BD' },
    { id: 'fair', name: 'Fair', color: '#F1C27D' },
    { id: 'medium', name: 'Medium', color: '#C68642' },
    { id: 'olive', name: 'Olive', color: '#8D5524' },
    { id: 'brown', name: 'Brown', color: '#6B4423' },
    { id: 'deep', name: 'Deep', color: '#4A2C1A' }
  ];

  const hairStyles = [
    { id: 'short', name: 'Short' },
    { id: 'long', name: 'Long' },
    { id: 'curly', name: 'Curly' },
    { id: 'afro', name: 'Afro' },
    { id: 'braids', name: 'Braids' },
    { id: 'buzz', name: 'Buzz Cut' },
    { id: 'wavy', name: 'Wavy' },
    { id: 'straight', name: 'Straight' },
    { id: 'ponytail', name: 'Ponytail' },
    { id: 'bun', name: 'Bun' }
  ];

  const hairColors = [
    { id: 'black', name: 'Black', color: '#000000' },
    { id: 'brown', name: 'Brown', color: '#4A2C1A' },
    { id: 'blonde', name: 'Blonde', color: '#F5DEB3' },
    { id: 'red', name: 'Red', color: '#8B0000' },
    { id: 'blue', name: 'Blue', color: '#0000FF' },
    { id: 'pink', name: 'Pink', color: '#FF69B4' },
    { id: 'purple', name: 'Purple', color: '#800080' },
    { id: 'green', name: 'Green', color: '#00FF00' }
  ];

  const eyeShapes = [
    { id: 'almond', name: 'Almond' },
    { id: 'round', name: 'Round' },
    { id: 'sleepy', name: 'Sleepy' }
  ];

  const eyeColors = [
    { id: 'brown', name: 'Brown', color: '#4A2C1A' },
    { id: 'blue', name: 'Blue', color: '#0000FF' },
    { id: 'green', name: 'Green', color: '#00FF00' },
    { id: 'hazel', name: 'Hazel', color: '#8E7618' },
    { id: 'gray', name: 'Gray', color: '#808080' }
  ];

  const outfits = [
    { id: 'casual', name: 'Casual' },
    { id: 'sporty', name: 'Sporty' },
    { id: 'formal', name: 'Formal' },
    { id: 'party', name: 'Party' },
    { id: 'streetwear', name: 'Streetwear' },
    { id: 'fantasy', name: 'Fantasy' }
  ];

  const handleOptionSelect = (category: string, value: string) => {
    const newAvatar = { ...avatar, [category]: value };
    setAvatar(newAvatar);
    const newHistory = [...history.slice(0, historyIndex + 1), JSON.stringify(newAvatar)];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAvatar(JSON.parse(history[historyIndex - 1]));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAvatar(JSON.parse(history[historyIndex + 1]));
    }
  };

  const handleRandomize = () => {
    const randomAvatar = {
      skin: skinTones[Math.floor(Math.random() * skinTones.length)].id,
      hair: hairStyles[Math.floor(Math.random() * hairStyles.length)].id,
      hairColor: hairColors[Math.floor(Math.random() * hairColors.length)].id,
      eyes: eyeShapes[Math.floor(Math.random() * eyeShapes.length)].id,
      eyeColor: eyeColors[Math.floor(Math.random() * eyeColors.length)].id,
      nose: 'medium',
      mouth: 'smile',
      facialHair: 'none',
      outfit: outfits[Math.floor(Math.random() * outfits.length)].id,
      outfitColor: 'blue',
      accessories: 'none'
    };
    setAvatar(randomAvatar);
    toast({
      title: "Random avatar!",
      description: "New look generated ✨",
    });
  };

  const handleSave = () => {
    const avatarData = JSON.stringify(avatar);
    onSave(avatarData);
    toast({
      title: "Avatar saved!",
      description: "Your custom avatar has been saved.",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">Avatar Studio</DialogTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
              >
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
              >
                <Redo2 className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRandomize}
              >
                <Shuffle className="w-4 h-4 mr-2" />
                Randomize
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/3 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center p-0">
            <div className="relative w-full h-full">
              <AvatarPreview3D avatar={avatar} />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-center text-xs text-muted-foreground">
                Live 3D Preview
              </div>
            </div>
          </div>

          <div className="flex-1 p-6">
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="clothes">Clothes</TabsTrigger>
                <TabsTrigger value="fashion">Fashion</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1">
                <TabsContent value="features" className="space-y-6 mt-0">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Skin Tone</h3>
                    <div className="grid grid-cols-6 gap-3">
                      {skinTones.map((tone) => (
                        <button
                          key={tone.id}
                          onClick={() => handleOptionSelect('skin', tone.id)}
                          className={`relative h-16 rounded-lg border-2 transition-all ${
                            avatar.skin === tone.id
                              ? 'border-primary ring-2 ring-primary/20'
                              : 'border-border hover:border-primary/50'
                          }`}
                          style={{ backgroundColor: tone.color }}
                        >
                          {avatar.skin === tone.id && (
                            <Check className="absolute top-1 right-1 w-4 h-4 text-white drop-shadow" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Hair Style</h3>
                    <div className="grid grid-cols-5 gap-3">
                      {hairStyles.map((style) => (
                        <Card
                          key={style.id}
                          onClick={() => handleOptionSelect('hair', style.id)}
                          className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                            avatar.hair === style.id
                              ? 'border-2 border-primary ring-2 ring-primary/20'
                              : 'border hover:border-primary/50'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-sm font-medium">{style.name}</div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Hair Color</h3>
                    <div className="grid grid-cols-8 gap-3">
                      {hairColors.map((color) => (
                        <button
                          key={color.id}
                          onClick={() => handleOptionSelect('hairColor', color.id)}
                          className={`relative h-12 rounded-lg border-2 transition-all ${
                            avatar.hairColor === color.id
                              ? 'border-primary ring-2 ring-primary/20'
                              : 'border-border hover:border-primary/50'
                          }`}
                          style={{ backgroundColor: color.color }}
                        >
                          {avatar.hairColor === color.id && (
                            <Check className="absolute top-1 right-1 w-3 h-3 text-white drop-shadow" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Eye Shape</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {eyeShapes.map((shape) => (
                        <Card
                          key={shape.id}
                          onClick={() => handleOptionSelect('eyes', shape.id)}
                          className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                            avatar.eyes === shape.id
                              ? 'border-2 border-primary ring-2 ring-primary/20'
                              : 'border hover:border-primary/50'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-sm font-medium">{shape.name}</div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Eye Color</h3>
                    <div className="grid grid-cols-5 gap-3">
                      {eyeColors.map((color) => (
                        <button
                          key={color.id}
                          onClick={() => handleOptionSelect('eyeColor', color.id)}
                          className={`relative h-12 rounded-lg border-2 transition-all ${
                            avatar.eyeColor === color.id
                              ? 'border-primary ring-2 ring-primary/20'
                              : 'border-border hover:border-primary/50'
                          }`}
                          style={{ backgroundColor: color.color }}
                        >
                          {avatar.eyeColor === color.id && (
                            <Check className="absolute top-1 right-1 w-3 h-3 text-white drop-shadow" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="clothes" className="space-y-6 mt-0">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Outfits</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {outfits.map((outfit) => (
                        <Card
                          key={outfit.id}
                          onClick={() => handleOptionSelect('outfit', outfit.id)}
                          className={`p-6 cursor-pointer transition-all hover:shadow-md ${
                            avatar.outfit === outfit.id
                              ? 'border-2 border-primary ring-2 ring-primary/20'
                              : 'border hover:border-primary/50'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-base font-medium">{outfit.name}</div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="fashion" className="space-y-6 mt-0">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Pre-made Outfits</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {outfits.map((outfit) => (
                        <Card
                          key={outfit.id}
                          onClick={() => handleOptionSelect('outfit', outfit.id)}
                          className={`p-8 cursor-pointer transition-all hover:shadow-md ${
                            avatar.outfit === outfit.id
                              ? 'border-2 border-primary ring-2 ring-primary/20'
                              : 'border hover:border-primary/50'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-lg font-medium mb-2">{outfit.name}</div>
                            <Badge variant="secondary">Complete Look</Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AvatarStudio;