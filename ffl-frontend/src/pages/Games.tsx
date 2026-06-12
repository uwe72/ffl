import { useState, useMemo, useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useGames, useGame } from '../hooks/useGames'
import { useCurrentSeason } from '../hooks/useSeasons'
import { useQueryClient } from '@tanstack/react-query'
import FormationImportDialog from '../components/FormationImportDialog'
import MatchdayMailSendDialog from '../components/MatchdayMailSendDialog'

type SortKey = 'roundNumber' | 'name' | 'hostName' | 'visitorName' | 'goalHost' | 'goalVisitor'
type SortOrder = 'asc' | 'desc'

export default function Games() {
  const { data: games, isLoading: gamesLoading, error } = useGames()
  const { data: currentSeason } = useCurrentSeason()
  const [sortKey, setSortKey] = useState<SortKey>('roundNumber')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [selectedRound, setSelectedRound] = useState<number | null>(null)
  const [importGameId, setImportGameId] = useState<number | null>(null)
  const [mailDialogOpen, setMailDialogOpen] = useState(false)
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
    return sortKey === key ? 'text-accent' : 'text-subtle'
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

  if (gamesLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-6">Spiele</h1>
      
      <div className="mb-4 flex items-center gap-2">
        <label className="text-muted text-sm">Spieltag:</label>
        <button
          onClick={() => {
            const currentIndex = rounds.indexOf(selectedRound!)
            if (currentIndex > 0) setSelectedRound(rounds[currentIndex - 1])
          }}
          disabled={!selectedRound || rounds.indexOf(selectedRound) <= 0}
          className="p-2 rounded-lg bg-surface border border-border text-foreground hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border transition-colors"
          title="Vorheriger Spieltag"
        >
          ←
        </button>
        <select
          value={selectedRound || ''}
          onChange={(e) => setSelectedRound(e.target.value ? Number(e.target.value) : null)}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-accent"
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
          className="p-2 rounded-lg bg-surface border border-border text-foreground hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border transition-colors"
          title="Nächster Spieltag"
        >
          →
        </button>
        <button
          onClick={() => setMailDialogOpen(true)}
          disabled={!selectedRound || !currentSeason?.id}
          className="ml-2 px-3 py-2 rounded-lg bg-primary text-background font-semibold hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Spieltagsmail
        </button>
      </div>

      {sortedGames.length > 0 ? (
        <div className="bg-surface rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-elevated">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted">
                    Name
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-semibold text-muted cursor-pointer hover:text-accent transition-colors"
                    onClick={() => handleSort('hostName')}
                  >
                    Heimmannschaft <span className={getSortIconColor('hostName')}>{getSortIcon('hostName')}</span>
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-muted">
                    Ergebnis
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-semibold text-muted cursor-pointer hover:text-accent transition-colors"
                    onClick={() => handleSort('visitorName')}
                  >
                    Gastmannschaft <span className={getSortIconColor('visitorName')}>{getSortIcon('visitorName')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedGames.map((game) => (
                  <tr key={game.id} className="border-b border-border hover:bg-elevated transition-colors">
                    <td className="px-4 py-3 text-foreground">
                      <RouterLink to={`/games/${game.id}`} className="link hover:text-accent">
                        {game.name || '-'}
                      </RouterLink>
                    </td>
                    <td className="px-4 py-3 text-foreground">
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
                            <div className="text-sm text-subtle">{game.hostShortName}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded bg-elevated">
                          <span className="text-foreground font-semibold">{game.goalHost ?? '-'}</span>
                          <span className="text-subtle">:</span>
                          <span className="text-foreground font-semibold">{game.goalVisitor ?? '-'}</span>
                        </span>
                        {game.goalHost == null && game.goalVisitor == null && (
                          <button
                            onClick={() => setImportGameId(game.id)}
                            className="px-2 py-1 text-xs rounded bg-primary text-[#1b2838] font-medium hover:bg-primary"
                          >
                            Import
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground">
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
                            <div className="text-sm text-subtle">{game.visitorShortName}</div>
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
        <div className="text-center py-8 text-subtle">
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

      {currentSeason?.id && selectedRound && (
        <MatchdayMailSendDialog
          isOpen={mailDialogOpen}
          onClose={() => setMailDialogOpen(false)}
          seasonId={currentSeason.id}
          roundNumber={selectedRound}
        />
      )}
    </div>
  )
}