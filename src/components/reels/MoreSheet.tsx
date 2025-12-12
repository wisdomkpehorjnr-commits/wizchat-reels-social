import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Download, Flag, Save } from 'lucide-react';

interface MoreSheetProps {
  post: any;
  open: boolean;
  onClose: () => void;
}

const MoreSheet: React.FC<MoreSheetProps> = ({ post, open, onClose }) => {
  const download = async () => {
    try {
      const a = document.createElement('a');
      a.href = post.videoUrl || post.mediaUrl;
      a.download = '';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.warn('download failed', e);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + `/reels/${post.id}`);
    } catch (e) {}
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="fixed bottom-0 left-0 right-0 rounded-t-xl p-4 bg-white dark:bg-gray-900">
        <div className="space-y-3">
          <Button onClick={download} className="w-full justify-start"><Download className="mr-2"/> Download</Button>
          <Button onClick={() => { /* save */ }} className="w-full justify-start"><Save className="mr-2"/> Save</Button>
          <Button onClick={() => { /* report */ }} className="w-full justify-start"><Flag className="mr-2"/> Report</Button>
          <Button onClick={copyLink} className="w-full justify-start"><Copy className="mr-2"/> Copy link</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MoreSheet;
