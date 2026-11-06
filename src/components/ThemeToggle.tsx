
import React from 'react';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleDarkMode}
      className="w-9 h-9 p-0"
      aria-label="Switch theme"
    >
      {isDarkMode ? (
        <Sun className="w-4 h-4 app-chrome-icon" />
      ) : (
        <Moon className="w-4 h-4 app-chrome-icon" />
      )}
    </Button>
  );
};

export default ThemeToggle;
