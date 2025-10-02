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
      <PopoverContent className="w-auto p-2" align="start">
        <div className="flex gap-1">
          {quickReactions.map((emoji) => (
            <Button
              key={emoji}
              variant="ghost"
              size="sm"
              onClick={() => handleReactionClick(emoji)}
              className="text-xl hover:bg-secondary h-10 w-10 p-0"
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
