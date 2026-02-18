import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, X } from 'lucide-react';
import { User } from '@/types';
import { dataService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import GroupChatPopup from './GroupChatPopup';

interface CreateGroupChatProps {
  onGroupCreated: (groupId?: string, groupName?: string) => Promise<void>;
  onClose: () => void;
}

const CreateGroupChat = ({ onGroupCreated, onClose }: CreateGroupChatProps) => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupData, setGroupData] = useState({
    name: '',
    description: '',
    isPublic: false
  });
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);
  const { toast } = useToast();

  const searchUsers = async (term: string) => {
    if (!term.trim()) {
      setAvailableUsers([]);
      return;
    }

    try {
      const users = await dataService.searchUsers(term);
      setAvailableUsers(users);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const addUser = (user: User) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchTerm('');
    setAvailableUsers([]);
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const createGroup = async () => {
    if (!groupData.name.trim()) {
      toast({
        title: "Error",
        description: "Group name is required",
        variant: "destructive"
      });
      return;
    }

    if (selectedUsers.length < 1) {
      toast({
        title: "Error",
        description: "Please add at least one member",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Create the group (this will also create group_members, a chat and send a welcome message)
      const result = await dataService.createGroup({
        name: groupData.name,
        description: groupData.description,
        isPublic: groupData.isPublic,
        members: selectedUsers.map(u => u.id)
      });

      // dataService.createGroup now returns { group, chatId }
      const chatId = result?.chatId ?? null;

      // Fallback: if no chatId returned, create the chat explicitly
      let finalChatId = chatId;
      if (!finalChatId) {
        const chat = await dataService.createChat(
          selectedUsers.map(u => u.id),
          true,
          groupData.name
        );
        finalChatId = chat.id;
      }

      if (finalChatId) {
        await onGroupCreated(finalChatId, groupData.name);
        setCreatedGroupId(finalChatId);
      } else {
        throw new Error('Failed to obtain chat id for created group');
      }
      
      // Reset form
      setGroupData({ name: '', description: '', isPublic: false });
      setSelectedUsers([]);
      setSearchTerm('');
      
      toast({
        title: "Success",
        description: "Group created successfully! Start chatting with your members."
      });
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // If group chat popup is open
  if (createdGroupId) {
    return (
      <GroupChatPopup
        groupId={createdGroupId}
        onClose={() => {
          setCreatedGroupId(null);
          onClose();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-background border-2 green-border rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Create Group Chat</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-4">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              value={groupData.name}
              onChange={(e) => setGroupData({ ...groupData, name: e.target.value })}
              placeholder="Enter group name"
              className="border-2 green-border"
            />
          </div>

          {/* Group Description */}
          <div className="space-y-2">
            <Label htmlFor="group-description">Description (optional)</Label>
            <Textarea
              id="group-description"
              value={groupData.description}
              onChange={(e) => setGroupData({ ...groupData, description: e.target.value })}
              placeholder="Enter group description"
              rows={3}
              className="border-2 green-border"
            />
          </div>

          {/* Public Group Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="public-group">Public Group</Label>
              <p className="text-sm text-muted-foreground">
                Anyone can search and join this group
              </p>
            </div>
            <Switch
              id="public-group"
              checked={groupData.isPublic}
              onCheckedChange={(checked) => setGroupData({ ...groupData, isPublic: checked })}
            />
          </div>

          {/* User Search */}
          <div className="space-y-2">
            <Label htmlFor="user-search">Add Members</Label>
            <Input
              id="user-search"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                searchUsers(e.target.value);
              }}
              placeholder="Search users..."
              className="border-2 green-border"
            />
            
            {/* Search Results */}
            {availableUsers.length > 0 && (
              <div className="border-2 green-border rounded-md p-2 max-h-32 overflow-y-auto">
                {availableUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                    onClick={() => addUser(user)}
                  >
                    <div className="flex items-center space-x-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Members ({selectedUsers.length})</Label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <Badge key={user.id} variant="secondary" className="flex items-center space-x-1">
                    <Avatar className="w-4 h-4">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>{user.name}</span>
                    <button
                      onClick={() => removeUser(user.id)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={createGroup} disabled={loading} className="flex-1">
              {loading ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupChat;
