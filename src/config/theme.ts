import { THEME } from './constants';

/**
 * Theme configuration
 */
export const themeConfig = {
  light: {
    primary: '#28A745', // Green for INR
    secondary: '#FFC107', // Gold for INR
    success: '#28A745',
    warning: '#FFC107',
    error: '#DC3545',
    background: '#FFFFFF',
    surface: '#F8F9FA',
    text: '#212529',
    textSecondary: '#6C757D',
    border: '#DEE2E6',
  },
  dark: {
    primary: '#20C997', // Teal for INR
    secondary: '#FFD700', // Gold for INR
    success: '#20C997',
    warning: '#FFD700',
    error: '#FF6B6B',
    background: '#121212',
    surface: '#1E1E1E',
    text: '#FFFFFF',
    textSecondary: '#ADB5BD',
    border: '#343A40',
  },
};

/**
 * Theme type
 */
export type Theme = keyof typeof THEME;

/**
 * Theme context type
 */
export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/**
 * Theme provider props
 */
export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}
