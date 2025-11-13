import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Share2, Copy, MessageCircle, Mail, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShareBoardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: {
    id: string;
    content?: string;
    imageUrl?: string;
    videoUrl?: string;
    user?: {
      name: string;
      username: string;
    };
  };
}

const ShareBoard = ({ open, onOpenChange, post }: ShareBoardProps) => {
  const { toast } = useToast();
  const postUrl = `${window.location.origin}/post/${post.id}`;
  const shareText = post.content 
    ? `${post.user?.name || 'Someone'} shared: ${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}`
    : `Check out this post by ${post.user?.name || 'someone'} on WizChat!`;

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'WizChat Post',
          text: shareText,
          url: postUrl,
        });
        onOpenChange(false);
        toast({
          title: "Shared!",
          description: "Post shared successfully",
        });
      } else {
        // Fallback to copy
        handleCopyLink();
      }
    } catch (error: any) {
      // User cancelled or error occurred
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
        toast({
          title: "Error",
          description: "Failed to share post",
          variant: "destructive",
        });
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      toast({
        title: "Link Copied!",
        description: "Post link copied to clipboard",
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error copying link:', error);
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const handleShareToWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${postUrl}`)}`;
    window.open(url, '_blank');
    onOpenChange(false);
    toast({
      title: "Opening WhatsApp...",
      description: "Share this post with your contacts",
    });
  };

  const handleShareToTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
    onOpenChange(false);
    toast({
      title: "Opening Telegram...",
      description: "Share this post with your contacts",
    });
  };

  const handleShareToEmail = () => {
    const subject = encodeURIComponent('Check out this post on WizChat!');
    const body = encodeURIComponent(`${shareText}\n\n${postUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    onOpenChange(false);
    toast({
      title: "Opening Email...",
      description: "Share this post via email",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-gray-900 border border-green-500 rounded-2xl max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-green-700 dark:text-green-400">
            Share Post
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {/* Native Share (Mobile) */}
          {navigator.share && (
            <Button
              onClick={handleNativeShare}
              className="w-full bg-green-600 hover:bg-green-700 text-white h-14 text-lg flex items-center justify-center gap-3"
            >
              <Share2 className="w-5 h-5" />
              Share via...
            </Button>
          )}

          {/* Copy Link */}
          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="w-full border-green-500 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 h-14 text-lg flex items-center justify-center gap-3"
          >
            <Copy className="w-5 h-5" />
            Copy Link
          </Button>

          {/* WhatsApp */}
          <Button
            onClick={handleShareToWhatsApp}
            variant="outline"
            className="w-full border-green-500 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 h-14 text-lg flex items-center justify-center gap-3"
          >
            <MessageCircle className="w-5 h-5" />
            Share to WhatsApp
          </Button>

          {/* Telegram */}
          <Button
            onClick={handleShareToTelegram}
            variant="outline"
            className="w-full border-green-500 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 h-14 text-lg flex items-center justify-center gap-3"
          >
            <MessageCircle className="w-5 h-5" />
            Share to Telegram
          </Button>

          {/* Email */}
          <Button
            onClick={handleShareToEmail}
            variant="outline"
            className="w-full border-green-500 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 h-14 text-lg flex items-center justify-center gap-3"
          >
            <Mail className="w-5 h-5" />
            Share via Email
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareBoard;

