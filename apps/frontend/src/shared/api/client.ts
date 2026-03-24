/**
 * Axios API client — all requests go through here.
 * Automatically injects API key and handles 401 redirects.
 */
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'
const API_KEY_STORAGE_KEY = 'dmf_api_key'

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Inject API key on every request
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const key = localStorage.getItem(API_KEY_STORAGE_KEY)
  if (key) {
    config.headers['X-Api-Key'] = key
  }
  return config
})

// Global error handling
apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(API_KEY_STORAGE_KEY)
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE_KEY, key)
}

export function clearApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE_KEY)
}
