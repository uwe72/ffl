import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePlayers, usePublicPlayers } from '../hooks/usePlayers'
import { usePublicCurrentSeason } from '../hooks/useSeasons'
import BackButton from '../components/BackButton'
import PlayerTable, { positionLabels, positionColors } from '../components/PlayerTable'

export { positionLabels, positionColors }

export default function Players() {
  const { isAuthenticated } = useAuth()
  const { data: publicSeason, isLoading: isPublicSeasonLoading } = usePublicCurrentSeason()

  const authedQuery = usePlayers({ enabled: isAuthenticated })
  const publicQuery = usePublicPlayers(publicSeason?.id, !isAuthenticated && publicSeason?.seasonState === 'BEFORE_SEASON')

  if (!isAuthenticated) {
    if (isPublicSeasonLoading) return <div className="text-center py-8 text-muted">Laden...</div>
    if (publicSeason?.seasonState !== 'BEFORE_SEASON') return <Navigate to="/login" replace />

    if (publicQuery.isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
    if (publicQuery.error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

    return (
      <div className="md:h-full md:flex md:flex-col md:min-h-0">
        <BackButton to="/" className="mb-4 md:shrink-0" />
        <div className="md:px-3 md:py-4 md:p-6 md:bg-surface md:border md:border-border md:rounded-card md:mb-0 w-full md:w-fit max-w-full md:flex-1 md:min-h-0 md:flex md:flex-col">
          <PlayerTable players={publicQuery.data ?? []} isPublic enableExport enableCompact defaultAktivFilter="aktiv" mobileDashboardLayout defaultSortKey="positionTotal" defaultSortOrder="asc" scroll />
        </div>
      </div>
    )
  }

  if (authedQuery.isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (authedQuery.error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

  return (
    <div className="md:h-full md:flex md:flex-col md:min-h-0">
      <BackButton to="/" className="mb-4 md:shrink-0" />
      <div className="md:px-3 md:py-4 md:p-6 md:bg-surface md:border md:border-border md:rounded-card md:mb-0 w-full md:w-fit max-w-full md:flex-1 md:min-h-0 md:flex md:flex-col">
        <PlayerTable players={authedQuery.data ?? []} enableExport enableCompact defaultAktivFilter="aktiv" mobileDashboardLayout defaultSortKey="positionTotal" defaultSortOrder="asc" scroll />
      </div>

      <div className="h-10 md:hidden" />
    </div>
  )
}
