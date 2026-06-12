import { Link as RouterLink } from 'react-router-dom'
import { useTeams } from '../hooks/useTeams'

export default function Teams() {
  const { data: teams, isLoading, error } = useTeams()

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-6">Teams</h1>
      {teams && teams.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {teams.map(team => (
            <div key={team.id} className="card p-6 bg-surface border border-border hover:border-accent hover:bg-elevated transition-all">
              <RouterLink to={`/teams/${team.id}`} className="block link">
                {team.logoXxlUrl && (
                  <img 
                    src={team.logoXxlUrl} 
                    alt={team.name} 
                    className="w-24 h-24 mb-4 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                )}
                <h2 className="text-lg font-semibold text-foreground">{team.name}</h2>
                {team.shortName && (
                  <p className="text-muted">{team.shortName}</p>
                )}
              </RouterLink>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-subtle">
          Keine Teams gefunden
        </div>
      )}
    </div>
  )
}