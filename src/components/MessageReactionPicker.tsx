import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface MessageReactionPickerProps {
  onReactionSelect: (emoji: string) => void;
  children: React.ReactNode;
}

const MessageReactionPicker = ({ onReactionSelect, children }: MessageReactionPickerProps) => {
  const [open, setOpen] = useState(false);

  const quickReactions = ['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '👏'];

  const handleReactionClick = (emoji: string) => {
    onReactionSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2 max-w-[calc(100vw-2rem)]" align="center" side="top">
        <div className="grid grid-cols-4 sm:flex gap-1">
          {quickReactions.map((emoji) => (
            <Button
              key={emoji}
              variant="ghost"
              size="sm"
              onClick={() => handleReactionClick(emoji)}
              className="text-lg sm:text-xl hover:bg-secondary h-9 w-9 sm:h-10 sm:w-10 p-0"
            >
              {emoji}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default MessageReactionPicker;
