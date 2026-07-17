import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/authService';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (credentials) => {
        try {
          const data = await authService.login(credentials.username, credentials.password);
          const user = {
            login: data.login,
            nom: data.nom,
            prenom: data.prenom,
            role: data.role
          };
          set({ user, token: data.token, isAuthenticated: true });
          return { success: true, role: data.role };
        } catch (error) {
          const message = error.response?.data?.message || 'Serveur injoignable ou identifiants incorrects';
          return { success: false, error: message };
        }
      },

      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: 'kpi-platform-auth' }
  )
);
