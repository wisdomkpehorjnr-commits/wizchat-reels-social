import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';
import { mockCurrentUser } from '@/lib/mockData';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const savedUser = localStorage.getItem('wizchat_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Mock login - in real app this would call Firebase Auth
      await new Promise(resolve => setTimeout(resolve, 1000));
      const loggedInUser = mockCurrentUser;
      setUser(loggedInUser);
      localStorage.setItem('wizchat_user', JSON.stringify(loggedInUser));
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      // Mock Google login - in real app this would call Firebase Auth
      await new Promise(resolve => setTimeout(resolve, 1000));
      const loggedInUser = mockCurrentUser;
      setUser(loggedInUser);
      localStorage.setItem('wizchat_user', JSON.stringify(loggedInUser));
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('wizchat_user');
  };

  const value = {
    user,
    login,
    loginWithGoogle,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};