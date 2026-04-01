import { useTeams } from '../hooks/useTeams'

export default function Teams() {
  const { data: teams, isLoading, error } = useTeams()

  if (isLoading) return <div className="text-center py-8">Laden...</div>
  if (error) return <div className="text-center py-8 text-red-600">Fehler beim Laden</div>

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Teams</h1>
      {teams && teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <div key={team.id} className="bg-white rounded-lg shadow p-6">
              {team.logoSUrl && (
                <img src={team.logoSUrl} alt={team.name} className="w-16 h-16 mb-4" />
              )}
              <h2 className="text-lg font-semibold">{team.name}</h2>
              {team.shortName && (
                <p className="text-gray-500">{team.shortName}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          Keine Teams gefunden
        </div>
      )}
    </div>
  )
}