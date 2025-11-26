export interface ReelTheme {
  isDark: boolean;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    surfaceVariant: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    success: string;
    error: string;
    warning: string;
    info: string;
    overlay: string;
    overlayStrong: string;
  };
  gradients: {
    actionBarBg: string;
    actionBarBgLight: string;
    overlayGradient: string;
    shimmerGradient: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

const darkTheme: ReelTheme = {
  isDark: true,
  colors: {
    primary: '#ff006e',
    secondary: '#8338ec',
    background: '#0a0e27',
    surface: '#1a1f3a',
    surfaceVariant: '#2a2f4a',
    text: '#ffffff',
    textSecondary: '#e0e0e0',
    textTertiary: '#a0a0a0',
    border: '#3a3f4a',
    success: '#00d084',
    error: '#ff006e',
    warning: '#ffb703',
    info: '#3a86ff',
    overlay: 'rgba(0, 0, 0, 0.4)',
    overlayStrong: 'rgba(0, 0, 0, 0.7)',
  },
  gradients: {
    actionBarBg: 'linear-gradient(180deg, rgba(255, 0, 110, 0.15) 0%, rgba(131, 56, 236, 0.15) 100%)',
    actionBarBgLight: 'linear-gradient(180deg, rgba(255, 0, 110, 0.08) 0%, rgba(131, 56, 236, 0.08) 100%)',
    overlayGradient: 'linear-gradient(to top, rgba(10, 14, 39, 0.9), transparent)',
    shimmerGradient:
      'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)',
  },
  shadows: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.4)',
    md: '0 4px 12px rgba(0, 0, 0, 0.5)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.6)',
    xl: '0 12px 32px rgba(0, 0, 0, 0.7)',
  },
};

const lightTheme: ReelTheme = {
  isDark: false,
  colors: {
    primary: '#ff006e',
    secondary: '#8338ec',
    background: '#ffffff',
    surface: '#f5f5f5',
    surfaceVariant: '#eeeeee',
    text: '#1a1a1a',
    textSecondary: '#424242',
    textTertiary: '#757575',
    border: '#e0e0e0',
    success: '#00d084',
    error: '#ff006e',
    warning: '#ffb703',
    info: '#3a86ff',
    overlay: 'rgba(0, 0, 0, 0.2)',
    overlayStrong: 'rgba(0, 0, 0, 0.4)',
  },
  gradients: {
    actionBarBg: 'linear-gradient(180deg, rgba(255, 0, 110, 0.08) 0%, rgba(131, 56, 236, 0.08) 100%)',
    actionBarBgLight: 'linear-gradient(180deg, rgba(255, 0, 110, 0.04) 0%, rgba(131, 56, 236, 0.04) 100%)',
    overlayGradient: 'linear-gradient(to top, rgba(255, 255, 255, 0.95), transparent)',
    shimmerGradient:
      'linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, 0.05) 50%, transparent 100%)',
  },
  shadows: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.1)',
    md: '0 4px 12px rgba(0, 0, 0, 0.12)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.14)',
    xl: '0 12px 32px rgba(0, 0, 0, 0.16)',
  },
};

export const themeManager = {
  getDarkTheme: () => darkTheme,
  getLightTheme: () => lightTheme,
  getTheme: (isDark: boolean) => (isDark ? darkTheme : lightTheme),
};

// Theme-aware utility functions
export const getThemeColor = (theme: ReelTheme, colorKey: keyof ReelTheme['colors']) => {
  return theme.colors[colorKey];
};

export const getThemeGradient = (theme: ReelTheme, gradientKey: keyof ReelTheme['gradients']) => {
  return theme.gradients[gradientKey];
};

export const getThemeShadow = (theme: ReelTheme, shadowKey: keyof ReelTheme['shadows']) => {
  return theme.shadows[shadowKey];
};

// Button styling based on theme
export const getButtonStyles = (theme: ReelTheme, variant: 'primary' | 'secondary' | 'ghost' = 'primary') => {
  const baseStyles = {
    primary: {
      background: theme.colors.primary,
      color: '#ffffff',
      '&:hover': {
        opacity: 0.9,
      },
      '&:active': {
        opacity: 0.8,
      },
    },
    secondary: {
      background: 'transparent',
      color: theme.colors.text,
      border: `1px solid ${theme.colors.border}`,
      '&:hover': {
        background: theme.colors.surfaceVariant,
      },
    },
    ghost: {
      background: 'transparent',
      color: theme.colors.text,
      '&:hover': {
        background: theme.colors.overlay,
      },
    },
  };

  return baseStyles[variant];
};

// Icon color utilities
export const getIconColor = (theme: ReelTheme, isActive: boolean = false) => {
  return isActive ? theme.colors.primary : theme.colors.textSecondary;
};

// Text color utilities
export const getTextColor = (theme: ReelTheme, variant: 'primary' | 'secondary' | 'tertiary' = 'primary') => {
  const colors = {
    primary: theme.colors.text,
    secondary: theme.colors.textSecondary,
    tertiary: theme.colors.textTertiary,
  };
  return colors[variant];
};
