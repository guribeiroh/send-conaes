import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CORRECT_PASSWORD = 'cona0713';
const AUTH_KEY = 'conaes_auth';
const EXPIRY_HOURS = 12;

interface AuthData {
  isAuthenticated: boolean;
  timestamp: number;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    try {
      const authData = localStorage.getItem(AUTH_KEY);
      if (authData) {
        const parsed: AuthData = JSON.parse(authData);
        const now = Date.now();
        const hoursPassed = (now - parsed.timestamp) / (1000 * 60 * 60);
        
        if (parsed.isAuthenticated && hoursPassed < EXPIRY_HOURS) {
          setIsAuthenticated(true);
        } else {
          // Expirou, limpar localStorage
          localStorage.removeItem(AUTH_KEY);
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      localStorage.removeItem(AUTH_KEY);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (password: string): boolean => {
    if (password === CORRECT_PASSWORD) {
      const authData: AuthData = {
        isAuthenticated: true,
        timestamp: Date.now()
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}; 