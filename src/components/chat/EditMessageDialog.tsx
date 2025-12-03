import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { motion } from 'framer-motion';

interface EditMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentContent: string;
  onSave: (newContent: string) => void;
}

const EditMessageDialog = ({
  isOpen,
  onClose,
  currentContent,
  onSave,
}: EditMessageDialogProps) => {
  const [editedContent, setEditedContent] = useState(currentContent);

  const handleSave = () => {
    if (editedContent.trim() && editedContent !== currentContent) {
      onSave(editedContent.trim());
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-sm bg-background border-2 border-primary/20 p-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="text-lg font-semibold text-foreground">Edit Message</DialogTitle>
          </DialogHeader>
          <div className="p-4 pt-2">
            <Input
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              placeholder="Edit your message..."
              className="w-full border-2 border-primary/30 focus:border-primary"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                }
              }}
            />
          </div>
          <DialogFooter className="p-4 pt-0 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-primary/30"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              className="flex-1 bg-primary text-primary-foreground"
              onClick={handleSave}
              disabled={!editedContent.trim() || editedContent === currentContent}
            >
              Save
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default EditMessageDialog;
