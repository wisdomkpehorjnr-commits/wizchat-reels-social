import { Pin, Copy, Forward, Reply, Trash2, Edit3, PinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Message } from '@/types';

interface MessageContextMenuProps {
  message: Message;
  isOwn: boolean;
  canEdit: boolean;
  isPinned?: boolean;
  selectedCount?: number;
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
  isPinned = false,
  selectedCount = 1,
  onPin,
  onCopy,
  onForward,
  onReply,
  onDelete,
  onEdit,
  onClose,
}: MessageContextMenuProps) => {
  // For multiple selection, only show copy, forward, delete
  const isMultipleSelected = selectedCount > 1;
  
  const menuItems = isMultipleSelected
    ? [
        { icon: Copy, label: 'Copy', action: onCopy, color: 'text-foreground' },
        { icon: Forward, label: 'Forward', action: onForward, color: 'text-foreground' },
        { icon: Trash2, label: 'Delete', action: onDelete, color: 'text-destructive' },
      ]
    : [
        { icon: isPinned ? PinOff : Pin, label: isPinned ? 'Unpin' : 'Pin', action: onPin, color: 'text-foreground' },
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
          className="fixed top-2 left-1/2 -translate-x-1/2 bg-background border-2 border-primary/20 rounded-2xl shadow-xl p-1.5 flex items-center gap-0.5 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          {menuItems.map((item, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              onClick={() => {
                item.action();
                onClose();
              }}
              className={`flex flex-col items-center gap-0.5 h-auto py-1.5 px-2 min-w-[44px] ${item.color}`}
            >
              <item.icon className="w-4 h-4" />
              <span className="text-[9px] whitespace-nowrap">{item.label}</span>
            </Button>
          ))}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MessageContextMenu;
