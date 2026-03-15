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
  Clock,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const [isOpen, setIsOpen] = useState(false);
  const [muteDialog, setMuteDialog] = useState(false);
  const [disappearingDialog, setDisappearingDialog] = useState(false);
  const [clearChatDialog, setClearChatDialog] = useState(false);
  const [wallpaperDialog, setWallpaperDialog] = useState(false);

  const menuItems = [
    { icon: BellOff, label: 'Mute Notifications', onClick: () => { setMuteDialog(true); setIsOpen(false); } },
    { icon: Timer, label: 'Disappearing Messages', onClick: () => { setDisappearingDialog(true); setIsOpen(false); } },
    { icon: Star, label: 'Add to Favorites', onClick: () => { onFavorite(); setIsOpen(false); } },
    { icon: ImageIcon, label: 'Chat Wallpaper', onClick: () => { setWallpaperDialog(true); setIsOpen(false); } },
    { icon: Download, label: 'Export Chat', onClick: () => { onExport(); setIsOpen(false); } },
    { icon: Info, label: 'View Profile', onClick: () => { onViewProfile(); setIsOpen(false); } },
    { icon: Trash2, label: 'Clear Chat', onClick: () => { setClearChatDialog(true); setIsOpen(false); }, destructive: true },
    { icon: Ban, label: 'Block Contact', onClick: () => { onBlock(); setIsOpen(false); }, destructive: true },
    { icon: AlertTriangle, label: 'Report Contact', onClick: () => { onReport(); setIsOpen(false); }, destructive: true },
  ];

  return (
    <>
      {/* Trigger */}
      <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
        <div className="flex flex-col gap-0.5">
          <div className="w-1 h-1 rounded-full bg-current" />
          <div className="w-1 h-1 rounded-full bg-current" />
          <div className="w-1 h-1 rounded-full bg-current" />
        </div>
      </Button>

      {/* Glass Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[100]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            {/* Menu Card */}
            <motion.div
              className="absolute top-16 right-4 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/20 dark:border-white/10 overflow-hidden shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--background) / 0.85), hsl(var(--background) / 0.75))',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
              }}
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Chat Settings</span>
                <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-muted/50 transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Items */}
              <div className="py-1.5 max-h-[60vh] overflow-y-auto">
                {menuItems.map((item, i) => (
                  <motion.button
                    key={item.label}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-primary/10 active:bg-primary/20 ${
                      item.destructive ? 'text-destructive' : 'text-foreground'
                    }`}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    onClick={item.onClick}
                  >
                    <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mute Dialog */}
      <GlassDialog open={muteDialog} onClose={() => setMuteDialog(false)} title="Mute Notifications">
        {['8 hours', '1 week', '1 year', 'Always'].map((duration) => (
          <GlassButton key={duration} icon={Clock} label={duration} onClick={() => { onMute(duration); setMuteDialog(false); }} />
        ))}
      </GlassDialog>

      {/* Disappearing Messages Dialog */}
      <GlassDialog open={disappearingDialog} onClose={() => setDisappearingDialog(false)} title="Disappearing Messages">
        {['Off', '24 hours', '1 week', '90 days'].map((duration) => (
          <GlassButton key={duration} icon={Timer} label={duration} onClick={() => { onDisappearingMessages(duration); setDisappearingDialog(false); }} />
        ))}
      </GlassDialog>

      {/* Clear Chat Confirmation */}
      <GlassDialog open={clearChatDialog} onClose={() => setClearChatDialog(false)} title="Clear Chat">
        <p className="text-sm text-muted-foreground mb-4">
          Do you want to clear this entire chat? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setClearChatDialog(false)}
            className="flex-1 border-border/50 hover:bg-muted/50"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => { onClear(); setClearChatDialog(false); }}
            className="flex-1"
          >
            Clear
          </Button>
        </div>
      </GlassDialog>

      {/* Wallpaper Dialog */}
      <GlassDialog open={wallpaperDialog} onClose={() => setWallpaperDialog(false)} title="Chat Wallpaper">
        <div className="grid grid-cols-3 gap-2 mb-3">
          {['#1a1a2e', '#16213e', '#0f3460', '#533483', '#2b2d42', '#264653'].map((color) => (
            <button
              key={color}
              className="aspect-square rounded-xl border-2 border-transparent hover:border-primary transition-all hover:scale-105"
              style={{ backgroundColor: color }}
              onClick={() => {
                document.documentElement.style.setProperty('--chat-wallpaper', color);
                localStorage.setItem('chat-wallpaper', color);
                window.dispatchEvent(new CustomEvent('chat-wallpaper-change', { detail: color }));
                setWallpaperDialog(false);
              }}
            />
          ))}
        </div>
        <Button
          variant="outline"
          className="w-full border-border/50"
          onClick={() => {
            document.documentElement.style.removeProperty('--chat-wallpaper');
            localStorage.removeItem('chat-wallpaper');
            setWallpaperDialog(false);
          }}
        >
          Reset to Default
        </Button>
      </GlassDialog>
    </>
  );
};

/* Reusable Glass Dialog */
const GlassDialog = ({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <motion.div
          className="relative w-full max-w-sm rounded-2xl border border-white/15 dark:border-white/10 overflow-hidden shadow-2xl p-5"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--background) / 0.92), hsl(var(--background) / 0.85))',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-muted/50 transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {children}
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

/* Reusable Glass Button */
const GlassButton = ({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) => (
  <button
    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left text-foreground font-medium text-sm transition-all hover:bg-primary/10 active:bg-primary/20 border border-transparent hover:border-primary/20"
    onClick={onClick}
  >
    <Icon className="w-5 h-5 flex-shrink-0 text-primary" />
    <span>{label}</span>
  </button>
);

export default ChatSettingsMenu;
