
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';
import { dataService } from '@/services/dataService';
import { CustomEmoji } from '@/types';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

const EmojiPicker = ({ onEmojiSelect }: EmojiPickerProps) => {
  const [customEmojis, setCustomEmojis] = useState<CustomEmoji[]>([]);
  const [open, setOpen] = useState(false);

  // Default emoji set
  const defaultEmojis = ['😀', '😂', '🥰', '😍', '🤔', '😢', '😡', '👍', '👎', '❤️', '🔥', '💯'];

  useEffect(() => {
    loadCustomEmojis();
  }, []);

  const loadCustomEmojis = async () => {
    try {
      const emojis = await dataService.getCustomEmojis();
      setCustomEmojis(emojis);
    } catch (error) {
      console.error('Error loading custom emojis:', error);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Default Emojis</h4>
            <div className="grid grid-cols-6 gap-2">
              {defaultEmojis.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEmojiClick(emoji)}
                  className="text-lg hover:bg-secondary"
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </div>

          {customEmojis.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Custom Emojis</h4>
              <div className="grid grid-cols-6 gap-2">
                {customEmojis.map((emoji) => (
                  <Button
                    key={emoji.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEmojiClick(emoji.name)}
                    className="p-1 hover:bg-secondary"
                  >
                    <img
                      src={emoji.imageUrl}
                      alt={emoji.name}
                      className="w-6 h-6 object-contain"
                    />
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;
