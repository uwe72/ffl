import { useState, useMemo, useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useGames, useGame } from '../hooks/useGames'
import { useCurrentSeason } from '../hooks/useSeasons'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import FormationImportDialog from '../components/FormationImportDialog'
import Button from '../components/Button'
import SortIcon from '../components/SortIcon'
import { TableHead, ThSortable, TableBody } from '../components/Table'
import useIsMobile from '../hooks/useIsMobile'

type SortKey = 'roundNumber' | 'name' | 'hostName' | 'visitorName' | 'goalHost' | 'goalVisitor'
type SortOrder = 'asc' | 'desc'

interface Game {
  id: number
  name?: string
  roundNumber?: number
  hostName?: string
  hostShortName?: string
  hostLogoUrl?: string
  visitorName?: string
  visitorShortName?: string
  visitorLogoUrl?: string
  goalHost?: number
  goalVisitor?: number
  formationExtern?: string
}

function GameCard({ game, onImport, isAdmin }: { game: Game; onImport: (id: number) => void; isAdmin: boolean }) {
  return (
    <div className="card p-4 bg-surface border border-border">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <RouterLink
            to={`/games/${game.id}`}
            className="font-semibold text-primary hover:text-accent-hover link"
          >
            {game.name || '-'}
          </RouterLink>
          <span className="text-sm text-muted">Spieltag {game.roundNumber || '-'}</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            {game.hostLogoUrl && (
              <img
                src={game.hostLogoUrl}
                alt={game.hostName}
                className="h-10 w-10 object-contain flex-shrink-0"
              />
            )}
            <div className="min-w-0">
              <div className="font-medium truncate">{game.hostName || '-'}</div>
              {game.hostShortName && (
                <div className="text-sm text-subtle">{game.hostShortName}</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-badge bg-elevated">
            <span className="text-foreground font-bold text-lg">{game.goalHost ?? '-'}</span>
            <span className="text-subtle">:</span>
            <span className="text-foreground font-bold text-lg">{game.goalVisitor ?? '-'}</span>
          </div>

          <div className="flex items-center gap-3 flex-1 justify-end">
            <div className="min-w-0 text-right">
              <div className="font-medium truncate">{game.visitorName || '-'}</div>
              {game.visitorShortName && (
                <div className="text-sm text-subtle">{game.visitorShortName}</div>
              )}
            </div>
            {game.visitorLogoUrl && (
              <img
                src={game.visitorLogoUrl}
                alt={game.visitorName}
                className="h-10 w-10 object-contain flex-shrink-0"
              />
            )}
          </div>
        </div>

        {isAdmin && game.goalHost == null && game.goalVisitor == null && (
          <div className="flex justify-end">
            <Button
              variant="emphasized"
              size="sm"
              onClick={() => onImport(game.id)}
            >
              Import
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function FilterBar({
  selectedRound,
  setSelectedRound,
  rounds,
  hasFilter,
  onReset
}: {
  selectedRound: number | null
  setSelectedRound: (r: number | null) => void
  rounds: number[]
  hasFilter: boolean
  onReset: () => void
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap mb-4">
      <div className="flex items-center gap-2">
        <span className="text-muted text-xs">Spieltag:</span>
        <button
          onClick={() => {
            const currentIndex = rounds.indexOf(selectedRound!)
            if (currentIndex > 0) setSelectedRound(rounds[currentIndex - 1])
          }}
          disabled={!selectedRound || rounds.indexOf(selectedRound) <= 0}
          className="p-1.5 rounded-control bg-surface border border-border text-foreground hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border transition-colors"
          title="Vorheriger Spieltag"
        >
          <i className="sap-icon sap-icon-navigation-left-arrow text-[14px]" />
        </button>
        <select
          value={selectedRound || ''}
          onChange={(e) => setSelectedRound(e.target.value ? Number(e.target.value) : null)}
          className="input-field control px-2 py-1.5 rounded-control text-xs cursor-pointer min-w-40"
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
          className="p-1.5 rounded-control bg-surface border border-border text-foreground hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border transition-colors"
          title="Nächster Spieltag"
        >
          <i className="sap-icon sap-icon-navigation-right-arrow text-[14px]" />
        </button>
      </div>

      {hasFilter && (
        <button
          onClick={onReset}
          className="p-1 rounded-control text-subtle hover:text-danger transition-colors"
          title="Filter zurücksetzen"
        >
          <i className="sap-icon sap-icon-decline text-[14px]" />
        </button>
      )}
    </div>
  )
}

export default function Games() {
  const isMobile = useIsMobile()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const { data: games, isLoading: gamesLoading, error } = useGames()
  const { data: currentSeason } = useCurrentSeason()
  const [sortKey, setSortKey] = useState<SortKey>('roundNumber')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [selectedRound, setSelectedRound] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [importGameId, setImportGameId] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const { data: importGame } = useGame(importGameId || 0)

  const rounds = useMemo(() => {
    if (!games) return []
    const uniqueRounds = [...new Set(games.map(g => g.roundNumber).filter(Boolean))]
    return uniqueRounds.sort((a, b) => (a || 0) - (b || 0))
  }, [games])

  const defaultRound = useMemo(() => {
    if (rounds.length === 0) return null
    if (currentSeason?.seasonState === 'BEFORE_SEASON') {
      return Math.min(...rounds)
    }
    if (currentSeason?.currentMatchday) {
      return currentSeason.currentMatchday
    }
    return Math.max(...rounds)
  }, [rounds, currentSeason?.seasonState, currentSeason?.currentMatchday])

  useEffect(() => {
    if (selectedRound === null && defaultRound !== null) {
      setSelectedRound(defaultRound)
    }
  }, [selectedRound, defaultRound])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const resetFilter = () => {
    setSearchTerm('')
    setSelectedRound(null)
  }

  const hasActiveFilter = searchTerm !== '' || (selectedRound !== null && selectedRound !== defaultRound)

  const filteredGames = useMemo(() => {
    if (!games) return []
    const term = searchTerm.toLowerCase()
    return games.filter(g => {
      const matchesRound = selectedRound === null || g.roundNumber === selectedRound
      const matchesSearch =
        term === '' ||
        (g.name?.toLowerCase().includes(term) ?? false) ||
        (g.hostName?.toLowerCase().includes(term) ?? false) ||
        (g.visitorName?.toLowerCase().includes(term) ?? false)
      return matchesRound && matchesSearch
    })
  }, [games, selectedRound, searchTerm])

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
      <div className="p-6 bg-surface border border-border rounded-card mb-6 w-fit max-w-full">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold text-foreground">Spiele ({filteredGames.length})</h2>
          <div className="relative w-64">
            <i className="sap-icon sap-icon-search text-[14px] absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Spiele suchen..."
              className="input-field control pl-8 pr-3 py-2 rounded-control text-sm w-full"
            />
          </div>
        </div>

        <FilterBar
          selectedRound={selectedRound}
          setSelectedRound={setSelectedRound}
          rounds={rounds}
          hasFilter={hasActiveFilter}
          onReset={resetFilter}
        />

        {!isMobile && (
          <>
            <div className="overflow-x-auto rounded-card border border-border w-fit max-w-full">
              <table>
                <TableHead>
                  <tr>
                    <ThSortable onClick={() => handleSort('name')}>
                      Name<SortIcon column="name" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    <ThSortable onClick={() => handleSort('hostName')}>
                      Heimmannschaft<SortIcon column="hostName" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    <ThSortable align="center" onClick={() => handleSort('goalHost')}>
                      Ergebnis<SortIcon column="goalHost" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    <ThSortable onClick={() => handleSort('visitorName')}>
                      Gastmannschaft<SortIcon column="visitorName" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                  </tr>
                </TableHead>
                <TableBody>
                  {sortedGames.length > 0 ? (
                    sortedGames.map((game, index) => (
                      <tr key={game.id} className={`border-b border-border hover:bg-card-hover ${index % 2 === 1 ? 'bg-zebra' : ''}`}>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <RouterLink
                            to={`/games/${game.id}`}
                            className="hover:text-accent-hover link text-primary font-medium"
                          >
                            {game.name || '-'}
                          </RouterLink>
                        </td>
                        <td className="px-3 py-2">
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
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-2">
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-badge bg-elevated">
                              <span className="text-foreground font-semibold">{game.goalHost ?? '-'}</span>
                              <span className="text-subtle">:</span>
                              <span className="text-foreground font-semibold">{game.goalVisitor ?? '-'}</span>
                            </span>
                            {isAdmin && game.goalHost == null && game.goalVisitor == null && (
                              <Button
                                variant="emphasized"
                                size="sm"
                                onClick={() => setImportGameId(game.id)}
                              >
                                Import
                              </Button>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
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
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center text-subtle py-8">
                        Keine Spiele gefunden
                      </td>
                    </tr>
                  )}
                </TableBody>
              </table>
            </div>
            <div className="mt-4 text-sm text-subtle">
              {filteredGames.length} von {games?.length || 0} Spielen
            </div>
          </>
        )}

        {isMobile && (
          <div>
            <div className="grid gap-4">
              {sortedGames.length > 0 ? (
                sortedGames.map((game) => (
                  <GameCard key={game.id} game={game} onImport={setImportGameId} isAdmin={isAdmin} />
                ))
              ) : (
                <div className="text-center text-subtle py-8">
                  Keine Spiele gefunden
                </div>
              )}
            </div>
            {sortedGames.length > 0 && (
              <div className="mt-4 text-sm text-subtle">
                {sortedGames.length} von {games?.length || 0} Spielen
              </div>
            )}
          </div>
        )}
      </div>

      {isAdmin && (
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
      )}
    </div>
  )
}
