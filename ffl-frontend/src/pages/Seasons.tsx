import { useSeasons } from '../hooks/useSeasons'

export default function Seasons() {
  const { data: seasons, isLoading, error } = useSeasons()

  if (isLoading) return <div className="text-center py-8">Laden...</div>
  if (error) return <div className="text-center py-8 text-red-600">Fehler beim Laden</div>

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Saisons</h1>
      {seasons && seasons.length > 0 ? (
        <div className="grid gap-4">
          {seasons.map(season => (
            <div key={season.id} className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold">{season.name}</h2>
              <div className="mt-2 text-gray-600">
                <span>Budget: {season.budget.toLocaleString()} €</span>
                <span className="mx-4">|</span>
                <span>Status: {season.seasonState}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          Keine Saisons gefunden
        </div>
      )}
    </div>
  )
}