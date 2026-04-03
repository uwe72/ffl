import { Link as RouterLink } from 'react-router-dom'
import { Card } from '@heroui/react'
import { useTeams } from '../hooks/useTeams'

export default function Teams() {
  const { data: teams, isLoading, error } = useTeams()

  if (isLoading) return <div className="text-center py-8 text-[#a0aec0]">Laden...</div>
  if (error) return <div className="text-center py-8 text-[#e05252]">Fehler beim Laden</div>

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#f5f5f5] mb-6">Teams</h1>
      {teams && teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <Card key={team.id} className="p-6 bg-[#1a2028] border border-[#2d3748] hover:border-[#c9a66b] hover:bg-[#242d38] transition-all">
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
                <h2 className="text-lg font-semibold text-[#f5f5f5]">{team.name}</h2>
                {team.shortName && (
                  <p className="text-[#a0aec0]">{team.shortName}</p>
                )}
              </RouterLink>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-[#6b7280]">
          Keine Teams gefunden
        </div>
      )}
    </div>
  )
}