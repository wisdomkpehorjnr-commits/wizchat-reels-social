
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Home,
  MessageCircle,
  Users,
  User,
  Settings,
  MessageSquare,
  Crown,
  Clapperboard,
  GripVertical,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationBadges } from '@/hooks/useNotificationBadges';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import NotificationSystem from './NotificationSystem';
import LogoutButton from './LogoutButton';
import SmartAvatar from './SmartAvatar';
import { useT } from '@/i18n';

interface LayoutProps {
  children: React.ReactNode;
}

interface Position {
  left: number;
  top: number;
}

const POSITION_KEY = 'wizchat_desktop_navigation_position';
const MARGIN = 12;

const clampPosition = (
  left: number,
  top: number,
  width: number,
  height: number
): Position => ({
  left: Math.max(MARGIN, Math.min(left, window.innerWidth - width - MARGIN)),
  top: Math.max(MARGIN, Math.min(top, window.innerHeight - height - MARGIN)),
});

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { badges, clearBadge } = useNotificationBadges();
  const { t } = useT();

  const avatarSrc = user?.photoURL || user?.avatar || '';

  const navItems = [
    { icon: Home, label: t('home'), path: '/', badge: 0 },
    { icon: Clapperboard, label: 'Reels', path: '/reels', badge: 0 },
    { icon: MessageCircle, label: t('chat'), path: '/chat', badge: 0 },
    { icon: Users, label: t('friends'), path: '/friends', badge: badges.friends },
    { icon: MessageSquare, label: t('topics'), path: '/topics', badge: badges.topics },
  ];

  const isActivePath = (path: string) => location.pathname === path;

  const homeTapRef = useRef<{
    count: number;
    timer: ReturnType<typeof setTimeout> | null;
  }>({ count: 0, timer: null });

  const floatingNavRef = useRef<HTMLDivElement | null>(null);

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    left: number;
    top: number;
    moved: boolean;
  } | null>(null);

  const [position, setPosition] = useState<Position | null>(null);

  useEffect(() => {
    const tabMap: { [key: string]: keyof typeof badges } = {
      '/': 'home',
      '/chat': 'chat',
      '/friends': 'friends',
      '/topics': 'topics',
    };

    const currentTab = tabMap[location.pathname];
    if (currentTab) clearBadge(currentTab);
  }, [location.pathname, clearBadge]);

  useEffect(() => {
    return () => {
      if (homeTapRef.current.timer) {
        clearTimeout(homeTapRef.current.timer);
      }
    };
  }, []);

  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('wizchat-home-pressed'));

    if (location.pathname !== '/') {
      homeTapRef.current.count = 0;
      navigate('/');
      return;
    }

    homeTapRef.current.count += 1;

    if (homeTapRef.current.timer) {
      clearTimeout(homeTapRef.current.timer);
    }

    if (homeTapRef.current.count >= 2) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.scrollingElement?.scrollTo({ top: 0, behavior: 'smooth' });
    }

    homeTapRef.current.timer = setTimeout(() => {
      homeTapRef.current.count = 0;
    }, 500);
  };

  // Restore saved position and centre the pill on first use.
  useEffect(() => {
    const nav = floatingNavRef.current;
    if (!nav) return;

    const width = nav.offsetWidth;
    const height = nav.offsetHeight;

    let saved: Position | null = null;

    try {
      const value = localStorage.getItem(POSITION_KEY);
      if (value) {
        const parsed = JSON.parse(value);

        if (
          typeof parsed.left === 'number' &&
          typeof parsed.top === 'number'
        ) {
          saved = parsed;
        }
      }
    } catch {
      saved = null;
    }

    const next = clampPosition(
      saved?.left ?? (window.innerWidth - width) / 2,
      saved?.top ?? window.innerHeight - height - 22,
      width,
      height
    );

    nav.style.left = `${next.left}px`;
    nav.style.top = `${next.top}px`;
    setPosition(next);

    const resize = () => {
      const current = floatingNavRef.current;
      if (!current) return;

      const rect = current.getBoundingClientRect();

      const adjusted = clampPosition(
        rect.left,
        rect.top,
        current.offsetWidth,
        current.offsetHeight
      );

      current.style.left = `${adjusted.left}px`;
      current.style.top = `${adjusted.top}px`;
      setPosition(adjusted);
    };

    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const handleDragStart = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const nav = floatingNavRef.current;
    if (!nav) return;

    e.preventDefault();

    const rect = nav.getBoundingClientRect();

    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      left: rect.left,
      top: rect.top,
      moved: false,
    };

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    const nav = floatingNavRef.current;

    if (!drag || !nav || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      drag.moved = true;
    }

    const next = clampPosition(
      drag.left + dx,
      drag.top + dy,
      nav.offsetWidth,
      nav.offsetHeight
    );

    nav.style.left = `${next.left}px`;
    nav.style.top = `${next.top}px`;
  };

  const finishDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    const nav = floatingNavRef.current;

    if (!drag || !nav || drag.pointerId !== e.pointerId) return;

    const rect = nav.getBoundingClientRect();

    const next = clampPosition(
      rect.left,
      rect.top,
      nav.offsetWidth,
      nav.offsetHeight
    );

    setPosition(next);

    if (drag.moved) {
      try {
        localStorage.setItem(POSITION_KEY, JSON.stringify(next));
      } catch {
        // Position remains available for this session.
      }
    }

    dragRef.current = null;
  };

  const handleGripKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!position || !floatingNavRef.current) return;

    const step = e.shiftKey ? 40 : 12;
    let left = position.left;
    let top = position.top;

    if (e.key === 'ArrowLeft') left -= step;
    else if (e.key === 'ArrowRight') left += step;
    else if (e.key === 'ArrowUp') top -= step;
    else if (e.key === 'ArrowDown') top += step;
    else return;

    e.preventDefault();

    const nav = floatingNavRef.current;

    const next = clampPosition(
      left,
      top,
      nav.offsetWidth,
      nav.offsetHeight
    );

    nav.style.left = `${next.left}px`;
    nav.style.top = `${next.top}px`;
    setPosition(next);

    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify(next));
    } catch {
      // Ignore unavailable storage.
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Application header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <Logo size="sm" />
              <span className="wizchat-wordmark bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-xl font-bold text-transparent">
                WizchatPro
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationSystem />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full p-0 ring-2 ring-primary ring-offset-2 ring-offset-background transition-all hover:ring-primary/80"
                >
                  <SmartAvatar
                    src={avatarSrc}
                    alt={user?.name}
                    className="h-8 w-8"
                  />
                  <span
                    className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background"
                    aria-label="online"
                  />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-56 rounded-xl border border-border bg-background/90 p-2 shadow-lg backdrop-blur-xl"
                align="end"
                forceMount
              >
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none text-foreground">
                    {user?.name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer text-foreground">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer text-foreground">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to="/premium" className="cursor-pointer text-foreground">
                    <Crown className="mr-2 h-4 w-4" />
                    <span>Premium</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="cursor-pointer p-0 text-foreground"
                  onSelect={(e) => e.preventDefault()}
                >
                  <LogoutButton
                    variant="ghost"
                    size="sm"
                    className="h-auto w-full justify-start p-2"
                  />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-16 md:pb-0">
        {children}
      </main>

      {/* Compact floating glass navigation: tablet and desktop */}
      <div
        ref={floatingNavRef}
        className="fixed z-[60] hidden md:block"
        style={{
          left: position?.left ?? 0,
          top: position?.top ?? 0,
          visibility: position ? 'visible' : 'hidden',
          touchAction: 'none',
        }}
      >
        <div
          className="
            flex items-center gap-1.5
            rounded-full
            border border-white/45 dark:border-white/20
            bg-white/25 dark:bg-slate-900/25
            px-2 py-1.5
            shadow-[0_8px_32px_rgba(0,0,0,0.10)]
            ring-1 ring-white/20 dark:ring-white/10
            backdrop-blur-2xl
          "
        >
          {/* Drag handle */}
          <button
            type="button"
            aria-label="Move navigation. Use arrow keys to reposition."
            title="Drag to move"
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            onKeyDown={handleGripKeyDown}
            className="
              flex h-9 w-6 shrink-0 touch-none
              cursor-grab items-center justify-center
              rounded-full
              text-slate-500 dark:text-slate-300
              hover:bg-white/25 dark:hover:bg-white/10
              hover:text-slate-700 dark:hover:text-white
              active:cursor-grabbing
            "
          >
            <GripVertical className="h-4 w-4" strokeWidth={3} />
          </button>

          <nav
            aria-label="Main navigation"
            className="flex items-center gap-1.5"
          >
            {navItems.map((item) => {
              const active = isActivePath(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  onClick={item.path === '/' ? handleHomeClick : undefined}
                  className={`
                    relative flex h-10 w-10 shrink-0
                    items-center justify-center
                    rounded-full
                    transition-[background-color,color,transform,box-shadow]
                    duration-150 ease-out
                    active:scale-90
                    ${
                      active
                        ? 'bg-primary shadow-[0_3px_12px_rgba(16,185,129,0.30)]'
                        : 'hover:bg-white/30 dark:hover:bg-white/10'
                    }
                  `}
                >
                  <item.icon
                    className={`h-[21px] w-[21px] ${
                      active
                        ? 'text-white'
                        : 'text-slate-500 dark:text-slate-300 group-hover:text-slate-700 dark:group-hover:text-white'
                    }`}
                    strokeWidth={2.8}
                  />

                  {item.badge > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border border-background px-1 text-[9px] font-extrabold"
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Original mobile navigation remains unchanged */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 pt-1 pointer-events-none md:hidden">
        <div className="pointer-events-auto flex items-center justify-around gap-1 rounded-3xl border border-border bg-background/95 px-2 py-2 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/70">
          {navItems.map((item) => {
            const active = isActivePath(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={item.path === '/' ? handleHomeClick : undefined}
                className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2 transition-all duration-200 active:scale-95 ${
                  active
                    ? 'scale-[1.04] bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon
                  className={`h-6 w-6 ${active ? '' : 'app-mobile-nav-icon'}`}
                  strokeWidth={active ? 2.6 : 2.4}
                />

                <span
                  className={`text-[10px] font-medium leading-none ${
                    active ? 'text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {item.label}
                </span>

                {item.badge > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute right-2 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full p-0 px-1 text-[10px]"
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
