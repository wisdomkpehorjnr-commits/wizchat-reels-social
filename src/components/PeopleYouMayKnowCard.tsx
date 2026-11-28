
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

const PeopleYouMayKnowCard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<PymkUser[]>(() => getCachedPymk());
  const [pendingFriend, setPendingFriend] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    getPymk(user.id).then((u) => {
      if (active) setUsers(u);
    });
    return () => {
      active = false;
    };
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
    <Card className="pymk-card mb-4 w-full overflow-hidden rounded-[1.5rem] border-0 bg-card">
      <CardContent className="p-2 sm:p-2.5">
        <div className="mb-1.5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
              People You May Know
            </h3>
            <p className="text-[11px] text-muted-foreground sm:text-xs">
              Good people, shared connections
            </p>
          </div>
        </div>

        <div className="-mx-1 overflow-x-auto px-1 scrollbar-hide">
          <div className="flex gap-3 pb-1" style={{ minWidth: 'max-content' }}>
            {users.slice(0, 15).map((u, index) => (
              <article
                key={u.id}
                className="group w-40 flex-shrink-0 rounded-2xl bg-card p-2 text-center transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 motion-reduce:transition-none sm:w-44"
                style={{ animationDelay: `${Math.min(index * 50, 350)}ms` }}
              >
                <button
                  type="button"
                  onClick={() => navigate(`/profile/${u.id}`)}
                  className="mb-1 block w-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  aria-label={`View ${u.name}'s profile`}
                >
                  <SmartAvatar
                    src={u.avatar}
                    alt={u.name}
                    className="mx-auto h-12 w-12 shadow-sm ring-2 ring-primary/10 transition-transform duration-300 group-hover:scale-105"
                  />
                </button>

                <button
                  type="button"
                  className="max-w-full truncate rounded-md text-xs font-semibold text-foreground transition-colors hover:text-primary sm:text-sm"
                  onClick={() => navigate(`/profile/${u.id}`)}
                >
                  {u.name}
                </button>

                <p className="mb-1.5 mt-0.5 truncate text-[10px] text-muted-foreground sm:text-xs">
                  @{u.username}
                  {u.mutualCount && u.mutualCount > 0 ? ` · ${u.mutualCount} mutual` : ''}
                </p>

                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 w-full rounded-full bg-primary/10 px-3 text-[11px] font-semibold text-primary shadow-none transition-all duration-200 hover:bg-primary/15 active:scale-95 sm:text-xs"
                  disabled={pendingFriend.has(u.id)}
                  onClick={() => addFriend(u.id)}
                >
                  <UserPlus className="mr-1 h-3.5 w-3.5" />
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
