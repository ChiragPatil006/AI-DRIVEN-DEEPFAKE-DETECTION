import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

// Simple hash for demo purposes (not production-grade)
const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
};

const generateToken = () => crypto.randomUUID();

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('df_token');
    const userData = localStorage.getItem('df_user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setIsLoading(false);
  }, []);

  const signup = async (name: string, email: string, password: string) => {
    const users = JSON.parse(localStorage.getItem('df_users') || '[]');
    if (users.find((u: any) => u.email === email)) {
      throw new Error('Email already registered');
    }
    const hashedPw = await hashPassword(password);
    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      email,
      createdAt: new Date().toISOString(),
    };
    users.push({ ...newUser, password: hashedPw });
    localStorage.setItem('df_users', JSON.stringify(users));
    const token = generateToken();
    localStorage.setItem('df_token', token);
    localStorage.setItem('df_user', JSON.stringify(newUser));
    setUser(newUser);
  };

  const login = async (email: string, password: string) => {
    const users = JSON.parse(localStorage.getItem('df_users') || '[]');
    const hashedPw = await hashPassword(password);
    const found = users.find((u: any) => u.email === email && u.password === hashedPw);
    if (!found) {
      throw new Error('Invalid email or password');
    }
    const { password: _, ...userData } = found;
    const token = generateToken();
    localStorage.setItem('df_token', token);
    localStorage.setItem('df_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('df_token');
    localStorage.removeItem('df_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
