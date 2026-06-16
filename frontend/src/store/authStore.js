import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  token: localStorage.getItem('pos_token') || null,
  user: JSON.parse(localStorage.getItem('pos_user')) || null,
  
  login: (data) => {
    localStorage.setItem('pos_token', data.token);
    localStorage.setItem('pos_user', JSON.stringify(data.user));
    set({ token: data.token, user: data.user });
  },
  
  logout: () => {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');
    set({ token: null, user: null });
  }
}));