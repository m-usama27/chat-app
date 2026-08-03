import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

// Request interceptor - attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      // Server responded with error status
      if (error.response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/";
      }
      return Promise.reject(error.response.data);
    } else if (error.request) {
      return Promise.reject({
        success: false,
        message: "Network error - unable to reach server",
      });
    } else {
      return Promise.reject({
        success: false,
        message: "An unexpected error occurred",
      });
    }
  }
);

// ====================
// Auth API
// ====================
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
};

// ====================
// User API
// ====================
export const userAPI = {
  getAll: () => api.get("/users"),
  getById: (id) => api.get(`/users/${id}`),
  updateProfile: (data) => api.put("/users/profile", data),
  search: (query) => api.get(`/users/search?q=${encodeURIComponent(query)}`),
};

// ====================
// Message API
// ====================
export const messageAPI = {
  send: (recipientId, content) =>
    api.post("/messages", { recipientId, content }),
  getMessages: (userId) => api.get(`/messages/${userId}`),
  getConversations: () => api.get("/messages/conversations"),
  markAsRead: (userId) => api.put(`/messages/${userId}/read`),
};

export default api;