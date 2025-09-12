import axios from 'axios';

// Logic:
// In Vite dev (import.meta.env.DEV true) we rely on the proxy and use a relative base ('').
// In production build we respect VITE_API_URL if provided, else fallback to same-origin.
const envBase = (import.meta as any).env?.VITE_API_URL as string | undefined;

let baseURL = '';
if ((import.meta as any).env?.DEV) {
  baseURL = '';
} else {
  if (envBase && envBase.trim()) {
    baseURL = envBase.trim();
  } else if (typeof window !== 'undefined') {
    baseURL = window.location.origin;
  } else {
    baseURL = 'http://127.0.0.1:8000';
  }
}

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

// Simple exponential backoff retry for idempotent GET requests
api.interceptors.response.use(undefined, async (error) => {
  const config: any = error.config;
  if (!config || config.method !== 'get') return Promise.reject(error);
  config.__retryCount = config.__retryCount || 0;
  if (config.__retryCount >= 3) return Promise.reject(error);
  config.__retryCount += 1;
  const delay = Math.pow(2, config.__retryCount) * 200; // 200,400,800 ms
  await new Promise(res => setTimeout(res, delay));
  return api(config);
});

export function getApiBaseUrl() { return baseURL; }

export async function checkHealth(): Promise<{ ok: boolean; personas?: number }> {
  try {
    const r = await api.get('/health/db');
    return { ok: r.data.status === 'ok', personas: r.data.personas };
  } catch {
    return { ok: false };
  }
}

// Helper wrappers
export const PersonasAPI = {
  list: () => api.get('/personas/').then(r => r.data),
  generate: (payload: any) => api.post('/personas/generate', payload).then(r => r.data)
};

export const CohortAPI = {
  analyze: (payload: any) => api.post('/cohorts/analyze', payload).then(r => r.data)
};

export const StatsAPI = {
  stats: () => api.get('/stats').then(r => r.data)
};
