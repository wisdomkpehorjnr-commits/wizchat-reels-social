import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Logo from '@/components/Logo';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import OfflineScreen from '@/components/OfflineScreen';

type Screen = 'login' | 'signup';

const Login = () => {
  const { user, login, signUp, loginWithGoogle, loading } = useAuth();
  const { toast } = useToast();
  // Launch directly into authentication; no intermediate welcome screen.
  const [screen, setScreen] = useState<Screen>('login');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (user && !loading) return <Navigate to="/" replace />;
  if (isOffline) return <OfflineScreen />;

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Missing information", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    setIsLoggingIn(true);
    try {
      await login(email, password);
      toast({ title: "Welcome back!", description: "You've successfully signed in." });
    } catch (error: any) {
      toast({ title: "Login failed", description: error.message || "Please check your credentials.", variant: "destructive" });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      toast({ title: "Missing information", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Password mismatch", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    setIsLoggingIn(true);
    try {
      await signUp(email, password, name || undefined);
      toast({ title: "Account created!", description: "Please check your email to verify your account." });
    } catch (error: any) {
      toast({ title: "Sign up failed", description: error.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      toast({ title: "Google login failed", description: error.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-hidden relative">
      {/* Top colored section with wave */}
      <div className="relative flex-shrink-0" style={{ minHeight: '35vh' }}>
        <div className="absolute inset-0 bg-primary overflow-hidden">
          {/* Topographic pattern overlay */}
          <svg className="absolute inset-0 w-full h-full opacity-15" viewBox="0 0 400 400" preserveAspectRatio="none">
            <defs>
              <pattern id="topo" patternUnits="userSpaceOnUse" width="100" height="100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary-foreground" />
                <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary-foreground" />
                <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary-foreground" />
                <path d="M0 60 Q25 40 50 60 T100 60" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary-foreground" />
                <path d="M0 30 Q25 10 50 30 T100 30" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary-foreground" />
              </pattern>
            </defs>
            <rect width="400" height="400" fill="url(#topo)" />
          </svg>

          {/* Floating decorative shapes */}
          <motion.div
            animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-[15%] left-[10%] w-16 h-16 rounded-full border border-primary-foreground/20"
          />
          <motion.div
            animate={{ y: [0, 10, 0], rotate: [0, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute top-[25%] right-[15%] w-24 h-24 rounded-full border border-primary-foreground/15"
          />
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            className="absolute top-[10%] right-[30%] w-8 h-8 rounded-full bg-primary-foreground/10"
          />
        </div>

        {/* Wave separator */}
        <svg
          className="absolute bottom-0 left-0 w-full"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          style={{ height: '80px' }}
        >
          <path
            d="M0,40 C360,120 720,0 1080,60 C1260,90 1380,50 1440,40 L1440,120 L0,120 Z"
            className="fill-background"
          />
        </svg>

        {/* Logo centered in the colored area */}
        <AnimatePresence mode="wait">
          {(
            <motion.div
              key="form-logo"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="relative z-10 flex items-center justify-center pt-12 pb-16"
              style={{ minHeight: '35vh' }}
            >
              <Logo size="lg" className="shadow-lg" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom content area */}
      <div className="flex-1 bg-background px-6 pb-8 -mt-2 relative z-10">
        <AnimatePresence mode="wait">
          {/* Sign In Screen */}
          {screen === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35 }}
              className="max-w-sm mx-auto space-y-5 pt-2"
            >
              <div>
                <h2 className="text-2xl font-bold text-foreground">Sign in</h2>
                <div className="w-10 h-0.5 bg-primary mt-1 rounded-full" />
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-foreground font-medium text-sm">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="demo@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoggingIn}
                      className="pl-10 bg-transparent border-0 border-b border-border rounded-none focus:ring-0 focus:border-primary text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-foreground font-medium text-sm">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoggingIn}
                      className="pl-10 pr-10 bg-transparent border-0 border-b border-border rounded-none focus:ring-0 focus:border-primary text-foreground placeholder:text-muted-foreground"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoggingIn || !email || !password}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50"
                >
                  {isLoggingIn ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground" />
                      <span>Signing in...</span>
                    </div>
                  ) : 'Login'}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or</span></div>
              </div>

              {/* Google */}
              <Button onClick={handleGoogleLogin} disabled={isLoggingIn} variant="outline" className="w-full h-11 border-border hover:bg-accent text-foreground rounded-xl transition-all">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Don't have an Account?{' '}
                <button onClick={() => setScreen('signup')} className="text-primary font-semibold hover:underline">Sign up</button>
              </p>
            </motion.div>
          )}

          {/* Sign Up Screen */}
          {screen === 'signup' && (
            <motion.div
              key="signup"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35 }}
              className="max-w-sm mx-auto space-y-4 pt-2"
            >
              <div>
                <h2 className="text-2xl font-bold text-foreground">Sign up</h2>
                <div className="w-10 h-0.5 bg-primary mt-1 rounded-full" />
              </div>

              <form onSubmit={handleEmailSignUp} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-name" className="text-foreground font-medium text-sm">Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="signup-name" type="text" placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} disabled={isLoggingIn}
                      className="pl-10 bg-transparent border-0 border-b border-border rounded-none focus:ring-0 focus:border-primary text-foreground placeholder:text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-foreground font-medium text-sm">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="signup-email" type="email" placeholder="demo@email.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoggingIn}
                      className="pl-10 bg-transparent border-0 border-b border-border rounded-none focus:ring-0 focus:border-primary text-foreground placeholder:text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-foreground font-medium text-sm">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="signup-password" type={showPassword ? 'text' : 'password'} placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoggingIn}
                      className="pl-10 pr-10 bg-transparent border-0 border-b border-border rounded-none focus:ring-0 focus:border-primary text-foreground placeholder:text-muted-foreground" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-foreground font-medium text-sm">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="confirm-password" type={showConfirm ? 'text' : 'password'} placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isLoggingIn}
                      className="pl-10 pr-10 bg-transparent border-0 border-b border-border rounded-none focus:ring-0 focus:border-primary text-foreground placeholder:text-muted-foreground" />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" disabled={isLoggingIn || !email || !password || !confirmPassword}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50">
                  {isLoggingIn ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground" />
                      <span>Creating account...</span>
                    </div>
                  ) : 'Create Account'}
                </Button>
              </form>

              {/* Google */}
              <Button onClick={handleGoogleLogin} disabled={isLoggingIn} variant="outline" className="w-full h-11 border-border hover:bg-accent text-foreground rounded-xl transition-all">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an Account?{' '}
                <button onClick={() => setScreen('login')} className="text-primary font-semibold hover:underline">Sign in</button>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Login;
