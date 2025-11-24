import { create } from 'zustand';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loadCatalog: (data: any) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    try {
      const user = await window.electron.db.validateUser(email, password);
      if (user) {
        set({ user, isAuthenticated: true });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
  },

  loadCatalog: async (data: any) => {
    try {
      // Carregar no localStorage
      await window.electron.db.saveCatalog(data);
      
      console.log('Catalog loaded successfully');
    } catch (error) {
      console.error('Failed to load catalog:', error);
      throw error;
    }
  },
}));
