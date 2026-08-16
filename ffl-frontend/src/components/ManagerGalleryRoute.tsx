import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface ManagerGalleryRouteProps {
  children: React.ReactNode
}

export default function ManagerGalleryRoute({ children }: ManagerGalleryRouteProps) {
  const { isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted">Wird geladen...</div>
      </div>
    )
  }

  const canAccess = user?.role === 'ADMIN' || !!user?.avatarUrl

  if (!canAccess) {
    return <Navigate to="/managers" replace />
  }

  return <>{children}</>
}
