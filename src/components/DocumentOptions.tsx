import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Download, Copy } from 'lucide-react';

interface DocumentOptionsProps {
  url: string;
  open: boolean;
  onClose: () => void;
}

const DocumentOptions: React.FC<DocumentOptionsProps> = ({ url, open, onClose }) => {
  const openNewTab = () => {
    window.open(url, '_blank', 'noopener');
    onClose();
  };

  const download = () => {
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = '';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) { console.warn(e); }
    onClose();
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(url); } catch (e) { console.warn(e); }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="fixed bottom-0 left-0 right-0 rounded-t-xl p-4 bg-white dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle>Open Document</DialogTitle>
        </DialogHeader>

        <div className="mt-3 space-y-3">
          <Button onClick={openNewTab} className="w-full justify-start"><ExternalLink className="mr-2"/> Open in browser</Button>
          <Button onClick={download} className="w-full justify-start"><Download className="mr-2"/> Download</Button>
          <Button onClick={copyLink} className="w-full justify-start"><Copy className="mr-2"/> Copy link</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentOptions;
