import React, { createContext, useContext, useState } from 'react';
import mockProfileData, { mockUserProfile } from '@/data/mockProfile';
import { User } from '@/types/user';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => void;
  logout: () => void;
  updateProfile: (data: { name?: string; email?: string; avatar?: string }) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // State for authentication status and user
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true); // Default to true for mock implementation
  const [user, setUser] = useState<User | null>(mockUserProfile); // Default to mock user

  // Mock login function
  const login = (email: string, password: string) => {
    console.log(`Login attempted with email: ${email}`);
    // In a real implementation, this would validate credentials
    // For now, we'll just set the user to the mock profile
    setIsAuthenticated(true);
    setUser(mockUserProfile);
  };

  // Mock logout function
  const logout = () => {
    console.log('Logout clicked - Mock implementation');
    // In a real implementation, this would clear tokens, etc.
    setIsAuthenticated(false);
    setUser(null);
  };

  // Mock update profile function
  const updateProfile = (data: { name?: string; email?: string; avatar?: string }) => {
    console.log('Update profile - Mock implementation', data);
    if (user) {
      setUser({
        ...user,
        ...data
      });
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
