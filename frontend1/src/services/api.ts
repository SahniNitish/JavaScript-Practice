import axios from 'axios';
import { AuthResponse, User, Wallet, PerformanceMetrics, HistoryPoint } from '../types';
import { 
  mockAuthApi, 
  mockWalletApi, 
  mockAnalyticsApi, 
  mockAdminApi 
} from './mockApi';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false'; // Default to true for demo

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token') || localStorage.getItem('mock_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('mock_access_token');
      localStorage.removeItem('mock_current_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Real API implementations
const realAuthApi = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  signup: async (username: string, email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/signup', { username, email, password });
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  addWallet: async (address: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/add-wallet', { address });
    return response.data;
  },
};

const realWalletApi = {
  getWallets: async (): Promise<Wallet[]> => {
    const response = await api.get('/wallet/wallets');
    return response.data;
  },
};

const realAnalyticsApi = {
  getPortfolioHistory: async (days: number = 30): Promise<HistoryPoint[]> => {
    const response = await api.get(`/analytics/portfolio/history?days=${days}`);
    return response.data;
  },

  getPerformanceMetrics: async (period: number = 30): Promise<PerformanceMetrics> => {
    const response = await api.get(`/analytics/portfolio/performance?period=${period}`);
    return response.data;
  },

  exportExcel: async (): Promise<Blob> => {
    const response = await api.get('/analytics/export/excel', {
      responseType: 'blob',
    });
    return response.data;
  },
};

const realAdminApi = {
  collectData: async (): Promise<{ message: string; status: string }> => {
    const response = await api.post('/admin/collect-data');
    return response.data;
  },
};

// Export the appropriate API based on environment
export const authApi = USE_MOCK_API ? mockAuthApi : realAuthApi;
export const walletApi = USE_MOCK_API ? mockWalletApi : realWalletApi;
export const analyticsApi = USE_MOCK_API ? mockAnalyticsApi : realAnalyticsApi;
export const adminApi = USE_MOCK_API ? mockAdminApi : realAdminApi;

export default api;