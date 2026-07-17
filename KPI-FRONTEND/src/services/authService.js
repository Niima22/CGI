import { apiClient } from './api';

export const authService = {
  login: async (login, password) => {
    const response = await apiClient.post('/auth/login', { login, password });
    return response.data;
  }
};
