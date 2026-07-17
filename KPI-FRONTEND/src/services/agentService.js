import { useAuthStore } from '../store/authStore';
import { KPI_API_BASE_URL } from './api';

const API_URL = `${KPI_API_BASE_URL}/agents`;

const getHeaders = () => {
  const token = useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const agentService = {
  getAgents: async () => {
    const res = await fetch(API_URL, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erreur lors du chargement des agents');
    return res.json();
  },

  createAgent: async (agentData) => {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(agentData)
    });
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || 'Erreur lors de la création de l\'agent');
    }
    
    return res.json();
  },

  getAgentById: async (id) => {
    const res = await fetch(`${API_URL}/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Agent non trouvé');
    return res.json();
  },

  updateAgent: async (id, agentData) => {
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(agentData)
    });
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || 'Erreur lors de la mise à jour de l\'agent');
    }
    
    return res.json();
  }
};
