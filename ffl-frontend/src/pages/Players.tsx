import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePlayers, usePublicPlayers } from '../hooks/usePlayers'
import { usePublicCurrentSeason } from '../hooks/useSeasons'
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
      <div>
        <div className="p-6 bg-surface border border-border rounded-card mb-6 w-fit max-w-full">
          <PlayerTable players={publicQuery.data ?? []} isPublic />
        </div>
      </div>
    )
  }

  if (authedQuery.isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (authedQuery.error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

  return (
    <div>
      <div className="p-6 bg-surface border border-border rounded-card mb-6 w-fit max-w-full">
        <PlayerTable players={authedQuery.data ?? []} />
      </div>
    </div>
  )
}
