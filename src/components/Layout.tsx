
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

interface FloatingPosition {
  left: number;
  top: number;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  originLeft: number;
  originTop: number;
  moved: boolean;
}

const FLOATING_NAV_STORAGE_KEY = 'wizchat_desktop_navigation_position';
const FLOATING_NAV_MARGIN = 12;

const clampPosition = (
  left: number,
  top: number,
  width: number,
  height: number
): FloatingPosition => ({
  left: Math.max(
    FLOATING_NAV_MARGIN,
    Math.min(left, window.innerWidth - width - FLOATING_NAV_MARGIN)
  ),
  top: Math.max(
    FLOATING_NAV_MARGIN,
    Math.min(top, window.innerHeight - height - FLOATING_NAV_MARGIN)
  ),
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

  const homeTapRef = useRef<{
    count: number;
    timer: ReturnType<typeof setTimeout> | null;
  }>({ count: 0, timer: null });

  const floatingNavRef = useRef<HTMLDivElement | null>(null);
  const dragHandleRef = useRef<HTMLButtonElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);

  const [floatingPosition, setFloatingPosition] =
    useState<FloatingPosition | null>(null);

  const isActivePath = (path: string) => location.pathname === path;

  // Preserve the existing notification badge behavior.
  useEffect(() => {
    const tabMap: { [key: string]: keyof typeof badges } = {
      '/': 'home',
      '/chat': 'chat',
      '/friends': 'friends',
      '/topics': 'topics',
    };

    const currentTab = tabMap[location.pathname];

    if (currentTab) {
      clearBadge(currentTab);
    }
  }, [location.pathname, clearBadge]);

  // Preserve Home double-tap behavior and clean up its timer.
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
      document.scrollingElement?.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }

    homeTapRef.current.timer = setTimeout(() => {
      homeTapRef.current.count = 0;
    }, 500);
  };

  // Position the floating navigation after its actual dimensions are known.
  // The saved position is restored, then clamped to the current screen.
  useEffect(() => {
    const nav = floatingNavRef.current;
    if (!nav) return;

    const width = nav.offsetWidth;
    const height = nav.offsetHeight;

    let savedPosition: FloatingPosition | null = null;

    try {
      const stored = localStorage.getItem(FLOATING_NAV_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);

        if (
          typeof parsed?.left === 'number' &&
          typeof parsed?.top === 'number'
        ) {
          savedPosition = parsed;
        }
      }
    } catch {
      savedPosition = null;
    }

    const defaultPosition = {
      left: (window.innerWidth - width) / 2,
      top: window.innerHeight - height - 28,
    };

    const nextPosition = clampPosition(
      savedPosition?.left ?? defaultPosition.left,
      savedPosition?.top ?? defaultPosition.top,
      width,
      height
    );

    nav.style.left = `${nextPosition.left}px`;
    nav.style.top = `${nextPosition.top}px`;

    setFloatingPosition(nextPosition);

    const handleResize = () => {
      const currentNav = floatingNavRef.current;
      if (!currentNav) return;

      const rect = currentNav.getBoundingClientRect();

      const next = clampPosition(
        rect.left,
        rect.top,
        currentNav.offsetWidth,
        currentNav.offsetHeight
      );

      currentNav.style.left = `${next.left}px`;
      currentNav.style.top = `${next.top}px`;

      setFloatingPosition(next);

      try {
        localStorage.setItem(
          FLOATING_NAV_STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch {
        // Position persistence is optional.
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Start dragging from the dedicated grip.
  // Pointer capture keeps dragging responsive even when the pointer moves
  // outside the grip or the navigation pill.
  const handleDragStart = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const nav = floatingNavRef.current;
    if (!nav) return;

    e.preventDefault();

    const rect = nav.getBoundingClientRect();

    dragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originLeft: rect.left,
      originTop: rect.top,
      moved: false,
    };

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // Move the navigation directly with the pointer.
  // No React state update or CSS transition is used during the drag,
  // avoiding delayed or floaty movement.
  const handleDragMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragStateRef.current;
    const nav = floatingNavRef.current;

    if (!drag || !nav || drag.pointerId !== e.pointerId) return;

    const deltaX = e.clientX - drag.startX;
    const deltaY = e.clientY - drag.startY;

    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      drag.moved = true;
    }

    const next = clampPosition(
      drag.originLeft + deltaX,
      drag.originTop + deltaY,
      nav.offsetWidth,
      nav.offsetHeight
    );

    nav.style.left = `${next.left}px`;
    nav.style.top = `${next.top}px`;
  };

  const finishDragging = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragStateRef.current;
    const nav = floatingNavRef.current;

    if (!drag || !nav || drag.pointerId !== e.pointerId) return;

    const rect = nav.getBoundingClientRect();

    const finalPosition = clampPosition(
      rect.left,
      rect.top,
      nav.offsetWidth,
      nav.offsetHeight
    );

    setFloatingPosition(finalPosition);

    if (drag.moved) {
      try {
        localStorage.setItem(
          FLOATING_NAV_STORAGE_KEY,
          JSON.stringify(finalPosition)
        );
      } catch {
        // Keep the current position for this session if storage is unavailable.
      }
    }

    dragStateRef.current = null;
  };

  // Keyboard support for repositioning the navigation.
  const handleDragKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const nav = floatingNavRef.current;
    if (!nav || !floatingPosition) return;

    const step = e.shiftKey ? 40 : 12;

    let left = floatingPosition.left;
    let top = floatingPosition.top;

    switch (e.key) {
      case 'ArrowLeft':
        left -= step;
        break;
      case 'ArrowRight':
        left += step;
        break;
      case 'ArrowUp':
        top -= step;
        break;
      case 'ArrowDown':
        top += step;
        break;
      default:
        return;
    }

    e.preventDefault();

    const next = clampPosition(
      left,
      top,
      nav.offsetWidth,
      nav.offsetHeight
    );

    nav.style.left = `${next.left}px`;
    nav.style.top = `${next.top}px`;

    setFloatingPosition(next);

    try {
      localStorage.setItem(
        FLOATING_NAV_STORAGE_KEY,
        JSON.stringify(next)
      );
    } catch {
      // Keyboard repositioning still works without storage.
    }
  };

  const savePosition = useCallback(() => {
    if (!floatingNavRef.current) return;

    const rect = floatingNavRef.current.getBoundingClientRect();

    const next = clampPosition(
      rect.left,
      rect.top,
      floatingNavRef.current.offsetWidth,
      floatingNavRef.current.offsetHeight
    );

    setFloatingPosition(next);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Main application header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <Logo size="sm" />
              <span className="wizchat-wordmark bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-xl font-extrabold text-transparent">
                WizchatPro
              </span>
            </Link>
          </div>

          {/* The old lightweight desktop navigation has been removed. */}

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
                className="w-56 rounded-xl border border-border bg-background/95 p-2 shadow-xl backdrop-blur-xl"
                align="end"
                forceMount
              >
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-bold leading-none text-foreground">
                    {user?.name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to="/premium" className="cursor-pointer">
                    <Crown className="mr-2 h-4 w-4" />
                    <span>Premium</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="cursor-pointer p-0"
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

      {/* Main application content */}
      <main className="flex-1 pb-16 md:pb-0">
        {children}
      </main>

      {/* Desktop and tablet floating navigation */}
      <div
        ref={floatingNavRef}
        className="fixed z-[60] hidden md:block"
        style={{
          left: floatingPosition?.left ?? 0,
          top: floatingPosition?.top ?? 0,
          visibility: floatingPosition ? 'visible' : 'hidden',
          touchAction: 'none',
        }}
      >
        <div className="flex items-center gap-1.5 rounded-[24px] border border-border/70 bg-background/85 p-2 shadow-[0_12px_45px_rgba(0,0,0,0.16)] ring-1 ring-black/[0.03] backdrop-blur-2xl dark:shadow-[0_14px_50px_rgba(0,0,0,0.55)]">
          {/* Dedicated drag grip */}
          <button
            ref={dragHandleRef}
            type="button"
            aria-label="Move navigation bar. Use arrow keys to reposition."
            title="Drag to move navigation"
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={finishDragging}
            onPointerCancel={finishDragging}
            onKeyDown={handleDragKeyDown}
            className="flex h-11 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="h-5 w-5" strokeWidth={3} />
          </button>

          <nav
            aria-label="Main navigation"
            className="flex items-center gap-1"
          >
            {navItems.map((item) => {
              const active = isActivePath(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={
                    item.path === '/'
                      ? handleHomeClick
                      : undefined
                  }
                  aria-current={active ? 'page' : undefined}
                  className={`group relative flex min-w-[82px] flex-1 items-center justify-center gap-2 rounded-[17px] px-3.5 py-3 transition-all duration-200 ease-out active:scale-[0.96] lg:min-w-[108px] ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-[0_5px_16px_rgba(16,185,129,0.24)]'
                      : 'text-muted-foreground hover:bg-muted/90 hover:text-foreground'
                  }`}
                >
                  <item.icon
                    className="h-[22px] w-[22px] shrink-0"
                    strokeWidth={active ? 3 : 2.7}
                  />

                  <span
                    className={`hidden whitespace-nowrap text-[13px] tracking-[-0.01em] lg:inline ${
                      active ? 'font-extrabold' : 'font-bold'
                    }`}
                  >
                    {item.label}
                  </span>

                  {item.badge > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background p-0 text-[10px] font-extrabold"
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </Badge>
                  )}

                  {active && (
                    <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary-foreground/90 lg:hidden" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Original mobile navigation — unchanged and mobile-only */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 pt-1 pointer-events-none md:hidden">
        <div className="pointer-events-auto flex items-center justify-around gap-1 rounded-3xl border border-border bg-background/95 px-2 py-2 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/70">
          {navItems.map((item) => {
            const active = isActivePath(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={
                  item.path === '/'
                    ? handleHomeClick
                    : undefined
                }
                className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2 transition-all duration-200 active:scale-95 ${
                  active
                    ? 'scale-[1.04] bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon
                  className={`h-6 w-6 ${
                    active ? '' : 'app-mobile-nav-icon'
                  }`}
                  strokeWidth={active ? 2.6 : 2.4}
                />

                <span
                  className={`text-[10px] font-medium leading-none ${
                    active
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground'
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
