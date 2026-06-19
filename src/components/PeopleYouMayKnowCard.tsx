import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserPlus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getCachedPymk, getPymk, PymkUser } from '@/services/peopleYouMayKnowService';
import { supabase } from '@/integrations/supabase/client';

/**
 * People You May Know card — pinned and shown every N posts.
 * - Instantly shows cached users (works offline).
 * - Friends-of-friends preferred (true PYMK signal).
 */
const PeopleYouMayKnowCard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<PymkUser[]>(() => getCachedPymk());
  const [pendingFriend, setPendingFriend] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    getPymk(user.id).then((u) => { if (active) setUsers(u); });
    return () => { active = false; };
  }, [user?.id]);

  if (!users || users.length === 0) return null;

  const addFriend = async (targetId: string) => {
    if (!user?.id) return;
    setPendingFriend((prev) => new Set(prev).add(targetId));
    try {
      await supabase.from('friends').insert({
        requester_id: user.id,
        addressee_id: targetId,
        status: 'pending',
      });
    } catch {
      /* silently ignore — works offline */
    }
  };

  return (
    <Card className="w-full border-primary/30 bg-card mb-6">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">People You May Know</h3>
        </div>
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="flex gap-3 pb-1" style={{ minWidth: 'max-content' }}>
            {users.slice(0, 15).map((u) => (
              <div
                key={u.id}
                className="flex-shrink-0 w-40 border border-border rounded-xl bg-background p-3 text-center hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() => navigate(`/profile/${u.id}`)}
                  className="block mx-auto mb-2"
                >
                  <Avatar className="w-14 h-14 mx-auto">
                    <AvatarImage src={u.avatar} />
                    <AvatarFallback className="bg-primary/20 text-primary text-base font-semibold">
                      {u.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
                <p
                  className="text-xs font-medium text-foreground truncate cursor-pointer hover:text-primary"
                  onClick={() => navigate(`/profile/${u.id}`)}
                >
                  {u.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate mb-2">
                  @{u.username}
                  {u.mutualCount && u.mutualCount > 0 ? ` · ${u.mutualCount} mutual` : ''}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-xs gap-1"
                  disabled={pendingFriend.has(u.id)}
                  onClick={() => addFriend(u.id)}
                >
                  <UserPlus className="w-3 h-3" />
                  {pendingFriend.has(u.id) ? 'Sent' : 'Add Friend'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PeopleYouMayKnowCard;
