import { apiFetch } from './api';

export const npsService = {
  getSummary: () => apiFetch('/nps/summary'),
  getRetours: () => apiFetch('/nps/retours'),
};
