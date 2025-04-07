import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import { ROUTES } from '@/config/constants';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="flex h-16 items-center px-4">
          <div className="flex items-center space-x-4">
            <Link to={ROUTES.DASHBOARD} className="font-bold">
              Finance App
            </Link>
            <div className="flex space-x-4">
              <Link to={ROUTES.DASHBOARD}>
                <Button variant={isActive(ROUTES.DASHBOARD) ? 'default' : 'ghost'} size="sm">
                  Dashboard
                </Button>
              </Link>
              <Link to={ROUTES.EXPENSES}>
                <Button variant={isActive(ROUTES.EXPENSES) ? 'default' : 'ghost'} size="sm">
                  Expenses
                </Button>
              </Link>
              <Link to={ROUTES.BUDGET}>
                <Button variant={isActive(ROUTES.BUDGET) ? 'default' : 'ghost'} size="sm">
                  Budget
                </Button>
              </Link>
            </div>
          </div>
          <div className="ml-auto flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </nav>
      <main className="container mx-auto py-6">{children}</main>
    </div>
  );
};
