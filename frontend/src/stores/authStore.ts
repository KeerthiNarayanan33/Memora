// Auth store using Zustand
import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const storedUser = localStorage.getItem('meetguard_user');
const storedToken = localStorage.getItem('meetguard_token');

export const useAuthStore = create<AuthState>((set) => ({
  user: storedUser ? JSON.parse(storedUser) : null,
  token: storedToken,
  isAuthenticated: !!storedToken,
  
  login: (token, user) => {
    localStorage.setItem('meetguard_token', token);
    localStorage.setItem('meetguard_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },
  
  logout: () => {
    localStorage.removeItem('meetguard_token');
    localStorage.removeItem('meetguard_user');
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
