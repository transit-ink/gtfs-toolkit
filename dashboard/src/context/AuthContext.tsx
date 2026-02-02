import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import axios from '../utils/axios';

export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  isEmailVerified: boolean;
  profileUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  api: typeof axios;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuthenticated(false);
  };

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('/auth/profile');
      const userData = response.data;
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      // If profile fetch fails, user might not be authenticated
      logout();
    }
  };

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('user');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setIsAuthenticated(true);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          // Fetch fresh user data
          fetchUserProfile();
        } catch {
          // If stored user is invalid, try to fetch from API
          fetchUserProfile();
        }
      } else {
        // No stored user, fetch from API
        fetchUserProfile();
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials: { username: string; password: string }) => {
    const response = await axios.post('/auth/login', {
      username: credentials.username,
      password: credentials.password,
    });
    const { token } = response.data;
    localStorage.setItem('auth_token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setIsAuthenticated(true);
    // Fetch full user profile after login
    await fetchUserProfile();
  };

  const refreshUser = async () => {
    await fetchUserProfile();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, refreshUser, api: axios }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
