import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Mock the mockUserProfile
vi.mock('@/data/mockProfile', () => {
  const mockProfile = {
    id: "1",
    name: "Prathmesh Bavge",
    email: "prathmeshbavge@gmail.com",
    userType: "professional",
    avatar: "/avatars/default.png",
    creditScore: 750,
    preferences: {
      language: "en",
      currency: "INR",
      theme: "light"
    },
    created_at: new Date("2024-01-01")
  };

  return {
    mockUserProfile: mockProfile,
    default: { mockUserProfile: mockProfile }
  };
});

// Import after mocking
import { mockUserProfile } from '@/data/mockProfile';

// Create a test component that uses the AuthContext
const TestComponent = () => {
  const { isAuthenticated, user, login, logout } = useAuth();
  
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
      <div data-testid="user-email">{user?.email || 'No user'}</div>
      <button 
        data-testid="login-button" 
        onClick={() => login('test@example.com', 'password')}
      >
        Login
      </button>
      <button 
        data-testid="logout-button" 
        onClick={logout}
      >
        Logout
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    // Spy on console.log to verify it's being called
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('provides authentication state and user', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initially authenticated with mock user in this implementation
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent(mockUserProfile.email);
  });

  it('handles login correctly', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Click login button
    fireEvent.click(screen.getByTestId('login-button'));

    // Verify console.log was called with the expected message
    expect(console.log).toHaveBeenCalledWith('Login attempted with email: test@example.com');
    
    // User should still be authenticated
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent(mockUserProfile.email);
  });

  it('handles logout correctly', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Click logout button
    fireEvent.click(screen.getByTestId('logout-button'));

    // Verify console.log was called with the expected message
    expect(console.log).toHaveBeenCalledWith('Logout clicked - Mock implementation');

    // User should be logged out after logout
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent('No user');
  });

  it('throws an error when useAuth is used outside of AuthProvider', () => {
    // Suppress the expected error in the console
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Expect the render to throw an error
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');
  });
});