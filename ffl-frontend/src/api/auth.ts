import api from './client'
import type { LoginRequest, RegisterRequest, AuthResponse, User } from '../types'

export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', credentials)
    return response.data
  },

  register: async (data: RegisterRequest, avatar?: File): Promise<{ message: string }> => {
    const formData = new FormData()
    formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }))
    if (avatar) {
      formData.append('avatar', avatar)
    }
    const response = await api.post<{ message: string }>('/auth/register', formData)
    return response.data
  },

  checkLogin: async (login: string): Promise<boolean> => {
    const response = await api.get<boolean>('/auth/check-login', { params: { login } })
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

  updateProfile: async (data: { email: string; firstName?: string; lastName?: string; mailTheme?: string }): Promise<User> => {
    const response = await api.put<User>('/auth/me', data)
    return response.data
  },

  uploadAvatar: async (file: File): Promise<User> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post<User>('/auth/me/avatar', formData)
    return response.data
  },

  deleteAvatar: async (): Promise<void> => {
    await api.delete('/auth/me/avatar')
  },

  getAvatar: async (userId: number): Promise<Blob> => {
    const response = await api.get(`/users/${userId}/avatar`, {
      responseType: 'blob',
      params: { _: Date.now() },
    })
    return response.data
  },

  forgotPassword: async (email: string, login?: string): Promise<{ message?: string; multipleAccounts?: boolean; logins?: string[] }> => {
    const response = await api.post<{ message?: string; multipleAccounts?: boolean; logins?: string[] }>('/auth/forgot-password', { email, login })
    return response.data
  },

  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/auth/reset-password', { token, newPassword })
    return response.data
  },
}