import { usePlayers } from '../hooks/usePlayers'
import PlayerTable, { positionLabels, positionColors } from '../components/PlayerTable'

export { positionLabels, positionColors }

export default function Players() {
  const { data: players, isLoading, error } = usePlayers()

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

  return (
    <div>
      <div className="p-6 bg-surface border border-border rounded-card mb-6 w-fit max-w-full">
        <PlayerTable players={players ?? []} />
      </div>
    </div>
  )
}
