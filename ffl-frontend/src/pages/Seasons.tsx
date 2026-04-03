import { useState, useMemo } from 'react'
import { Card, Chip } from '@heroui/react'
import { useSeasons } from '../hooks/useSeasons'

const seasonStateLabels: Record<string, string> = {
  BEFORE_SEASON: 'Vor Saison',
  RUNNING_HINRUNDE: 'Hinrunde',
  RUNNING_RUECKRUNDE: 'Rückrunde',
  SEASON_ENDED: 'Beendet'
}

const seasonStateColors: Record<string, 'default' | 'accent' | 'success' | 'warning'> = {
  BEFORE_SEASON: 'default',
  RUNNING_HINRUNDE: 'accent',
  RUNNING_RUECKRUNDE: 'success',
  SEASON_ENDED: 'warning'
}

type SortKey = 'name' | 'budget' | 'seasonState'
type SortOrder = 'asc' | 'desc'

export default function Seasons() {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  
  const { data: seasons, isLoading, error } = useSeasons()

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <span className="text-[#6b7280] ml-1">⇅</span>
    return <span className="text-[#c9a66b] ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  const sortedSeasons = useMemo(() => {
    if (!seasons) return []
    return [...seasons].sort((a, b) => {
      let comparison = 0
      switch (sortKey) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'budget':
          comparison = a.budget - b.budget
          break
        case 'seasonState':
          comparison = a.seasonState.localeCompare(b.seasonState)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [seasons, sortKey, sortOrder])

  if (isLoading) return <div className="text-center py-8 text-[#a0aec0]">Laden...</div>
  if (error) return <div className="text-center py-8 text-[#e05252]">Fehler beim Laden</div>

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#f5f5f5] mb-6">Saisons</h1>
      {sortedSeasons && sortedSeasons.length > 0 ? (
        <div className="grid gap-4">
          <div className="grid grid-cols-3 gap-4 text-sm font-medium text-[#a0aec0] px-4">
            <div className="cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('name')}>
              Name<SortIcon column="name" />
            </div>
            <div className="cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('budget')}>
              Budget<SortIcon column="budget" />
            </div>
            <div className="cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('seasonState')}>
              Status<SortIcon column="seasonState" />
            </div>
          </div>
          {sortedSeasons.map(season => (
            <Card key={season.id} className="p-4 bg-[#1a2028] border border-[#2d3748] hover:border-[#c9a66b] transition-all">
              <div className="grid grid-cols-3 items-center">
                <div className="font-medium text-[#f5f5f5]">{season.name}</div>
                <div className="text-[#c9a66b]">{season.budget.toLocaleString()} €</div>
                <Chip
                  color={seasonStateColors[season.seasonState] || 'default'}
                  variant="soft"
                >
                  {seasonStateLabels[season.seasonState] || season.seasonState}
                </Chip>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-[#6b7280]">
          Keine Saisons gefunden
        </div>
      )}
    </div>
  )
}