import axios from 'axios';

// API configuration - prefer Vite dev proxy for Codespaces compatibility
const envBase = (import.meta as any).env?.VITE_API_URL as string | undefined;

let baseURL = '';
if ((import.meta as any).env?.DEV) {
  // In development, always use Vite proxy for better Codespaces compatibility
  baseURL = '';
  console.log('🏠 Development mode: using Vite proxy for API calls');
} else {
  if (envBase && envBase.trim()) {
    baseURL = envBase.trim();
  } else if (typeof window !== 'undefined') {
    baseURL = window.location.origin;
  } else {
    baseURL = 'http://127.0.0.1:8000';
  }
}

console.log('🔧 API baseURL configured as:', baseURL || 'Vite proxy (relative)');

export const api = axios.create({
  baseURL,
  timeout: 0  // Remove timeout - allow long-running LLM requests
});

// Add request logging
api.interceptors.request.use(
  (config) => {
    console.log('📤 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      headers: config.headers,
      dataType: config.data instanceof FormData ? 'FormData' : typeof config.data,
      timestamp: new Date().toISOString()
    });
    
    if (config.data instanceof FormData) {
      console.log('📤 FormData contents:');
      for (const [key, value] of config.data.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }
    } else if (config.data) {
      console.log('📤 Request body:', config.data);
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Add response logging with retry logic
api.interceptors.response.use(
  (response) => {
    console.log('📥 API Response:', {
      status: response.status,
      statusText: response.statusText,
      url: response.config.url,
      headers: response.headers,
      dataType: typeof response.data,
      dataSize: JSON.stringify(response.data).length,
      timestamp: new Date().toISOString()
    });
    
    if (response.data) {
      console.log('📥 Response data keys:', Object.keys(response.data));
      if (response.data.individual_responses) {
        console.log('📥 Individual responses count:', response.data.individual_responses.length);
      }
    }
    
    return response;
  },
  async (error) => {
    console.error('❌ API Response Error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      responseData: error.response?.data,
      timestamp: new Date().toISOString()
    });
    
    // Simple exponential backoff retry for idempotent GET requests only
    const config: any = error.config;
    if (config && config.method === 'get') {
      config.__retryCount = config.__retryCount || 0;
      if (config.__retryCount < 3) {
        config.__retryCount += 1;
        const delay = Math.pow(2, config.__retryCount) * 200; // 200,400,800 ms
        console.log(`🔄 Retrying GET request (attempt ${config.__retryCount}/3) after ${delay}ms`);
        await new Promise(res => setTimeout(res, delay));
        return api(config);
      }
    }
    
    return Promise.reject(error);
  }
);

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
  analyze: (payload: any) => {
    // Check if payload is FormData (multimodal) or regular object (text-only)
    if (payload instanceof FormData) {
      // Always use multimodal endpoint for FormData requests
      console.log('📤 Using multimodal endpoint for FormData request');
      return api.post('/cohorts/analyze-multimodal', payload).then(r => r.data);
    } else {
      // Regular JSON payload for text-only
      console.log('📤 Using regular endpoint for JSON request');
      return api.post('/cohorts/analyze', payload).then(r => r.data);
    }
  }
};

export const StatsAPI = {
  stats: () => api.get('/stats').then(r => r.data)
};
