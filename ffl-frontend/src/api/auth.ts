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

  uploadAvatar: async (file: File): Promise<User> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post<User>('/auth/me/avatar', formData, {
      headers: { 'Content-Type': undefined },
    })
    return response.data
  },

  deleteAvatar: async (): Promise<void> => {
    await api.delete('/auth/me/avatar')
  },

  getAvatar: async (userId: number): Promise<Blob> => {
    const response = await api.get(`/users/${userId}/avatar`, {
      responseType: 'blob',
    })
    return response.data
  },
}