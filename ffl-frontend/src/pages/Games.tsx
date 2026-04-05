import { useState, useMemo, useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useGames, useGame } from '../hooks/useGames'
import { useCurrentSeason } from '../hooks/useSeasons'
import { useQueryClient } from '@tanstack/react-query'
import FormationImportDialog from '../components/FormationImportDialog'

type SortKey = 'roundNumber' | 'name' | 'hostName' | 'visitorName' | 'goalHost' | 'goalVisitor'
type SortOrder = 'asc' | 'desc'

export default function Games() {
  const { data: games, isLoading: gamesLoading, error } = useGames()
  const { data: currentSeason } = useCurrentSeason()
  const [sortKey, setSortKey] = useState<SortKey>('roundNumber')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [selectedRound, setSelectedRound] = useState<number | null>(null)
  const [importGameId, setImportGameId] = useState<number | null>(null)
  const queryClient = useQueryClient()
  
  const { data: importGame } = useGame(importGameId || 0)

  const rounds = useMemo(() => {
    if (!games) return []
    const uniqueRounds = [...new Set(games.map(g => g.roundNumber).filter(Boolean))]
    return uniqueRounds.sort((a, b) => (a || 0) - (b || 0))
  }, [games])

  useEffect(() => {
    if (currentSeason?.currentMatchday && selectedRound === null) {
      setSelectedRound(currentSeason.currentMatchday)
    } else if (rounds.length > 0 && selectedRound === null && !currentSeason?.currentMatchday) {
      setSelectedRound(Math.max(...rounds))
    }
  }, [rounds, selectedRound, currentSeason?.currentMatchday])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) return '⇅'
    return sortOrder === 'asc' ? '↑' : '↓'
  }

  const getSortIconColor = (key: SortKey) => {
    return sortKey === key ? 'text-[#c9a66b]' : 'text-[#6b7280]'
  }

  const filteredGames = useMemo(() => {
    if (!games) return []
    return games.filter(g => selectedRound === null || g.roundNumber === selectedRound)
  }, [games, selectedRound])

  const sortedGames = useMemo(() => {
    return [...filteredGames].sort((a, b) => {
      let comparison = 0
      switch (sortKey) {
        case 'roundNumber':
          comparison = (a.roundNumber || 0) - (b.roundNumber || 0)
          break
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '')
          break
        case 'hostName':
          comparison = (a.hostName || '').localeCompare(b.hostName || '')
          break
        case 'visitorName':
          comparison = (a.visitorName || '').localeCompare(b.visitorName || '')
          break
        case 'goalHost':
          comparison = (a.goalHost ?? 0) - (b.goalHost ?? 0)
          break
        case 'goalVisitor':
          comparison = (a.goalVisitor ?? 0) - (b.goalVisitor ?? 0)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [filteredGames, sortKey, sortOrder])

  if (gamesLoading) return <div className="text-center py-8 text-[#a0aec0]">Laden...</div>
  if (error) return <div className="text-center py-8 text-[#e05252]">Fehler beim Laden</div>

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#f5f5f5] mb-6">Spiele</h1>
      
      <div className="mb-4 flex items-center gap-2">
        <label className="text-[#a0aec0] text-sm">Spieltag:</label>
        <button
          onClick={() => {
            const currentIndex = rounds.indexOf(selectedRound!)
            if (currentIndex > 0) setSelectedRound(rounds[currentIndex - 1])
          }}
          disabled={!selectedRound || rounds.indexOf(selectedRound) <= 0}
          className="p-2 rounded-lg bg-[#1a2028] border border-[#2d3748] text-[#f5f5f5] hover:border-[#c9a66b] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#2d3748] transition-colors"
          title="Vorheriger Spieltag"
        >
          ←
        </button>
        <select
          value={selectedRound || ''}
          onChange={(e) => setSelectedRound(e.target.value ? Number(e.target.value) : null)}
          className="bg-[#1a2028] border border-[#2d3748] rounded-lg px-3 py-2 text-[#f5f5f5] focus:outline-none focus:border-[#c9a66b]"
        >
          {rounds.map(round => (
            <option key={round} value={round}>
              Spieltag {round}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            const currentIndex = rounds.indexOf(selectedRound!)
            if (currentIndex < rounds.length - 1) setSelectedRound(rounds[currentIndex + 1])
          }}
          disabled={!selectedRound || rounds.indexOf(selectedRound) >= rounds.length - 1}
          className="p-2 rounded-lg bg-[#1a2028] border border-[#2d3748] text-[#f5f5f5] hover:border-[#c9a66b] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#2d3748] transition-colors"
          title="Nächster Spieltag"
        >
          →
        </button>
      </div>

      {sortedGames.length > 0 ? (
        <div className="bg-[#1a2028] rounded-lg border border-[#2d3748] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2d3748] bg-[#242d38]">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[#a0aec0]">
                    Name
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-semibold text-[#a0aec0] cursor-pointer hover:text-[#c9a66b] transition-colors"
                    onClick={() => handleSort('hostName')}
                  >
                    Heimmannschaft <span className={getSortIconColor('hostName')}>{getSortIcon('hostName')}</span>
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-[#a0aec0]">
                    Ergebnis
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-semibold text-[#a0aec0] cursor-pointer hover:text-[#c9a66b] transition-colors"
                    onClick={() => handleSort('visitorName')}
                  >
                    Gastmannschaft <span className={getSortIconColor('visitorName')}>{getSortIcon('visitorName')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedGames.map((game) => (
                  <tr key={game.id} className="border-b border-[#2d3748] hover:bg-[#242d38] transition-colors">
                    <td className="px-4 py-3 text-[#f5f5f5]">
                      <RouterLink to={`/games/${game.id}`} className="link hover:text-[#c9a66b]">
                        {game.name || '-'}
                      </RouterLink>
                    </td>
                    <td className="px-4 py-3 text-[#f5f5f5]">
                      <div className="flex items-center gap-3">
                        {game.hostLogoUrl && (
                          <img 
                            src={game.hostLogoUrl} 
                            alt={game.hostName}
                            className="h-8 w-8 object-contain flex-shrink-0"
                          />
                        )}
                        <div>
                          <div className="font-medium">{game.hostName || '-'}</div>
                          {game.hostShortName && (
                            <div className="text-sm text-[#6b7280]">{game.hostShortName}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#242d38]">
                          <span className="text-[#f5f5f5] font-semibold">{game.goalHost ?? '-'}</span>
                          <span className="text-[#6b7280]">:</span>
                          <span className="text-[#f5f5f5] font-semibold">{game.goalVisitor ?? '-'}</span>
                        </span>
                        {game.goalHost == null && game.goalVisitor == null && (
                          <button
                            onClick={() => setImportGameId(game.id)}
                            className="px-2 py-1 text-xs rounded bg-[#c9a66b] text-[#1a2028] font-medium hover:bg-[#b8956a]"
                          >
                            Import
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#f5f5f5]">
                      <div className="flex items-center gap-3">
                        {game.visitorLogoUrl && (
                          <img 
                            src={game.visitorLogoUrl} 
                            alt={game.visitorName}
                            className="h-8 w-8 object-contain flex-shrink-0"
                          />
                        )}
                        <div>
                          <div className="font-medium">{game.visitorName || '-'}</div>
                          {game.visitorShortName && (
                            <div className="text-sm text-[#6b7280]">{game.visitorShortName}</div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-[#6b7280]">
          Keine Spiele gefunden
        </div>
      )}

      <FormationImportDialog
        isOpen={importGameId !== null}
        onClose={() => setImportGameId(null)}
        onImport={() => {
          queryClient.invalidateQueries({ queryKey: ['games'] })
          if (importGameId) {
            queryClient.invalidateQueries({ queryKey: ['games', importGameId] })
          }
        }}
        initialValue={importGame?.formationExtern || ''}
        gameId={importGameId || 0}
        game={importGame}
      />
    </div>
  )
}