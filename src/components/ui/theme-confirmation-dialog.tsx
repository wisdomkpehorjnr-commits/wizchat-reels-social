import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ThemeConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

const ThemeConfirmationDialog = ({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = "Yes",
  cancelText = "No",
  variant = "default"
}: ThemeConfirmationDialogProps) => {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-background border-2 border-green-500">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-gray-300 dark:border-gray-600">
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            className={variant === "destructive" 
              ? "bg-red-600 hover:bg-red-700 text-white" 
              : "bg-green-600 hover:bg-green-700 text-white"
            }
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ThemeConfirmationDialog;

