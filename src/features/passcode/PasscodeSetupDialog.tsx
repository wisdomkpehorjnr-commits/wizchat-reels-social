import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { passcode } from './passcodeStore';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  onEnabled: () => void;
}

const PasscodeSetupDialog: React.FC<Props> = ({ open, onOpenChange, userId, onEnabled }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const reset = () => { setPin(''); setConfirmPin(''); };

  const submit = async () => {
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      toast({ title: 'PIN must be 6 digits', variant: 'destructive' });
      return;
    }
    if (pin !== confirmPin) {
      toast({ title: 'PINs do not match', variant: 'destructive' });
      return;
    }
    setBusy(true);
    await passcode.enable(userId, pin);
    setBusy(false);
    reset();
    onEnabled();
    onOpenChange(false);
    toast({ title: 'Two-Factor Authentication enabled', description: 'You will enter this passcode when logging in.' });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-sm bg-popover text-popover-foreground border border-border">
        <DialogHeader>
          <DialogTitle>Set a 6-digit passcode</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            inputMode="numeric"
            maxLength={6}
            pattern="\d{6}"
            placeholder="Enter 6-digit PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="tracking-[0.5em] text-center text-lg"
            autoFocus
          />
          <Input
            inputMode="numeric"
            maxLength={6}
            pattern="\d{6}"
            placeholder="Confirm PIN"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="tracking-[0.5em] text-center text-lg"
          />
          <p className="text-xs text-muted-foreground">
            You will be prompted for this passcode every time you launch WizchatPro after logging in.
          </p>
          <Button onClick={submit} disabled={busy} className="w-full">
            {busy ? 'Enabling…' : 'Enable Two-Factor Authentication'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PasscodeSetupDialog;
