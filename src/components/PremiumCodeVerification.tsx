import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PremiumCodeVerificationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
  featureName: string;
}

const VALID_CODE = "WIZCHAT1.";
const SUPPORT_EMAIL = "wisdomkpehorjnr@gmail.com";
const SUPPORT_PHONE = "0503370554";

const PremiumCodeVerification = ({ 
  open, 
  onOpenChange, 
  onVerified,
  featureName 
}: PremiumCodeVerificationProps) => {
  const [code, setCode] = useState('');
  const [showBuyPopup, setShowBuyPopup] = useState(false);
  const { toast } = useToast();

  const [showApply, setShowApply] = useState(false);

  const handleVerify = async () => {
    if (code.trim() === VALID_CODE) {
      setShowApply(true);
    } else {
      toast({
        title: "Invalid Code",
        description: "Invalid code. Try again or buy a new one.",
        variant: "destructive",
      });
    }
  };

  const handleApply = async () => {
    try {
      // If this is for account verification, update the profile
      if (featureName === 'Verify Account') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .update({ is_verified: true })
            .eq('id', user.id);
          
          toast({
            title: "✅ Account Verified!",
            description: "Your account is now verified. Check your profile!",
          });
        }
      } else {
        toast({
          title: "Success! 🎉",
          description: `${featureName} unlocked successfully!`,
        });
      }
      
      onVerified();
      onOpenChange(false);
      setShowApply(false);
      setCode('');
    } catch (error) {
      console.error('Error applying verification:', error);
      toast({
        title: "Error",
        description: "Failed to apply verification. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEmailClick = () => {
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=Purchase Premium Code for ${featureName}`;
  };

  const handleCallClick = () => {
    window.location.href = `tel:${SUPPORT_PHONE}`;
  };

  return (
    <>
      <Dialog open={open && !showBuyPopup && !showApply} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Code to Unlock Feature</DialogTitle>
            <DialogDescription>
              Enter your premium code to unlock {featureName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Enter your code (letters + numbers)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="text-center text-lg font-mono"
            />
            <div className="flex gap-2">
              <Button onClick={handleVerify} className="flex-1">
                ✅ Verify Code
              </Button>
              <Button 
                onClick={() => setShowBuyPopup(true)} 
                variant="outline"
                className="flex-1"
              >
                💳 Buy Code
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showApply} onOpenChange={setShowApply}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>🎉 Success! Code Verified</DialogTitle>
            <DialogDescription>
              You've unlocked {featureName}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Button onClick={handleApply} className="w-full">
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showBuyPopup} onOpenChange={setShowBuyPopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Get Your Premium Code</DialogTitle>
            <DialogDescription>
              Contact us to purchase a valid code
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
                Email Me
              </Button>
              <Button onClick={handleCallClick} variant="outline" className="w-full gap-2">
                <Phone className="w-4 h-4" />
                Call Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PremiumCodeVerification;
