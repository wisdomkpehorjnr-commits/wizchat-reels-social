import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail, Phone } from 'lucide-react';

interface ContactSupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUPPORT_EMAIL = "wisdomkpehorjnr@gmail.com";
const SUPPORT_PHONE = "0503370554";

const ContactSupportDialog = ({ open, onOpenChange }: ContactSupportDialogProps) => {
  const handleEmailClick = () => {
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=Support Request&body=Hi, I need help with...`;
    onOpenChange(false);
  };

  const handleCallClick = () => {
    window.location.href = `tel:${SUPPORT_PHONE}`;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contact Support</DialogTitle>
          <DialogDescription>
            Get help from our support team
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              📧 Email: {SUPPORT_EMAIL}
            </p>
            <p className="text-sm text-muted-foreground">
              📞 Call: {SUPPORT_PHONE}
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Tap to open email or call directly
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={handleEmailClick} className="w-full gap-2">
              <Mail className="w-4 h-4" />
              Email Support
            </Button>
            <Button onClick={handleCallClick} variant="outline" className="w-full gap-2">
              <Phone className="w-4 h-4" />
              Call Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactSupportDialog;
