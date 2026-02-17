import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  Upload,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Friend, User } from '@/types';
import { dataService } from '@/services/dataService';
import { MediaService } from '@/services/mediaService';

interface CreateGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  friends: Friend[];
  onGroupCreated?: (groupId: string) => void;
}

type Step = 'enter_name' | 'select_members' | 'summary';

interface SelectedUser extends User {
  isSelected: boolean;
}

const CreateGroupDialog: React.FC<CreateGroupDialogProps> = ({
  isOpen,
  onClose,
  friends,
  onGroupCreated,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('enter_name');
  const [groupName, setGroupName] = useState('');
  const [groupIcon, setGroupIcon] = useState<File | null>(null);
  const [groupIconPreview, setGroupIconPreview] = useState<string>('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [friendsList, setFriendsList] = useState<SelectedUser[]>([]);

  // Initialize friends list
  React.useEffect(() => {
    if (!isOpen) return;

    const acceptedFriends = friends.filter(f => f.status === 'accepted');
    const friendUsers = acceptedFriends.map(friend =>
      friend.requester.id === user?.id ? friend.addressee : friend.requester
    );

    setFriendsList(
      friendUsers.map(f => ({
        ...f,
        isSelected: selectedMembers.has(f.id),
      }))
    );
  }, [isOpen, friends, user?.id, selectedMembers]);

  const handleGroupIconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGroupIcon(file);
      const reader = new FileReader();
      reader.onload = () => setGroupIconPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveIcon = () => {
    setGroupIcon(null);
    setGroupIconPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleMemberToggle = (friendId: string) => {
    setSelectedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(friendId)) {
        newSet.delete(friendId);
      } else {
        newSet.add(friendId);
      }
      return newSet;
    });
  };

  const filteredMembers = friendsList.filter(friend =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSelectedMembersData = () => {
    return friendsList.filter(f => selectedMembers.has(f.id));
  };

  const handleCreateGroup = async () => {
    if (!user || !groupName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a group name',
        variant: 'destructive',
      });
      return;
    }

    if (selectedMembers.size === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one member',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      // Prefer server-side RPC that creates group + members + chat atomically
      let group: any = null;
      let chat: any = null;

      try {
        const rpcRes = await (supabase.rpc as any)('create_group_with_members', {
          p_name: groupName.trim(),
          p_member_ids: Array.from(selectedMembers),
        });

        // Expect RPC to return { group_id, chat_id }
        // depending on RPC implementation it may return row(s)
        if (rpcRes.error) throw rpcRes.error;
        const rpcData: any = rpcRes.data;
        if (rpcData) {
          group = rpcData.group || rpcData[0]?.group || { id: rpcData.group_id || rpcData[0]?.group_id };
          chat = rpcData.chat || rpcData[0]?.chat || { id: rpcData.chat_id || rpcData[0]?.chat_id };
        }
      } catch (rpcErr) {
        console.debug('create_group_with_members RPC not available or failed, falling back', rpcErr);
      }

      if (!group) {
        // Fallback: create group via dataService then create chat
        group = await dataService.createGroup({
          name: groupName.trim(),
          description: '',
          isPublic: false,
          members: Array.from(selectedMembers),
        });

        if (!group || !group.id) {
          throw new Error('Group creation failed: invalid response');
        }

        // Create a chat for the group using RPC (avoids client RLS issues)
        const participantIds = [user.id, ...Array.from(selectedMembers)];
        chat = await dataService.createChat(participantIds, true, groupName.trim());
      }

      toast({
        title: 'Success',
        description: 'Group created successfully!',
      });

      // Reset form
      setGroupName('');
      setGroupIcon(null);
      setGroupIconPreview('');
      setSelectedMembers(new Set());
      setSearchTerm('');
      setStep('enter_name');
      onClose();

      // Navigate to new group chat (use chat.id if available, else group.id)
      if (onGroupCreated) {
        onGroupCreated(chat?.id || group.id);
      }
    } catch (error: any) {
      console.error('Full error creating group via service:', error);
      const errorMessage = error?.message || error?.details || 'Failed to create group. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const selectedCount = selectedMembers.size;
  const selectedMembers_data = getSelectedMembersData();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6 border-b">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {step === 'enter_name' && 'Create New Group'}
              {step === 'select_members' && 'Select Members'}
              {step === 'summary' && 'Group Summary'}
            </DialogTitle>
            <DialogDescription>
              {step === 'enter_name' && 'Give your group a name and optional icon'}
              {step === 'select_members' && `Select who to add (${selectedCount} selected)`}
              {step === 'summary' && 'Review your group details'}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Enter Group Name */}
          {step === 'enter_name' && (
            <div className="space-y-6">
              {/* Group Icon Upload */}
              <div className="flex flex-col items-center gap-4">
                {groupIconPreview ? (
                  <div className="relative">
                    <img
                      src={groupIconPreview}
                      alt="Group icon"
                      className="w-24 h-24 rounded-full object-cover border-2 border-blue-500"
                    />
                    <button
                      onClick={handleRemoveIcon}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white text-2xl font-bold">
                    {groupName.charAt(0).toUpperCase() || '+'}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors font-medium text-sm"
                >
                  <Upload className="w-4 h-4" />
                  Upload Icon
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleGroupIconSelect}
                  className="hidden"
                />
              </div>

              {/* Group Name Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  Group Name *
                </label>
                <Input
                  placeholder="Enter group name..."
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  className="text-foreground border-2 focus:border-blue-500"
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground">
                  {groupName.length}/50 characters
                </p>
              </div>

              {/* Navigation */}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={() => setStep('select_members')}
                  disabled={!groupName.trim()}
                  className="gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Select Members */}
          {step === 'select_members' && (
            <div className="space-y-4">
              {/* Selected Members Preview */}
              {selectedCount > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">
                    Selected Members ({selectedCount})
                  </label>
                  <div className="flex flex-wrap gap-2 p-3 bg-blue-500/10 rounded-lg">
                    {selectedMembers_data.map(member => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-800 rounded-full border border-blue-500"
                      >
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback className="text-xs">
                            {member.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{member.name}</span>
                        <button
                          onClick={() => handleMemberToggle(member.id)}
                          className="text-blue-500 hover:text-blue-700 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Members */}
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search friends..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 text-foreground border-2 focus:border-blue-500"
                />
              </div>

              {/* Friends List */}
              <ScrollArea className="h-80 border rounded-lg p-4 bg-muted/50">
                <div className="space-y-2">
                  {filteredMembers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No friends found
                    </p>
                  ) : (
                    filteredMembers.map(friend => (
                      <button
                        key={friend.id}
                        onClick={() => handleMemberToggle(friend.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-background/80 transition-colors text-left group"
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={friend.avatar} />
                          <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {friend.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            @{friend.username}
                          </p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedMembers.has(friend.id)
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300 group-hover:border-blue-500'
                          }`}
                        >
                          {selectedMembers.has(friend.id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Validation Message */}
              {selectedCount === 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  ⚠ You need to select at least one member
                </p>
              )}

              {/* Navigation */}
              <div className="flex justify-between gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep('enter_name')}
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep('summary')}
                  disabled={selectedCount === 0}
                  className="gap-2"
                >
                  Review
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Summary */}
          {step === 'summary' && (
            <div className="space-y-6">
              {/* Group Info Card */}
              <Card className="border-2 bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    {groupIconPreview ? (
                      <img
                        src={groupIconPreview}
                        alt="Group icon"
                        className="w-20 h-20 rounded-full object-cover border-2 border-blue-500"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white text-2xl font-bold">
                        {groupName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">
                        {groupName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedCount} member{selectedCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Members List */}
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">Members</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {/* Creator */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user?.avatar || ''} />
                      <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {user?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">Creator</p>
                    </div>
                  </div>

                  {/* Selected Members */}
                  {selectedMembers_data.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {member.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{member.username}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep('select_members')}
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button
                  onClick={handleCreateGroup}
                  disabled={isCreating}
                  className="gap-2 bg-green-500 hover:bg-green-600 text-white"
                >
                  {isCreating ? 'Creating...' : 'Create Group'}
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;
