import React, { createContext, useContext, useState, useEffect } from 'react';

type ThemeMode = 'light' | 'dark' | 'ultra';

interface ThemeContextType {
  isDarkMode: boolean;
  themeMode: ThemeMode;
  toggleDarkMode: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  isUltraMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as ThemeMode;
    if (savedTheme && ['light', 'dark', 'ultra'].includes(savedTheme)) {
      setThemeModeState(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  const applyTheme = (mode: ThemeMode) => {
    // Remove all theme classes
    document.documentElement.classList.remove('dark', 'ultra');
    
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (mode === 'ultra') {
      document.documentElement.classList.add('ultra');
    }
  };

  const toggleDarkMode = () => {
    const newMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeModeState(newMode);
    applyTheme(newMode);
    localStorage.setItem('theme', newMode);
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    applyTheme(mode);
    localStorage.setItem('theme', mode);
  };

  const isDarkMode = themeMode === 'dark' || themeMode === 'ultra';
  const isUltraMode = themeMode === 'ultra';

  return (
    <ThemeContext.Provider value={{ 
      isDarkMode, 
      themeMode, 
      toggleDarkMode, 
      setThemeMode,
      isUltraMode 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};