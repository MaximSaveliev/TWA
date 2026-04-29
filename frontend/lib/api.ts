import axios from "axios";
import { getToken, removeToken } from "./auth";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthEndpoint = err.config?.url?.includes("/api/auth/");
    if (err.response?.status === 401 && !isAuthEndpoint) {
      removeToken();
      window.location.href = "/auth/login";
    }
    return Promise.reject(err);
  }
);

export default api;
