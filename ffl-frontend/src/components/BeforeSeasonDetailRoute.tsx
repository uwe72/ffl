import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCurrentSeason } from '../hooks/useSeasons'

interface BeforeSeasonDetailRouteProps {
  children: React.ReactNode
  redirectTo: string
}

export default function BeforeSeasonDetailRoute({ children, redirectTo }: BeforeSeasonDetailRouteProps) {
  const { isAuthenticated, user } = useAuth()
  const { data: currentSeason, isLoading } = useCurrentSeason()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted">Wird geladen...</div>
      </div>
    )
  }

  if (isAuthenticated && user?.role !== 'ADMIN' && currentSeason?.seasonState === 'BEFORE_SEASON') {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
