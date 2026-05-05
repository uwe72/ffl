import api from './client'
import type { LoginRequest, RegisterRequest, AuthResponse, User } from '../types'

export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', credentials)
    return response.data
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data)
    return response.data
  },

  refresh: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/refresh', { refreshToken })
    return response.data
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me')
    return response.data
  },

  updateProfile: async (data: { email: string; mailTheme?: string }): Promise<User> => {
    const response = await api.put<User>('/auth/me', data)
    return response.data
  },
}