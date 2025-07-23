import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        // Set up auth state listener first
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state changed:', event, session?.user?.id);
          
          if (!mounted) return;

          if (event === 'SIGNED_IN' && session?.user) {
            setTimeout(() => {
              if (mounted) {
                loadUserProfile(session.user.id);
              }
            }, 0);
          } else if (event === 'SIGNED_OUT') {
            if (mounted) {
              setUser(null);
              setLoading(false);
            }
          }
        });

        // Check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Initial session check:', { session: !!session, error });

        if (error) {
          console.error('Session check error:', error);
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        if (session?.user) {
          console.log('Found existing session for user:', session.user.id);
          await loadUserProfile(session.user.id);
        } else {
          console.log('No existing session found');
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
        }

        return () => {
          mounted = false;
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('Loading user profile for:', userId);
      
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        
        // If profile doesn't exist, create it
        if (error.code === 'PGRST116') {
          console.log('Profile not found, creating new profile...');
          const { data: authUser } = await supabase.auth.getUser();
          
          if (authUser.user) {
            const newProfile = {
              id: userId,
              username: authUser.user.email?.split('@')[0] || 'user',
              name: authUser.user.user_metadata?.full_name || authUser.user.email?.split('@')[0] || 'User',
              email: authUser.user.email || '',
              avatar: authUser.user.user_metadata?.avatar_url || ''
            };

            const { data: createdProfile, error: createError } = await supabase
              .from('profiles')
              .insert(newProfile)
              .select()
              .single();

            if (createError) {
              console.error('Error creating profile:', createError);
              setLoading(false);
              return;
            }

            profile = createdProfile;
            console.log('Created new profile:', profile);
          }
        } else {
          setLoading(false);
          return;
        }
      }

      if (profile) {
        const userProfile: User = {
          id: profile.id,
          name: profile.name,
          username: profile.username,
          email: profile.email,
          photoURL: profile.avatar || '',
          avatar: profile.avatar || '',
          bio: (profile as any).bio || undefined,
          location: (profile as any).location || undefined,
          website: (profile as any).website || undefined,
          birthday: (profile as any).birthday ? new Date((profile as any).birthday) : undefined,
          gender: (profile as any).gender || undefined,
          pronouns: (profile as any).pronouns || undefined,
          coverImage: (profile as any).cover_image || undefined,
          isPrivate: (profile as any).is_private || false,
          followerCount: (profile as any).follower_count || 0,
          followingCount: (profile as any).following_count || 0,
          profileViews: (profile as any).profile_views || 0,
          createdAt: new Date(profile.created_at)
        };

        console.log('Setting user profile:', userProfile);
        setUser(userProfile);
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    console.log('Attempting login for:', email);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        throw error;
      }

      console.log('Login successful:', data.user?.id);
      // User profile will be loaded via onAuthStateChange
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name?: string) => {
    console.log('Attempting signup for:', email);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name || email.split('@')[0],
          },
          emailRedirectTo: `${window.location.origin}/`
        },
      });

      if (error) {
        console.error('Signup error:', error);
        throw error;
      }

      console.log('Signup successful:', data.user?.id);
      // User profile will be created via trigger or onAuthStateChange
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    console.log('Attempting Google login...');
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        console.error('Google login error:', error);
        throw error;
      }

      console.log('Google login initiated');
      // User profile will be loaded via onAuthStateChange after redirect
    } catch (error) {
      console.error('Google login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    console.log('Logging out...');
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        throw error;
      }
      
      console.log('Logout successful');
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signUp, loginWithGoogle, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
