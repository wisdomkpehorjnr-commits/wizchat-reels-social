import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronLeft, ChevronRight, Check, Users } from 'lucide-react';
import { Friend, User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { dataService } from '@/services/dataService';

interface CreateGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  friends: Friend[];
  onGroupCreated?: (groupId: string, groupName?: string) => void;
}

type Step = 'details' | 'members' | 'confirm';

const stepMotion = {
  initial: { opacity: 0, y: 10, filter: 'blur(2px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -8, filter: 'blur(2px)' },
  transition: { duration: 0.22, ease: 'easeOut' as const },
};

const CreateGroupDialog: React.FC<CreateGroupDialogProps> = ({
  isOpen,
  onClose,
  friends,
  onGroupCreated,
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('details');
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const allMembers = useMemo(() => {
    const accepted = friends.filter((f) => f.status === 'accepted');
    const unique = new Map<string, User>();

    accepted.forEach((friend) => {
      const possible = [friend.requester, friend.addressee];
      possible.forEach((u) => {
        if (u?.id) unique.set(u.id, u);
      });
    });

    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [friends]);

  const filteredMembers = useMemo(
    () => allMembers.filter((u) => u.name?.toLowerCase().includes(searchTerm.toLowerCase())),
    [allMembers, searchTerm]
  );

  const selectedMembersData = useMemo(
    () => allMembers.filter((m) => selectedMembers.has(m.id)),
    [allMembers, selectedMembers]
  );

  const selectedCount = selectedMembers.size;

  const reset = () => {
    setStep('details');
    setGroupName('');
    setSelectedMembers(new Set());
    setSearchTerm('');
  };

  const handleClose = () => {
    if (isCreating) return;
    reset();
    onClose();
  };

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast({ title: 'Error', description: 'Group name is required', variant: 'destructive' });
      return;
    }

    if (selectedCount === 0) {
      toast({ title: 'Error', description: 'Please select at least one member', variant: 'destructive' });
      return;
    }

    setIsCreating(true);
    try {
      const { chatId } = await dataService.createGroup({
        name: groupName.trim(),
        description: '',
        isPublic: false,
        members: Array.from(selectedMembers),
      });

      toast({ title: 'Success', description: 'Group created successfully' });
      onGroupCreated?.(chatId, groupName.trim());
      handleClose();
    } catch (error: any) {
      console.error('createGroup failed:', error);
      toast({
        title: 'Group creation failed',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-xl overflow-hidden border border-border/60 bg-background/90 backdrop-blur-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Users className="h-5 w-5 text-primary" />
            Create Group
          </DialogTitle>
          <DialogDescription>
            {step === 'details' && 'Choose a group name'}
            {step === 'members' && 'Select members to add'}
            {step === 'confirm' && 'Review and create your group'}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'details' && (
            <motion.div key="details" {...stepMotion} className="space-y-5">
              <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
                <label className="mb-2 block text-sm font-medium text-foreground">Group Name</label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                  maxLength={50}
                />
                <p className="mt-2 text-xs text-muted-foreground">{groupName.length}/50</p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={() => setStep('members')} disabled={!groupName.trim()} className="gap-2">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'members' && (
            <motion.div key="members" {...stepMotion} className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search friends"
                  className="pl-9"
                />
              </div>

              {selectedCount > 0 && (
                <div className="flex flex-wrap gap-2 rounded-xl border border-border/50 bg-card/50 p-3">
                  {Array.from(selectedMembers).map((id) => {
                    const member = members.find((m) => m.id === id);
                    if (!member) return null;
                    return (
                      <Badge key={id} variant="secondary" className="cursor-pointer" onClick={() => toggleMember(id)}>
                        {member.name}
                      </Badge>
                    );
                  })}
                </div>
              )}

              <ScrollArea className="h-72 rounded-xl border border-border/60 bg-card/40 p-2">
                <div className="space-y-1">
                  {members.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No friends found</p>
                  ) : (
                    members.map((member) => {
                      const active = selectedMembers.has(member.id);
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => toggleMember(member.id)}
                          className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted"
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback>{member.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{member.name}</p>
                            <p className="truncate text-xs text-muted-foreground">@{member.username}</p>
                          </div>
                          <div className={`grid h-5 w-5 place-items-center rounded-full border ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-transparent'}`}>
                            <Check className="h-3 w-3" />
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>

              <div className="flex justify-between gap-2">
                <Button variant="outline" onClick={() => setStep('details')} className="gap-2">
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={() => setStep('confirm')} disabled={selectedCount === 0} className="gap-2">
                  Review <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'confirm' && (
            <motion.div key="confirm" {...stepMotion} className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
                <p className="text-lg font-semibold text-foreground">{groupName}</p>
                <p className="text-sm text-muted-foreground">{selectedCount + 1} members including you</p>
              </div>

              <div className="max-h-44 space-y-2 overflow-auto rounded-xl border border-border/60 bg-card/40 p-2">
                {selectedMembersData.map((member) => (
                  <div key={member.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback>{member.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-foreground">{member.name}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between gap-2">
                <Button variant="outline" onClick={() => setStep('members')} className="gap-2">
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleCreateGroup} disabled={isCreating} className="gap-2">
                  {isCreating ? 'Creating...' : 'Create Group'} <Check className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;
