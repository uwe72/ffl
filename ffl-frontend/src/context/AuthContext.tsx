import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { authApi } from '../api/auth'
import { setMatomoUserId, resetMatomoUserId, setMatomoCustomDimension } from '../hooks/useMatomo'
import type { LoginRequest, RegisterRequest, AuthContextType } from '../types'

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id?: number; login: string; role: string; avatarUrl?: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser)
        setUser(parsed)
        setMatomoUserId(parsed.login)
        setMatomoCustomDimension(1, parsed.role)
        authApi.getProfile().then(profile => {
          const updated = { id: profile.id, login: parsed.login, role: parsed.role, avatarUrl: profile.avatarUrl }
          setUser(updated)
          localStorage.setItem('user', JSON.stringify(updated))
        }).catch(() => {})
      } catch {
        localStorage.removeItem('user')
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (credentials: LoginRequest) => {
    const response = await authApi.login(credentials)
    localStorage.setItem('token', response.token)
    localStorage.setItem('refreshToken', response.refreshToken)
    const userData = { login: response.login, role: response.role }
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    setMatomoUserId(userData.login)
    setMatomoCustomDimension(1, userData.role)
    authApi.getProfile().then(profile => {
      const updated = { id: profile.id, login: userData.login, role: userData.role, avatarUrl: profile.avatarUrl }
      setUser(updated)
      localStorage.setItem('user', JSON.stringify(updated))
    }).catch(() => {})
  }

  const register = async (data: RegisterRequest) => {
    const response = await authApi.register(data)
    localStorage.setItem('token', response.token)
    localStorage.setItem('refreshToken', response.refreshToken)
    const userData = { login: response.login, role: response.role }
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    setMatomoUserId(userData.login)
    setMatomoCustomDimension(1, userData.role)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
    resetMatomoUserId()
    setMatomoCustomDimension(1, '')
  }

  const refreshAccessToken = async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
      logout()
      return false
    }

    try {
      const response = await authApi.refresh(refreshToken)
      localStorage.setItem('token', response.token)
      localStorage.setItem('refreshToken', response.refreshToken)
      const userData = { login: response.login, role: response.role }
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
      return true
    } catch {
      logout()
      return false
    }
  }

  const updateAvatarUrl = (url: string | null) => {
    setUser(prev => {
      if (!prev) return null
      const updated = { ...prev, avatarUrl: url ?? undefined }
      localStorage.setItem('user', JSON.stringify(updated))
      return updated
    })
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshAccessToken,
        updateAvatarUrl,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}