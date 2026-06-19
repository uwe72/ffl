import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCurrentSeason } from '../hooks/useSeasons'

interface SeasonRestrictedRouteProps {
  children: React.ReactNode
}

export default function SeasonRestrictedRoute({ children }: SeasonRestrictedRouteProps) {
  const { isAuthenticated, user } = useAuth()
  const { data: currentSeason, isLoading } = useCurrentSeason()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Wird geladen...</div>
      </div>
    )
  }

  if (isAuthenticated && user?.role !== 'ADMIN' && currentSeason?.seasonState === 'BEFORE_SEASON') {
    return <Navigate to="/my-team" replace />
  }

  return <>{children}</>
}
