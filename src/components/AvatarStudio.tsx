import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Undo2, Redo2, Save, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AvatarStudioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (avatarUrl: string) => void;
}

const AvatarStudio = ({ open, onOpenChange, onSave }: AvatarStudioProps) => {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('face');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [avatar, setAvatar] = useState({
    skin: 'light',
    hair: 'short',
    hairColor: 'brown',
    eyes: 'normal',
    eyeColor: 'brown',
    nose: 'medium',
    mouth: 'smile',
    facialHair: 'none',
    outfit: 'casual',
    outfitColor: 'blue',
    accessories: 'none'
  });

  const options = {
    skin: [
      { id: 'light', label: 'Light', color: '#fde3cc' },
      { id: 'medium', label: 'Medium', color: '#d1a684' },
      { id: 'tan', label: 'Tan', color: '#a67c52' },
      { id: 'dark', label: 'Dark', color: '#8d5524' },
      { id: 'deep', label: 'Deep', color: '#4a2511' }
    ],
    hair: [
      { id: 'short', label: 'Short', emoji: '🎩' },
      { id: 'medium', label: 'Medium', emoji: '👱' },
      { id: 'long', label: 'Long', emoji: '👩' },
      { id: 'curly', label: 'Curly', emoji: '🦱' },
      { id: 'bald', label: 'Bald', emoji: '👨‍🦲' },
      { id: 'ponytail', label: 'Ponytail', emoji: '👩‍🦰' }
    ],
    hairColor: [
      { id: 'black', label: 'Black', color: '#1a1a1a' },
      { id: 'brown', label: 'Brown', color: '#6b4423' },
      { id: 'blonde', label: 'Blonde', color: '#f5d76e' },
      { id: 'red', label: 'Red', color: '#c93305' },
      { id: 'gray', label: 'Gray', color: '#9e9e9e' },
      { id: 'blue', label: 'Blue', color: '#4a90e2' },
      { id: 'pink', label: 'Pink', color: '#ff69b4' },
      { id: 'purple', label: 'Purple', color: '#9370db' }
    ],
    eyes: [
      { id: 'normal', label: 'Normal', emoji: '👁️' },
      { id: 'round', label: 'Round', emoji: '⭕' },
      { id: 'almond', label: 'Almond', emoji: '👀' },
      { id: 'sleepy', label: 'Sleepy', emoji: '😴' },
      { id: 'wink', label: 'Wink', emoji: '😉' }
    ],
    eyeColor: [
      { id: 'brown', label: 'Brown', color: '#6b4423' },
      { id: 'blue', label: 'Blue', color: '#4a90e2' },
      { id: 'green', label: 'Green', color: '#7cb342' },
      { id: 'hazel', label: 'Hazel', color: '#a0826d' },
      { id: 'gray', label: 'Gray', color: '#9e9e9e' }
    ],
    nose: [
      { id: 'small', label: 'Small', emoji: '👃' },
      { id: 'medium', label: 'Medium', emoji: '👃' },
      { id: 'large', label: 'Large', emoji: '👃' },
      { id: 'button', label: 'Button', emoji: '🔘' }
    ],
    mouth: [
      { id: 'smile', label: 'Smile', emoji: '😊' },
      { id: 'neutral', label: 'Neutral', emoji: '😐' },
      { id: 'grin', label: 'Grin', emoji: '😁' },
      { id: 'smirk', label: 'Smirk', emoji: '😏' }
    ],
    facialHair: [
      { id: 'none', label: 'None', emoji: '🚫' },
      { id: 'beard', label: 'Beard', emoji: '🧔' },
      { id: 'goatee', label: 'Goatee', emoji: '🧔‍♂️' },
      { id: 'mustache', label: 'Mustache', emoji: '👨' }
    ],
    outfit: [
      { id: 'casual', label: 'Casual', emoji: '👕' },
      { id: 'formal', label: 'Formal', emoji: '🤵' },
      { id: 'sporty', label: 'Sporty', emoji: '⚽' },
      { id: 'hoodie', label: 'Hoodie', emoji: '🧥' },
      { id: 'dress', label: 'Dress', emoji: '👗' },
      { id: 'suit', label: 'Suit', emoji: '🎩' }
    ],
    outfitColor: [
      { id: 'black', label: 'Black', color: '#1a1a1a' },
      { id: 'white', label: 'White', color: '#ffffff' },
      { id: 'blue', label: 'Blue', color: '#4a90e2' },
      { id: 'red', label: 'Red', color: '#e74c3c' },
      { id: 'green', label: 'Green', color: '#7cb342' },
      { id: 'yellow', label: 'Yellow', color: '#f5d76e' },
      { id: 'purple', label: 'Purple', color: '#9370db' },
      { id: 'pink', label: 'Pink', color: '#ff69b4' }
    ],
    accessories: [
      { id: 'none', label: 'None', emoji: '🚫' },
      { id: 'glasses', label: 'Glasses', emoji: '👓' },
      { id: 'sunglasses', label: 'Sunglasses', emoji: '🕶️' },
      { id: 'hat', label: 'Hat', emoji: '🎩' },
      { id: 'headphones', label: 'Headphones', emoji: '🎧' },
      { id: 'earrings', label: 'Earrings', emoji: '💎' }
    ]
  };

  const handleOptionSelect = (category: string, value: string) => {
    const newAvatar = { ...avatar, [category]: value };
    setAvatar(newAvatar);
    
    // Add to history
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

  const handleSave = () => {
    // In a real app, this would generate/upload an avatar image
    const avatarData = JSON.stringify(avatar);
    onSave(avatarData);
    toast({
      title: "Avatar saved!",
      description: "Your custom avatar has been saved to your library.",
    });
  };

  const handleUseAsProfilePic = () => {
    handleSave();
    toast({
      title: "Profile picture updated!",
      description: "Your avatar is now your profile picture.",
    });
    onOpenChange(false);
  };

  const renderOptions = (category: keyof typeof options) => {
    const opts = options[category] as any[];
    
    return (
      <div className="grid grid-cols-4 gap-3">
        {opts.map((option) => (
          <Card
            key={option.id}
            className={`p-4 cursor-pointer hover:border-primary transition-all ${
              avatar[category as keyof typeof avatar] === option.id ? 'border-primary border-2' : ''
            }`}
            onClick={() => handleOptionSelect(category, option.id)}
          >
            <div className="flex flex-col items-center gap-2">
              {option.color ? (
                <div 
                  className="w-12 h-12 rounded-full border-2"
                  style={{ backgroundColor: option.color }}
                />
              ) : (
                <span className="text-3xl">{option.emoji}</span>
              )}
              <span className="text-xs text-center">{option.label}</span>
              {avatar[category as keyof typeof avatar] === option.id && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Avatar Studio</span>
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
              <Button variant="outline" size="sm" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button size="sm" onClick={handleUseAsProfilePic}>
                Use as Profile Pic
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[300px,1fr] gap-6 flex-1 overflow-hidden">
          {/* Preview */}
          <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 bg-muted/30">
            <div className="text-center space-y-4">
              <div className="text-8xl">👤</div>
              <div className="space-y-2">
                <Badge variant="outline">{avatar.hair} hair</Badge>
                <Badge variant="outline">{avatar.outfit}</Badge>
                <Badge variant="outline">{avatar.accessories}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Avatar Preview
              </p>
            </div>
          </div>

          {/* Customization Options */}
          <ScrollArea className="h-full">
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid grid-cols-3 w-full mb-4">
                <TabsTrigger value="face">Face</TabsTrigger>
                <TabsTrigger value="wardrobe">Wardrobe</TabsTrigger>
                <TabsTrigger value="fashion">Fashion</TabsTrigger>
              </TabsList>

              <TabsContent value="face" className="space-y-6">
                <div className="space-y-3">
                  <h3 className="font-semibold">Skin Tone</h3>
                  {renderOptions('skin')}
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold">Hair Style</h3>
                  {renderOptions('hair')}
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold">Hair Color</h3>
                  {renderOptions('hairColor')}
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold">Eyes</h3>
                  {renderOptions('eyes')}
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold">Eye Color</h3>
                  {renderOptions('eyeColor')}
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold">Nose</h3>
                  {renderOptions('nose')}
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold">Mouth</h3>
                  {renderOptions('mouth')}
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold">Facial Hair</h3>
                  {renderOptions('facialHair')}
                </div>
              </TabsContent>

              <TabsContent value="wardrobe" className="space-y-6">
                <div className="space-y-3">
                  <h3 className="font-semibold">Outfit Style</h3>
                  {renderOptions('outfit')}
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold">Outfit Color</h3>
                  {renderOptions('outfitColor')}
                </div>
              </TabsContent>

              <TabsContent value="fashion" className="space-y-6">
                <div className="space-y-3">
                  <h3 className="font-semibold">Accessories</h3>
                  {renderOptions('accessories')}
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AvatarStudio;