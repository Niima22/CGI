import axios from 'axios';

export const KPI_API_BASE_URL =
  import.meta.env.VITE_KPI_API_BASE_URL || '/api/kpi-platform';

export const apiClient = axios.create({
  baseURL: KPI_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

function getStoredToken() {
  try {
    const raw = localStorage.getItem('kpi-platform-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token || null;
  } catch {
    return null;
  }
}

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function apiFetch(path, options = {}) {
  const token = getStoredToken();
  const response = await fetch(`${KPI_API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Erreur API KPI (${response.status})`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
