
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { User as AppUser } from '@/types';

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthProvider: Setting up auth state listener');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        
        if (session?.user) {
          console.log('User authenticated, fetching profile...');
          try {
            // Fetch user profile from our profiles table
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            if (error) {
              console.error('Error fetching profile:', error);
              // If profile doesn't exist, create one
              if (error.code === 'PGRST116') {
                console.log('Profile not found, creating one...');
                const { data: newProfile, error: createError } = await supabase
                  .from('profiles')
                  .insert({
                    id: session.user.id,
                    email: session.user.email || '',
                    username: session.user.email?.split('@')[0] || 'user',
                    name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
                    avatar: session.user.user_metadata?.avatar_url || ''
                  })
                  .select()
                  .single();
                
                if (createError) {
                  console.error('Error creating profile:', createError);
                } else {
                  console.log('Profile created:', newProfile);
                  if (newProfile) {
                    const userData = {
                      id: newProfile.id,
                      name: newProfile.name,
                      username: newProfile.username,
                      email: newProfile.email,
                      photoURL: newProfile.avatar || '',
                      avatar: newProfile.avatar || '',
                      createdAt: new Date(newProfile.created_at)
                    };
                    console.log('Setting user data:', userData);
                    setUser(userData);
                  }
                }
              }
            } else if (profile) {
              const userData = {
                id: profile.id,
                name: profile.name,
                username: profile.username,
                email: profile.email,
                photoURL: profile.avatar || '',
                avatar: profile.avatar || '',
                createdAt: new Date(profile.created_at)
              };
              console.log('Setting user data:', userData);
              setUser(userData);
            }
          } catch (profileError) {
            console.error('Error handling profile:', profileError);
          }
        } else {
          console.log('No user, clearing user state');
          setUser(null);
        }
        setLoading(false);
      }
    );

    // Get initial session
    console.log('AuthProvider: Getting initial session');
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting initial session:', error);
      }
      console.log('Initial session:', session?.user?.id);
      setSession(session);
      if (!session) {
        setLoading(false);
      }
    });

    return () => {
      console.log('AuthProvider: Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    console.log('AuthProvider: Sign up attempt for:', email);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      if (error) {
        console.error('Sign up error:', error);
        throw error;
      }
      console.log('Sign up successful:', data.user?.id);
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    console.log('AuthProvider: Login attempt for:', email);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        console.error('Login error:', error);
        throw error;
      }
      console.log('Login successful:', data.user?.id);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    console.log('AuthProvider: Google login attempt');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
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
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    console.log('AuthProvider: Logout attempt');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        throw error;
      }
      setUser(null);
      setSession(null);
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    login,
    signUp,
    loginWithGoogle,
    logout,
    loading,
  };

  console.log('AuthProvider render - user:', user?.id, 'loading:', loading);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
