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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [clearChatDialog, setClearChatDialog] = useState(false);

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
        <DropdownMenuContent align="end" className="w-56 max-w-[calc(100vw-2rem)]">
          <DropdownMenuItem onClick={() => setMuteDialog(true)}>
            <BellOff className="w-4 h-4 mr-2" />
            Mute Messages
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setClearChatDialog(true)} className="text-destructive">
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
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md bg-background/95 backdrop-blur-md border-2 border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Mute Messages</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-4">
            {['8 hours', '1 week', '1 year', 'Always'].map((duration) => (
              <Button
                key={duration}
                variant="outline"
                className="justify-start border-primary/20 hover:bg-primary/10 h-12 text-base font-medium"
                onClick={() => {
                  onMute(duration);
                  setMuteDialog(false);
                }}
              >
                <Clock className="w-5 h-5 mr-3 flex-shrink-0" />
                <span className="text-foreground">{duration}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Disappearing Messages Dialog */}
      <Dialog open={disappearingDialog} onOpenChange={setDisappearingDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md bg-background/95 backdrop-blur-md border-2 border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Message Timer</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-4">
            {['Off', '24 hours', '1 week', '90 days'].map((duration) => (
              <Button
                key={duration}
                variant="outline"
                className="justify-start border-primary/20 hover:bg-primary/10 h-12 text-base font-medium"
                onClick={() => {
                  onDisappearingMessages(duration);
                  setDisappearingDialog(false);
                }}
              >
                <Timer className="w-5 h-5 mr-3 flex-shrink-0" />
                <span className="text-foreground">{duration}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear Chat Confirmation Dialog */}
      <Dialog open={clearChatDialog} onOpenChange={setClearChatDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md bg-background/95 backdrop-blur-md border-2 border-primary/20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">Clear Chat</DialogTitle>
              <DialogDescription className="text-base pt-2">
                Do you want to clear this chat? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 pt-6">
              <Button
                variant="outline"
                onClick={() => setClearChatDialog(false)}
                className="flex-1 border-primary/20 hover:bg-muted"
              >
                No
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  onClear();
                  setClearChatDialog(false);
                }}
                className="flex-1"
              >
                Yes
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChatSettingsMenu;
