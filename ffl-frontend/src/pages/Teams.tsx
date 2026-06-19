import { Link as RouterLink } from 'react-router-dom'
import { useTeams } from '../hooks/useTeams'
import PageHeader from '../components/PageHeader'

export default function Teams() {
  const { data: teams, isLoading, error } = useTeams()

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

  return (
    <div>
      <PageHeader icon="sap-icon-shield" title="Vereine" />
      {teams && teams.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {teams.map(team => (
            <div key={team.id} className="card p-4 bg-surface border border-border hover:border-primary hover:bg-card-hover transition-all">
              <RouterLink to={`/teams/${team.id}`} className="block link">
                {team.logoXxlUrl && (
                  <img 
                    src={team.logoXxlUrl} 
                    alt={team.name} 
                    className="w-24 h-24 mb-3 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                )}
                <h2 className="text-base font-semibold text-foreground">{team.name}</h2>
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