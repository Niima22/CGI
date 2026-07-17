import { apiFetch } from './api';

export const kpiService = {
  getDaily: () => apiFetch('/kpis/daily'),
  getWeekly: () => apiFetch('/kpis/weekly'),
  getLeaderboard: () => apiFetch('/kpis/leaderboard'),
  getAlerts: () => apiFetch('/alerts'),
  getTickets: () => apiFetch('/tickets'),
  getTicketActions: (ticketId) => apiFetch(`/tickets/${encodeURIComponent(ticketId)}/actions`),
};
