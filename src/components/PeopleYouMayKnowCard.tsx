import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getCachedPymk, getPymk, PymkUser } from '@/services/peopleYouMayKnowService';
import { supabase } from '@/integrations/supabase/client';
import SmartAvatar from '@/components/SmartAvatar';
import './social-glass.css';

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
    <Card className="pymk-card mb-6 w-full overflow-hidden rounded-[2rem] border-0 bg-card">
      <CardContent className="p-3 sm:p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Users className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">People You May Know</h3>
            <p className="text-xs text-muted-foreground sm:text-sm">Good people, shared connections</p>
          </div>
        </div>
        <div className="overflow-x-auto -mx-1 px-1 scrollbar-hide">
          <div className="flex gap-4 pb-2" style={{ minWidth: 'max-content' }}>
            {users.slice(0, 15).map((u, index) => (
              <article
                key={u.id}
                className="group w-48 flex-shrink-0 rounded-[1.75rem] bg-card p-3 text-center transition-[transform,box-shadow] duration-300 hover:-translate-y-1 motion-reduce:transition-none sm:w-52"
                style={{ animationDelay: `${Math.min(index * 50, 350)}ms` }}
              >
                <button
                  type="button"
                  onClick={() => navigate(`/profile/${u.id}`)}
                  className="mb-2 block w-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  aria-label={`View ${u.name}'s profile`}
                >
                  <SmartAvatar src={u.avatar} alt={u.name} className="mx-auto h-[4.5rem] w-[4.5rem] shadow-md ring-4 ring-primary/10 transition-transform duration-300 group-hover:scale-105" />
                </button>
                <button
                  type="button"
                  className="max-w-full truncate rounded-md text-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  onClick={() => navigate(`/profile/${u.id}`)}
                >
                  {u.name}
                </button>
                <p className="mb-3 mt-1 truncate text-xs text-muted-foreground">
                  @{u.username}{u.mutualCount && u.mutualCount > 0 ? ` · ${u.mutualCount} mutual` : ''}
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-9 w-full rounded-full bg-primary/10 px-4 text-xs font-semibold text-primary shadow-none transition-all duration-200 hover:scale-[1.03] hover:bg-primary/15 active:scale-95 motion-reduce:transform-none"
                  disabled={pendingFriend.has(u.id)}
                  onClick={() => addFriend(u.id)}
                >
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  {pendingFriend.has(u.id) ? 'Request sent' : 'Add friend'}
                </Button>
              </article>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PeopleYouMayKnowCard;
