import { useState, useMemo } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { useTeam, useTeamPlayers } from '../hooks/useTeams'
import { positionLabels, positionColors } from './Players'

type SortKey = 'positionTotal' | 'positionChange' | 'nameKicker' | 'points' | 'pointsLastRound' | 'managerCount' | 'prize' | 'position'
type SortOrder = 'asc' | 'desc'

export default function TeamDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: team, isLoading: teamLoading, error: teamError } = useTeam(Number(id))
  const { data: players, isLoading: playersLoading } = useTeamPlayers(Number(id))
  
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('positionTotal')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <span className="text-subtle ml-1">⇅</span>
    return <span className="text-accent ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  const filteredPlayers = useMemo(() => {
    if (!players) return []
    
    const filtered = players.filter(player => {
      const matchesPosition = selectedPosition === 'ALL' || player.position === selectedPosition
      const matchesSearch = 
        player.nameKicker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesPosition && matchesSearch
    })

    return filtered.sort((a, b) => {
      let comparison = 0
      switch (sortKey) {
        case 'positionTotal':
          comparison = (a.positionTotal ?? 999) - (b.positionTotal ?? 999)
          break
        case 'positionChange':
          comparison = (a.positionChange ?? 0) - (b.positionChange ?? 0)
          break
        case 'nameKicker':
          comparison = a.nameKicker.localeCompare(b.nameKicker)
          break
        case 'points':
          comparison = (b.points ?? 0) - (a.points ?? 0)
          break
        case 'pointsLastRound':
          comparison = (b.pointsLastRound ?? 0) - (a.pointsLastRound ?? 0)
          break
        case 'managerCount':
          comparison = (a.managerCount ?? 0) - (b.managerCount ?? 0)
          break
        case 'prize':
          comparison = a.prize - b.prize
          break
        case 'position':
          comparison = a.position.localeCompare(b.position)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [players, selectedPosition, searchTerm, sortKey, sortOrder])

  const isLoading = teamLoading || playersLoading
  const error = teamError

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>
  if (!team) return <div className="text-center py-8 text-subtle">Team nicht gefunden</div>

  return (
    <div>
      <RouterLink to="/teams" className="text-accent hover:text-accent-hover mb-4 inline-block link">
        &larr; Zurück zur Übersicht
      </RouterLink>
      
      <div className="p-6 mt-4 bg-surface border border-border">
        <div className="flex items-start gap-6">
          {team.logoXxlUrl && (
            <img
              src={team.logoXxlUrl}
              alt={team.name}
              className="w-32 h-32 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">{team.name}</h1>
            {team.shortName && (
              <p className="text-lg text-muted mt-1">{team.shortName}</p>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 mt-6 bg-surface border border-border">
        <div className="flex flex-wrap gap-4 mb-4 items-center">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedPosition('ALL')}
              className={selectedPosition === 'ALL' ? 'bg-primary text-background px-4 py-2 rounded font-medium hover:bg-button-primary-hover transition-colors' : 'bg-elevated text-foreground border border-border-hover px-4 py-2 rounded transition-colors'}
            >
              Alle
            </button>
            {(['GOALKEEPER', 'DEFENDER', 'MIDFIELD', 'STRIKER'] as const).map(pos => (
              <button
                key={pos}
                onClick={() => setSelectedPosition(pos)}
                className={selectedPosition === pos ? 'bg-primary text-background px-4 py-2 rounded font-medium hover:bg-button-primary-hover transition-colors' : 'bg-elevated text-foreground border border-border-hover px-4 py-2 rounded transition-colors'}
              >
                {positionLabels[pos]}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Spieler suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="min-w-48 px-3 py-2 rounded-lg bg-elevated border border-border text-foreground text-sm placeholder-[#8899aa] focus:outline-none focus:border-accent hover:border-border-hover transition-colors"
          />
        </div>

        <h2 className="text-xl font-semibold text-foreground mb-4">
          Spieler ({filteredPlayers?.length || 0})
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                <th className="px-3 py-2 text-center text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handleSort('positionTotal')}>
                  Pos<SortIcon column="positionTotal" />
                </th>
                <th className="px-3 py-2 text-center text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handleSort('positionChange')}>
                  +-<SortIcon column="positionChange" />
                </th>
                <th className="px-3 py-2 text-left text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handleSort('nameKicker')}>
                  Name<SortIcon column="nameKicker" />
                </th>
                <th className="px-3 py-2 text-center text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handleSort('points')}>
                  Pkt<SortIcon column="points" />
                </th>
                <th className="px-3 py-2 text-center text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handleSort('pointsLastRound')}>
                  Spieltag<SortIcon column="pointsLastRound" />
                </th>
                <th className="px-3 py-2 text-center text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handleSort('managerCount')}>
                  Manager<SortIcon column="managerCount" />
                </th>
                <th className="px-3 py-2 text-right text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handleSort('prize')}>
                  Preis<SortIcon column="prize" />
                </th>
                <th className="px-3 py-2 text-left text-muted font-medium cursor-pointer hover:text-accent border-b border-border" onClick={() => handleSort('position')}>
                  Position<SortIcon column="position" />
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface">
              {filteredPlayers && filteredPlayers.length > 0 ? (
                filteredPlayers.map((player) => (
                  <tr key={player.id} className="hover:bg-elevated border-b border-border">
                    <td className="px-3 py-2 text-center font-medium text-foreground">
                      {player.positionTotal ? `${player.positionTotal}.` : '-'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {player.positionChange != null && player.positionChange !== 0 ? (
                        <span className={`font-medium ${player.positionChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {player.positionChange > 0 ? `↑${player.positionChange}` : `↓${Math.abs(player.positionChange)}`}
                        </span>
                      ) : (
                        <span className="text-subtle">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <RouterLink to={`/players/${player.id}`} className="flex items-center hover:text-foreground link">
                        {player.pictureUrl && (
                          <img src={player.pictureUrl} alt={player.nameKicker} className="w-10 h-10 rounded-full object-cover mr-3" />
                        )}
                        <div>
                          <div className="font-medium text-accent">{player.nameKicker}</div>
                          {player.firstName && player.lastName && (
                            <div className="text-sm text-subtle">
                              {player.firstName} {player.lastName}
                            </div>
                          )}
                        </div>
                      </RouterLink>
                    </td>
                    <td className="px-3 py-2 text-center font-medium text-foreground">
                      {player.points ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-center text-muted">
                      {player.pointsLastRound ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <RouterLink to={`/players/${player.id}`}>
                        <span 
                          className={`text-xs font-medium px-2 py-0.5 rounded cursor-pointer hover:opacity-80 ${player.managerCount && player.managerCount > 0 ? 'chip-accent' : 'bg-elevated text-muted'}`}
                        >
                          {player.managerCount ?? 0}
                        </span>
                      </RouterLink>
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-foreground">
                      {player.prize.toLocaleString()} €
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded chip-${positionColors[player.position]}`}>
                        {positionLabels[player.position]}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center text-subtle py-8">
                    Keine Spieler gefunden
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
