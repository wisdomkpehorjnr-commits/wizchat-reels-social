import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface DeleteMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
  isOwn: boolean;
}

const DeleteMessageDialog = ({
  isOpen,
  onClose,
  onDeleteForMe,
  onDeleteForEveryone,
  isOwn,
}: DeleteMessageDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-2 border-primary/20">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 20 }}
        >
          <DialogHeader>
            <DialogTitle>Delete Message?</DialogTitle>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 pt-4">
            <Button
              variant="outline"
              className="w-full border-primary/20 hover:bg-destructive/10"
              onClick={() => {
                onDeleteForMe();
                onClose();
              }}
            >
              Delete for me only
            </Button>
            {isOwn && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  onDeleteForEveryone();
                  onClose();
                }}
              >
                Delete for everyone
              </Button>
            )}
            <Button
              variant="ghost"
              className="w-full"
              onClick={onClose}
            >
              Cancel
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteMessageDialog;
