import { Link as RouterLink } from 'react-router-dom'
import { useTeams } from '../hooks/useTeams'

export default function Teams() {
  const { data: teams, isLoading, error } = useTeams()

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

  return (
    <div>
      {teams && teams.length > 0 ? (
        <div className="p-6 bg-surface border border-border rounded-card">
        <h2 className="text-xl font-semibold text-foreground mb-4">Vereine ({teams.length})</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {teams.map(team => (
            <div key={team.id} className="p-4 bg-zebra border border-border rounded-card shadow-sm hover:border-primary transition-all">
              <RouterLink to={`/teams/${team.id}`} className="block link text-center">
                {team.logoXxlUrl && (
                  <img 
                    src={team.logoXxlUrl} 
                    alt={team.name} 
                    className="w-24 h-24 mb-3 object-contain mx-auto"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                )}
                <h2 className="text-base font-semibold text-foreground truncate">{team.name}</h2>
                {team.shortName && (
                  <p className="text-muted">{team.shortName}</p>
                )}
              </RouterLink>
            </div>
          ))}
        </div>
        </div>
      ) : (
        <div className="text-center py-8 text-subtle">
          Keine Teams gefunden
        </div>
      )}
    </div>
  )
}