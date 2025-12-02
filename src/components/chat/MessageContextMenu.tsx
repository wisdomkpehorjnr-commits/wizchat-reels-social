import { Pin, Copy, Forward, Reply, Trash2, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Message } from '@/types';

interface MessageContextMenuProps {
  message: Message;
  isOwn: boolean;
  canEdit: boolean;
  onPin: () => void;
  onCopy: () => void;
  onForward: () => void;
  onReply: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onClose: () => void;
}

const MessageContextMenu = ({
  message,
  isOwn,
  canEdit,
  onPin,
  onCopy,
  onForward,
  onReply,
  onDelete,
  onEdit,
  onClose,
}: MessageContextMenuProps) => {
  const menuItems = [
    { icon: Pin, label: 'Pin', action: onPin, color: 'text-foreground' },
    { icon: Copy, label: 'Copy', action: onCopy, color: 'text-foreground' },
    { icon: Forward, label: 'Forward', action: onForward, color: 'text-foreground' },
    { icon: Reply, label: 'Reply', action: onReply, color: 'text-foreground' },
    ...(isOwn && canEdit ? [{ icon: Edit3, label: 'Edit', action: onEdit, color: 'text-foreground' }] : []),
    { icon: Trash2, label: 'Delete', action: onDelete, color: 'text-destructive' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 bg-background border-2 border-primary/20 rounded-2xl shadow-xl p-2 flex gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {menuItems.map((item, index) => (
            <Button
              key={index}
              variant="ghost"
              size="icon"
              onClick={() => {
                item.action();
                onClose();
              }}
              className={`flex flex-col items-center gap-1 h-auto py-2 px-3 ${item.color}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </Button>
          ))}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MessageContextMenu;
