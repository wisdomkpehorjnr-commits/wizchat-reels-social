import { useState } from 'react';
import { 
  BellOff, 
  Trash2, 
  Download, 
  Ban, 
  AlertTriangle, 
  Star, 
  Info, 
  Timer,
  Clock
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User } from '@/types';

interface ChatSettingsMenuProps {
  chatUser: User;
  onMute: (duration: string) => void;
  onClear: () => void;
  onExport: () => void;
  onBlock: () => void;
  onReport: () => void;
  onFavorite: () => void;
  onViewProfile: () => void;
  onDisappearingMessages: (duration: string) => void;
}

const ChatSettingsMenu = ({
  chatUser,
  onMute,
  onClear,
  onExport,
  onBlock,
  onReport,
  onFavorite,
  onViewProfile,
  onDisappearingMessages,
}: ChatSettingsMenuProps) => {
  const [muteDialog, setMuteDialog] = useState(false);
  const [disappearingDialog, setDisappearingDialog] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <div className="flex flex-col gap-0.5">
              <div className="w-1 h-1 rounded-full bg-current" />
              <div className="w-1 h-1 rounded-full bg-current" />
              <div className="w-1 h-1 rounded-full bg-current" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setMuteDialog(true)}>
            <BellOff className="w-4 h-4 mr-2" />
            Mute Messages
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onClear} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Chat
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExport}>
            <Download className="w-4 h-4 mr-2" />
            Export Chat
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onBlock} className="text-destructive">
            <Ban className="w-4 h-4 mr-2" />
            Block Contact
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onReport} className="text-destructive">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Report Contact
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onFavorite}>
            <Star className="w-4 h-4 mr-2" />
            Add to Favorites
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onViewProfile}>
            <Info className="w-4 h-4 mr-2" />
            View Profile Info
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDisappearingDialog(true)}>
            <Timer className="w-4 h-4 mr-2" />
            Disappearing Messages
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mute Dialog */}
      <Dialog open={muteDialog} onOpenChange={setMuteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mute Messages</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-4">
            {['8 hours', '1 week', '1 year', 'Always'].map((duration) => (
              <Button
                key={duration}
                variant="outline"
                className="justify-start border-primary/20 hover:bg-primary/10"
                onClick={() => {
                  onMute(duration);
                  setMuteDialog(false);
                }}
              >
                <Clock className="w-4 h-4 mr-2" />
                {duration}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Disappearing Messages Dialog */}
      <Dialog open={disappearingDialog} onOpenChange={setDisappearingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Message Timer</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-4">
            {['Off', '24 hours', '1 week', '90 days'].map((duration) => (
              <Button
                key={duration}
                variant="outline"
                className="justify-start border-primary/20 hover:bg-primary/10"
                onClick={() => {
                  onDisappearingMessages(duration);
                  setDisappearingDialog(false);
                }}
              >
                <Timer className="w-4 h-4 mr-2" />
                {duration}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChatSettingsMenu;
