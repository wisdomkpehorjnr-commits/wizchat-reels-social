
import React, { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Home, PlayCircle, MessageCircle, Users, User, Settings, MessageSquare, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationBadges } from '@/hooks/useNotificationBadges';
import { useImageCache } from '@/hooks/useImageCache';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import NotificationSystem from './NotificationSystem';
import LogoutButton from './LogoutButton';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { badges, clearBadge } = useNotificationBadges();
  const avatarSrc = user?.photoURL || user?.avatar || '';
  const { cachedUrl: cachedAvatar } = useImageCache(avatarSrc);

  const navItems = [
    { icon: Home, label: 'Home', path: '/', badge: 0 }, // No badge for Home
    { icon: PlayCircle, label: 'Reels', path: '/reels', badge: badges.reels },
    { icon: MessageCircle, label: 'Chat', path: '/chat', badge: 0 },
    { icon: Users, label: 'Friends', path: '/friends', badge: badges.friends },
    { icon: MessageSquare, label: 'Topics', path: '/topics', badge: badges.topics },
  ];

  // Clear badge when navigating to a tab
  useEffect(() => {
    const tabMap: { [key: string]: keyof typeof badges } = {
      '/': 'home',
      '/reels': 'reels',
      '/chat': 'chat',
      '/friends': 'friends',
      '/topics': 'topics'
    };
    
    const currentTab = tabMap[location.pathname];
    if (currentTab) {
      clearBadge(currentTab);
    }
  }, [location.pathname, clearBadge]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (homeTapRef.current.timer) {
        clearTimeout(homeTapRef.current.timer);
      }
    };
  }, []);

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  const homeTapRef = useRef<{ count: number; timer: NodeJS.Timeout | null }>({ count: 0, timer: null });

  const handleHomeClick = (e: React.MouseEvent) => {
    // Multi-tap (2+) on Home tab scrolls to top
    if (location.pathname === '/') {
      e.preventDefault();

      homeTapRef.current.count += 1;

      if (homeTapRef.current.timer) {
        clearTimeout(homeTapRef.current.timer);
      }

      // Scroll to top on every tap after the first within the window
      if (homeTapRef.current.count >= 2) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      homeTapRef.current.timer = setTimeout(() => {
        homeTapRef.current.count = 0;
      }, 400);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <Logo size="sm" />
              <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                WizchatPro
              </span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant={isActivePath(item.path) ? "default" : "ghost"}
                size="sm"
                asChild
                className={isActivePath(item.path) ? "bg-primary text-primary-foreground" : "text-foreground hover:text-foreground"}
              >
                <Link 
                  to={item.path} 
                  className="flex items-center gap-2 relative"
                  onClick={item.path === '/' ? handleHomeClick : undefined}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden lg:inline text-foreground">{item.label}</span>
                  {item.badge && item.badge > 0 ? (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </Badge>
                  ) : null }
                </Link>
              </Button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationSystem />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 ring-2 ring-primary ring-offset-2 ring-offset-background transition-all hover:ring-primary/80">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={cachedAvatar || avatarSrc} alt={user?.name} />
                    <AvatarFallback className="text-foreground bg-muted">
                      {user?.name?.charAt(0) || user?.email?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" aria-label="online" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className={"w-56 rounded-xl p-2 backdrop-blur-md bg-white/10 border border-white/20 shadow-lg transform-gpu transition-all duration-150 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[side=right]:slide-in-from-left-2"}
                align="end"
                forceMount
              >
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none text-foreground">{user?.name}</p>
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
                  className="cursor-pointer text-foreground p-0"
                  onSelect={(e) => e.preventDefault()}
                >
                  <LogoutButton 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start h-auto p-2"
                  />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-16 md:pb-0">
        {children}
      </main>

      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-around px-4 py-2">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant={isActivePath(item.path) ? "default" : "ghost"}
              size="sm"
              asChild
              className="flex-col h-auto py-2 relative"
            >
              <Link 
                to={item.path}
                onClick={item.path === '/' ? handleHomeClick : undefined}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-xs mt-1 text-foreground">{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center"
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </Badge>
                ) : null }
              </Link>
            </Button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
