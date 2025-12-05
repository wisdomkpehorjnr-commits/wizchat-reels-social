import { Pin, Copy, Forward, Reply, Trash2, Edit3, PinOff, CheckSquare } from 'lucide-react';
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
  onDeleteMultiple?: () => void;
  onCopyMultiple?: () => void;
  onSelect?: () => void;
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
  onDeleteMultiple,
  onCopyMultiple,
  onSelect,
}: MessageContextMenuProps) => {
  // For multiple selection, only show copy, forward, delete (hide pin, reply, edit, select)
  const isMultipleSelected = selectedCount > 1;
  
  const menuItems = isMultipleSelected
    ? [
        { icon: Copy, label: 'Copy', action: onCopyMultiple || onCopy, color: 'text-foreground' },
        { icon: Forward, label: 'Forward', action: onForward, color: 'text-foreground' },
        { icon: Trash2, label: 'Delete', action: onDeleteMultiple || onDelete, color: 'text-destructive' },
      ]
    : [
        { icon: isPinned ? PinOff : Pin, label: isPinned ? 'Unpin' : 'Pin', action: onPin, color: 'text-foreground' },
        { icon: Reply, label: 'Reply', action: onReply, color: 'text-foreground' },
        { icon: Forward, label: 'Forward', action: onForward, color: 'text-foreground' },
        ...(isOwn && canEdit ? [{ icon: Edit3, label: 'Edit', action: onEdit, color: 'text-foreground' }] : []),
        { icon: Copy, label: 'Copy', action: onCopy, color: 'text-foreground' },
        { icon: Trash2, label: 'Delete', action: onDelete, color: 'text-destructive' },
        ...(onSelect ? [{ icon: CheckSquare, label: 'Select', action: onSelect, color: 'text-foreground' }] : []),
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
          initial={{ y: -20, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -20, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-3 left-2 right-2 mx-auto max-w-fit bg-background/95 backdrop-blur-md border border-border rounded-2xl shadow-xl p-1 flex items-center gap-0.5 z-[60]"
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
              className={`flex flex-col items-center gap-0.5 h-auto py-1.5 px-2 min-w-[44px] rounded-xl hover:bg-muted/80 ${item.color}`}
            >
              <item.icon className="w-4 h-4" />
              <span className="text-[9px] whitespace-nowrap font-medium leading-tight">{item.label}</span>
            </Button>
          ))}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MessageContextMenu;
