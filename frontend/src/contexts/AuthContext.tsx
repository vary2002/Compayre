'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient, User, LoginRequest, RegisterRequest } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if we have tokens
        if (apiClient.isAuthenticated()) {
          const storedUser = apiClient.getStoredUser();
          if (storedUser) {
            setUser(storedUser);
          } else {
            // Try to fetch current user
            try {
              const currentUser = await apiClient.getCurrentUser();
              setUser(currentUser);
              localStorage.setItem('user', JSON.stringify(currentUser));
            } catch (error) {
              // Token might be expired, try to refresh
              try {
                await apiClient.refreshToken();
                const currentUser = await apiClient.getCurrentUser();
                setUser(currentUser);
                localStorage.setItem('user', JSON.stringify(currentUser));
              } catch (refreshError) {
                apiClient.clearTokens();
                setUser(null);
              }
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    setIsLoading(true);
    try {
      const result = await apiClient.login(data);
      // Set initial user from login response
      console.log('Setting user from login response:', result.user);
      setUser(result.user);
      
      // Fetch fresh user data from backend to ensure subscription_type and role are up-to-date
      try {
        console.log('Fetching fresh user data from backend...');
        const currentUser = await apiClient.getCurrentUser();
        console.log('Fresh user data received, subscription_type:', currentUser.subscription_type);
        setUser(currentUser);
        localStorage.setItem('user', JSON.stringify(currentUser));
      } catch (error) {
        console.error('Failed to fetch current user after login:', error);
        // Still keep the user from login response as fallback
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    setIsLoading(true);
    try {
      await apiClient.register(data);
      // After registration, don't auto-login. User needs to login manually.
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await apiClient.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      await apiClient.refreshToken();
      if (apiClient.isAuthenticated()) {
        const currentUser = await apiClient.getCurrentUser();
        setUser(currentUser);
        localStorage.setItem('user', JSON.stringify(currentUser));
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      apiClient.clearTokens();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
