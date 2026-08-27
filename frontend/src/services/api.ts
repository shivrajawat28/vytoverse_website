import axios from 'axios';

// In development, the Vite proxy rewrites /api → backend.
// In production, VITE_API_URL points directly at the deployed backend.
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vytoverse_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('vytoverse_token');
      localStorage.removeItem('vytoverse_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  signup: (data: { name: string; username?: string; email: string; password: string }) =>
    api.post('/auth/signup', data),
  getMe: () => api.get('/auth/me'),
};

// Users API
export const usersAPI = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data: Record<string, unknown>) => api.put('/users/me', data),
  uploadProfileImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/users/me/profile-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Events API
export const eventsAPI = {
  list: (params?: Record<string, unknown>) => api.get('/events', { params }),
  upcoming: (limit?: number) => api.get('/events/upcoming', { params: { limit } }),
  get: (id: number) => api.get(`/events/${id}`),
};

// Library API
export const libraryAPI = {
  list: (params?: Record<string, unknown>) => api.get('/library', { params }),
  categories: () => api.get('/library/categories'),
  get: (id: number) => api.get(`/library/${id}`),
};

// Stats API
export const statsAPI = {
  get: () => api.get('/stats'),
};

// Team API
export const teamAPI = {
  list: () => api.get('/team'),
};

// Admin API
export const adminAPI = {
  // Users
  listUsers: (params?: Record<string, unknown>) => api.get('/admin/users', { params }),
  updateUser: (id: number, data: Record<string, unknown>) => api.put(`/admin/users/${id}`, data),
  assignStars: (id: number, stars: number) => api.post(`/admin/users/${id}/stars`, { stars }),
  toggleTeamMember: (id: number, teamMembership: number, teamRole?: string) =>
    api.put(`/admin/users/${id}/team`, { team_membership: teamMembership, team_role: teamRole || null }),

  // Events
  listEvents: (params?: Record<string, unknown>) => api.get('/admin/events', { params }),
  createEvent: (data: Record<string, unknown>) => api.post('/admin/events', data),
  updateEvent: (id: number, data: Record<string, unknown>) => api.put(`/admin/events/${id}`, data),
  deleteEvent: (id: number) => api.delete(`/admin/events/${id}`),
  uploadEventImage: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/admin/events/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Library
  listResources: (params?: Record<string, unknown>) => api.get('/admin/library', { params }),
  createResource: (data: Record<string, unknown>) => api.post('/admin/library', data),
  updateResource: (id: number, data: Record<string, unknown>) => api.put(`/admin/library/${id}`, data),
  deleteResource: (id: number) => api.delete(`/admin/library/${id}`),
  uploadFile: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/admin/library/${id}/file`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
