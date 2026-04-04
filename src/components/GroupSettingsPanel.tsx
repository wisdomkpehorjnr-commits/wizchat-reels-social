import { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Users, Crown, Trash2, UserMinus, Ban, Bell, BellOff, Megaphone, Lock, Globe, EyeOff, Settings, Check, X, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface GroupSettingsPanelProps {
  chatId: string;
  onClose: () => void;
  onGroupDeleted?: () => void;
}

interface Member {
  id: string;
  userId: string;
  name: string;
  username: string;
  avatar: string | null;
  role: string;
}

const GroupSettingsPanel = ({ chatId, onClose, onGroupDeleted }: GroupSettingsPanelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [chat, setChat] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('members');

  // Edit states
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [groupType, setGroupType] = useState('public');
  const [messagePermission, setMessagePermission] = useState('all');
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [maxMembers, setMaxMembers] = useState(0);
  const [announcementMode, setAnnouncementMode] = useState(false);
  const [groupRules, setGroupRules] = useState('');

  // Dialogs
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<Member | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    loadGroupData();
  }, [chatId]);

  const loadGroupData = async () => {
    setLoading(true);
    try {
      // Load chat data
      const { data: chatData } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .single();

      if (chatData) {
        setChat(chatData);
        setEditName(chatData.name || '');
        setEditDescription(chatData.description || '');
        setGroupType(chatData.group_type || 'public');
        setMessagePermission(chatData.message_permission || 'all');
        setApprovalRequired(chatData.approval_required || false);
        setMaxMembers(chatData.max_members || 0);
        setAnnouncementMode(chatData.announcement_mode || false);
        setGroupRules(chatData.group_rules || '');
        setIsCreator(chatData.creator_id === user?.id);
      }

      // Load members
      const { data: participantsData } = await supabase
        .from('chat_participants')
        .select('id, user_id, role, profiles:user_id(id, name, username, avatar)')
        .eq('chat_id', chatId) as any;

      if (participantsData) {
        const mappedMembers = participantsData.map((p: any) => ({
          id: p.id,
          userId: p.user_id,
          name: p.profiles?.name || 'Unknown',
          username: p.profiles?.username || '',
          avatar: p.profiles?.avatar,
          role: p.role || 'member',
        }));
        setMembers(mappedMembers);

        const myParticipant = mappedMembers.find((m: Member) => m.userId === user?.id);
        setIsAdmin(myParticipant?.role === 'admin');
      }
    } catch (err) {
      console.error('Error loading group data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const { error } = await supabase
        .from('chats')
        .update({
          name: editName.trim(),
          description: editDescription.trim(),
          group_type: groupType,
          message_permission: messagePermission,
          approval_required: approvalRequired,
          max_members: maxMembers,
          announcement_mode: announcementMode,
          group_rules: groupRules.trim(),
        })
        .eq('id', chatId);

      if (error) throw error;
      toast({ title: 'Settings saved' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    }
  };

  const handleRemoveMember = async (member: Member) => {
    try {
      await supabase.from('chat_participants').delete().eq('id', member.id);
      setMembers(prev => prev.filter(m => m.id !== member.id));
      toast({ title: 'Removed', description: `${member.name} has been removed` });
    } catch {
      toast({ title: 'Error', description: 'Failed to remove member', variant: 'destructive' });
    }
    setConfirmRemove(null);
  };

  const handlePromoteToAdmin = async (member: Member) => {
    try {
      await supabase.from('chat_participants').update({ role: 'admin' }).eq('id', member.id);
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: 'admin' } : m));
      toast({ title: 'Promoted', description: `${member.name} is now an admin` });
    } catch {
      toast({ title: 'Error', description: 'Failed to promote member', variant: 'destructive' });
    }
  };

  const handleDemoteAdmin = async (member: Member) => {
    try {
      await supabase.from('chat_participants').update({ role: 'member' }).eq('id', member.id);
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: 'member' } : m));
      toast({ title: 'Demoted', description: `${member.name} is now a regular member` });
    } catch {
      toast({ title: 'Error', description: 'Failed to demote admin', variant: 'destructive' });
    }
  };

  const handleDeleteGroup = async () => {
    try {
      // Delete all messages first
      await supabase.from('messages').delete().eq('chat_id', chatId);
      await supabase.from('chat_participants').delete().eq('chat_id', chatId);
      await supabase.from('chats').delete().eq('id', chatId);
      toast({ title: 'Group deleted' });
      onGroupDeleted?.();
      onClose();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete group', variant: 'destructive' });
    }
    setConfirmDelete(false);
  };

  const handleLeaveGroup = async () => {
    try {
      await supabase.from('chat_participants').delete()
        .eq('chat_id', chatId)
        .eq('user_id', user?.id);
      toast({ title: 'Left group' });
      onGroupDeleted?.();
      onClose();
    } catch {
      toast({ title: 'Error', description: 'Failed to leave group', variant: 'destructive' });
    }
    setConfirmLeave(false);
  };

  const handleTransferOwnership = async (member: Member) => {
    try {
      // Make them admin first
      await supabase.from('chat_participants').update({ role: 'admin' }).eq('id', member.id);
      // Transfer creator
      await supabase.from('chats').update({ creator_id: member.userId }).eq('id', chatId);
      setIsCreator(false);
      toast({ title: 'Ownership transferred', description: `${member.name} is now the owner` });
      loadGroupData();
    } catch {
      toast({ title: 'Error', description: 'Failed to transfer ownership', variant: 'destructive' });
    }
  };

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="flex items-center gap-3 p-4 border-b">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-5 h-5" /></Button>
          <p className="font-semibold">Loading...</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="font-semibold text-foreground">Group Settings</h2>
          <p className="text-xs text-muted-foreground">{members.length} members</p>
        </div>
        {(isAdmin || isCreator) && (
          <Button size="sm" onClick={handleSaveSettings}>
            <Check className="w-4 h-4 mr-1" /> Save
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="members"><Users className="w-4 h-4 mr-1" /> Members</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-1" /> Settings</TabsTrigger>
            <TabsTrigger value="admin"><Shield className="w-4 h-4 mr-1" /> Admin</TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members" className="mt-4 space-y-3">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search members..."
              className="bg-muted/50"
            />

            <div className="space-y-1">
              {filteredMembers.map(member => (
                <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={member.avatar || undefined} />
                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-foreground truncate">{member.name}</p>
                      {member.role === 'admin' && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          <Crown className="w-3 h-3 mr-0.5" /> Admin
                        </Badge>
                      )}
                      {member.userId === chat?.creator_id && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-primary">Owner</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">@{member.username}</p>
                  </div>

                  {(isAdmin || isCreator) && member.userId !== user?.id && (
                    <div className="flex gap-1">
                      {member.role !== 'admin' && (
                        <Button size="sm" variant="ghost" onClick={() => handlePromoteToAdmin(member)} title="Promote to admin">
                          <Crown className="w-4 h-4 text-primary" />
                        </Button>
                      )}
                      {member.role === 'admin' && isCreator && (
                        <Button size="sm" variant="ghost" onClick={() => handleDemoteAdmin(member)} title="Demote">
                          <Shield className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(member)} title="Remove">
                        <UserMinus className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Group Name</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={50} disabled={!isAdmin && !isCreator} />
              <p className="text-xs text-muted-foreground">{editName.length}/50</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} maxLength={200} disabled={!isAdmin && !isCreator} rows={2} />
              <p className="text-xs text-muted-foreground">{editDescription.length}/200</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Group Type</label>
              <Select value={groupType} onValueChange={setGroupType} disabled={!isAdmin && !isCreator}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public"><div className="flex items-center gap-2"><Globe className="w-4 h-4" /> Public</div></SelectItem>
                  <SelectItem value="private"><div className="flex items-center gap-2"><Lock className="w-4 h-4" /> Private</div></SelectItem>
                  <SelectItem value="secret"><div className="flex items-center gap-2"><EyeOff className="w-4 h-4" /> Secret</div></SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Who can send messages?</label>
              <Select value={messagePermission} onValueChange={setMessagePermission} disabled={!isAdmin && !isCreator}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All members</SelectItem>
                  <SelectItem value="admins">Only admins</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Approval required</p>
                <p className="text-xs text-muted-foreground">New members need admin approval</p>
              </div>
              <Switch checked={approvalRequired} onCheckedChange={setApprovalRequired} disabled={!isAdmin && !isCreator} />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Announcement mode</p>
                <p className="text-xs text-muted-foreground">Only admins can post</p>
              </div>
              <Switch checked={announcementMode} onCheckedChange={setAnnouncementMode} disabled={!isAdmin && !isCreator} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Max members (0 = unlimited)</label>
              <Input type="number" value={maxMembers} onChange={(e) => setMaxMembers(parseInt(e.target.value) || 0)} disabled={!isAdmin && !isCreator} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Group Rules</label>
              <Textarea value={groupRules} onChange={(e) => setGroupRules(e.target.value)} placeholder="Set rules for this group..." disabled={!isAdmin && !isCreator} rows={3} />
            </div>
          </TabsContent>

          {/* Admin Tab */}
          <TabsContent value="admin" className="mt-4 space-y-3">
            {isCreator && (
              <>
                <div className="p-3 rounded-xl bg-card border border-border">
                  <p className="text-sm font-medium text-foreground mb-1">Transfer Ownership</p>
                  <p className="text-xs text-muted-foreground mb-3">Transfer group ownership to another admin</p>
                  <div className="space-y-1">
                    {members.filter(m => m.role === 'admin' && m.userId !== user?.id).map(member => (
                      <Button key={member.id} variant="outline" size="sm" className="w-full justify-start" onClick={() => handleTransferOwnership(member)}>
                        <Crown className="w-4 h-4 mr-2 text-primary" /> Transfer to {member.name}
                      </Button>
                    ))}
                    {members.filter(m => m.role === 'admin' && m.userId !== user?.id).length === 0 && (
                      <p className="text-xs text-muted-foreground">No other admins to transfer to</p>
                    )}
                  </div>
                </div>

                <Button variant="destructive" className="w-full" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Group
                </Button>
              </>
            )}

            {!isCreator && (
              <Button variant="outline" className="w-full text-destructive" onClick={() => setConfirmLeave(true)}>
                Leave Group
              </Button>
            )}

            <div className="p-3 rounded-xl bg-card border border-border">
              <p className="text-sm font-medium text-foreground mb-1">Group Info</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Created: {chat?.created_at ? new Date(chat.created_at).toLocaleDateString() : 'Unknown'}</p>
                <p>Members: {members.length}</p>
                <p>Type: {groupType}</p>
                <p>Messages: {messagePermission === 'all' ? 'All members can send' : 'Admins only'}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>

      {/* Dialogs */}
      <ConfirmationDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete Group"
        description="This will permanently delete the group and all messages. This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDeleteGroup}
      />

      <ConfirmationDialog
        open={!!confirmRemove}
        onOpenChange={(open) => !open && setConfirmRemove(null)}
        title="Remove Member"
        description={`Remove ${confirmRemove?.name} from this group?`}
        confirmText="Remove"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => confirmRemove && handleRemoveMember(confirmRemove)}
      />

      <ConfirmationDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Leave Group"
        description="Are you sure you want to leave this group?"
        confirmText="Leave"
        cancelText="Stay"
        variant="destructive"
        onConfirm={handleLeaveGroup}
      />
    </div>
  );
};

export default GroupSettingsPanel;
