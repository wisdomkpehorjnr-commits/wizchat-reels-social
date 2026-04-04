import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronLeft, ChevronRight, Check, Users, Globe, Lock, EyeOff } from 'lucide-react';
import { Friend, User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';

interface CreateGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  friends: Friend[];
  onGroupCreated?: (groupId: string, groupName?: string) => void;
}

type Step = 'details' | 'avatar' | 'settings' | 'members' | 'confirm';

const TAGS = ['Friends', 'Work', 'Study', 'Gaming', 'Sports', 'Music', 'Family', 'Other'];

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
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('details');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Group settings
  const [groupType, setGroupType] = useState('public');
  const [messagePermission, setMessagePermission] = useState('all');
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [maxMembers, setMaxMembers] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [groupAvatarFile, setGroupAvatarFile] = useState<File | null>(null);
  const [groupAvatarPreview, setGroupAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (groupAvatarPreview) URL.revokeObjectURL(groupAvatarPreview);
    };
  }, [groupAvatarPreview]);

  const setAvatarFromFile = (file: File | null) => {
    setGroupAvatarFile(file);
    setGroupAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    if (!file && fileInputRef.current) fileInputRef.current.value = '';
  };

  const allMembers = useMemo(() => {
    const accepted = friends.filter((f) => f.status === 'accepted');
    const unique = new Map<string, User>();
    accepted.forEach((friend) => {
      [friend.requester, friend.addressee].forEach((u) => {
        if (u?.id) unique.set(u.id, u);
      });
    });
    return [...unique.values()]
      .filter((member) => member.id !== user?.id)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [friends, user?.id]);

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
    setGroupDescription('');
    setSelectedMembers(new Set());
    setSearchTerm('');
    setAvatarFromFile(null);
    setGroupType('public');
    setMessagePermission('all');
    setApprovalRequired(false);
    setMaxMembers(0);
    setSelectedTags([]);
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

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
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
        description: groupDescription.trim(),
        isPublic: groupType === 'public',
        members: Array.from(selectedMembers),
        avatarFile: groupAvatarFile,
      });

      // Update group settings
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.from('chats').update({
        group_type: groupType,
        message_permission: messagePermission,
        approval_required: approvalRequired,
        max_members: maxMembers,
        tags: selectedTags,
      }).eq('id', chatId);

      toast({ title: 'Success', description: 'Group created successfully' });
      onGroupCreated?.(chatId, groupName.trim());
      reset();
      onClose();
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
            {step === 'details' && 'Set group name and description'}
            {step === 'avatar' && 'Add a group photo (optional)'}
            {step === 'settings' && 'Configure group settings'}
            {step === 'members' && 'Select members to add'}
            {step === 'confirm' && 'Review and create your group'}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* Step 1: Details */}
          {step === 'details' && (
            <motion.div key="details" {...stepMotion} className="space-y-4">
              <div className="rounded-2xl border border-border/50 bg-card/60 p-4 space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Group Name *</label>
                  <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Enter group name" maxLength={50} />
                  <p className="mt-1 text-xs text-muted-foreground">{groupName.length}/50</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Description (optional)</label>
                  <Textarea value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} placeholder="What's this group about?" maxLength={200} rows={2} />
                  <p className="mt-1 text-xs text-muted-foreground">{groupDescription.length}/200</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={() => setStep('avatar')} disabled={!groupName.trim()} className="gap-2">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Avatar */}
          {step === 'avatar' && (
            <motion.div key="avatar" {...stepMotion} className="space-y-5">
              <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
                <label className="mb-2 block text-sm font-medium text-foreground">Group Photo (optional)</label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={groupAvatarPreview || undefined} />
                    <AvatarFallback>{(groupName.trim().charAt(0) || 'G').toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-2">
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const file = e.target.files?.[0] ?? null; if (file) setAvatarFromFile(file); }} />
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>Upload photo</Button>
                      {groupAvatarFile && (
                        <Button type="button" variant="ghost" onClick={() => setAvatarFromFile(null)}>Remove</Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between gap-2">
                <Button variant="outline" onClick={() => setStep('details')} className="gap-2">
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={() => setStep('settings')} className="gap-2">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Settings */}
          {step === 'settings' && (
            <motion.div key="settings" {...stepMotion} className="space-y-4">
              <div className="rounded-2xl border border-border/50 bg-card/60 p-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Group Type</label>
                  <Select value={groupType} onValueChange={setGroupType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public"><div className="flex items-center gap-2"><Globe className="w-4 h-4" /> Public - Anyone can find and join</div></SelectItem>
                      <SelectItem value="private"><div className="flex items-center gap-2"><Lock className="w-4 h-4" /> Private - Invite only</div></SelectItem>
                      <SelectItem value="secret"><div className="flex items-center gap-2"><EyeOff className="w-4 h-4" /> Secret - Only members see it</div></SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Who can send messages?</label>
                  <Select value={messagePermission} onValueChange={setMessagePermission}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All members</SelectItem>
                      <SelectItem value="admins">Only admins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Approval required</p>
                    <p className="text-xs text-muted-foreground">New members need approval</p>
                  </div>
                  <Switch checked={approvalRequired} onCheckedChange={setApprovalRequired} />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Max members (0 = unlimited)</label>
                  <Input type="number" value={maxMembers} onChange={(e) => setMaxMembers(parseInt(e.target.value) || 0)} min={0} />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Tags/Categories</label>
                  <div className="flex flex-wrap gap-2">
                    {TAGS.map(tag => (
                      <Badge
                        key={tag}
                        variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                        className="cursor-pointer transition-colors"
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between gap-2">
                <Button variant="outline" onClick={() => setStep('avatar')} className="gap-2">
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={() => setStep('members')} className="gap-2">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Members */}
          {step === 'members' && (
            <motion.div key="members" {...stepMotion} className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search friends" className="pl-9" />
              </div>

              {selectedCount > 0 && (
                <div className="flex flex-wrap gap-2 rounded-xl border border-border/50 bg-card/50 p-3">
                  {Array.from(selectedMembers).map((id) => {
                    const member = allMembers.find((m) => m.id === id);
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
                  {filteredMembers.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No friends found</p>
                  ) : (
                    filteredMembers.map((member) => {
                      const active = selectedMembers.has(member.id);
                      return (
                        <button key={member.id} type="button" onClick={() => toggleMember(member.id)}
                          className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted">
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
                <Button variant="outline" onClick={() => setStep('settings')} className="gap-2">
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={() => setStep('confirm')} disabled={selectedCount === 0} className="gap-2">
                  Review <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Confirm */}
          {step === 'confirm' && (
            <motion.div key="confirm" {...stepMotion} className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={groupAvatarPreview || undefined} />
                    <AvatarFallback>{(groupName.trim().charAt(0) || 'G').toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-semibold text-foreground">{groupName}</p>
                    <p className="text-sm text-muted-foreground">{selectedCount + 1} members • {groupType}</p>
                    {groupDescription && <p className="text-xs text-muted-foreground mt-1">{groupDescription}</p>}
                  </div>
                </div>
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {selectedTags.map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                  </div>
                )}
                <div className="mt-3 text-xs text-muted-foreground space-y-0.5">
                  <p>Messages: {messagePermission === 'all' ? 'All members' : 'Admins only'}</p>
                  {approvalRequired && <p>Approval required for new members</p>}
                  {maxMembers > 0 && <p>Max members: {maxMembers}</p>}
                </div>
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
