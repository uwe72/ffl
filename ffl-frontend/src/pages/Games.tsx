import { useState, useMemo, useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useGames, useGame } from '../hooks/useGames'
import { useCurrentSeason } from '../hooks/useSeasons'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import FormationImportDialog from '../components/FormationImportDialog'
import MatchdayMailSendDialog from '../components/MatchdayMailSendDialog'
import Button from '../components/Button'
import PageHeader from '../components/PageHeader'
import CardContainer from '../components/CardContainer'
import SortIcon from '../components/SortIcon'
import { TableContent, TableHead, ThSortable, TableBody } from '../components/Table'
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
          
          <div className="flex items-center gap-2 px-4 py-2 rounded bg-elevated">
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
  onMailSend,
  mailDisabled,
  isAdmin
}: { 
  selectedRound: number | null
  setSelectedRound: (r: number | null) => void
  rounds: number[]
  onMailSend: () => void
  mailDisabled: boolean
  isAdmin: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-2.5 bg-elevated/50 border-b border-border flex-wrap">
      <div className="flex items-center gap-2">
        <label className="text-muted text-sm">Spieltag:</label>
        <button
          onClick={() => {
            const currentIndex = rounds.indexOf(selectedRound!)
            if (currentIndex > 0) setSelectedRound(rounds[currentIndex - 1])
          }}
          disabled={!selectedRound || rounds.indexOf(selectedRound) <= 0}
          className="p-1.5 rounded bg-surface border border-border text-foreground hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border transition-colors"
          title="Vorheriger Spieltag"
        >
          <i className="sap-icon sap-icon-navigation-left-arrow text-[14px]" />
        </button>
        <select
          value={selectedRound || ''}
          onChange={(e) => setSelectedRound(e.target.value ? Number(e.target.value) : null)}
          className="input-field border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-accent"
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
          className="p-1.5 rounded bg-surface border border-border text-foreground hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border transition-colors"
          title="Nächster Spieltag"
        >
          <i className="sap-icon sap-icon-navigation-right-arrow text-[14px]" />
        </button>
      </div>

      {isAdmin && (
        <Button
          variant="emphasized"
          size="compact"
          onClick={onMailSend}
          disabled={mailDisabled}
        >
          <i className="sap-icon sap-icon-email text-[14px] mr-1.5" />
          Spieltagsmail
        </Button>
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
      <PageHeader icon="sap-icon-calendar" title="Spiele" />

      <CardContainer>
        <FilterBar
          selectedRound={selectedRound}
          setSelectedRound={setSelectedRound}
          rounds={rounds}
          onMailSend={() => setMailDialogOpen(true)}
          mailDisabled={!selectedRound || !currentSeason?.id}
          isAdmin={isAdmin}
        />

        {!isMobile && (
          <TableContent count={sortedGames.length} total={games?.length || 0} countLabel="Spielen">
            <table className="w-full">
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
                      <td className="px-3 py-2">
                        <RouterLink
                          to={`/games/${game.id}`}
                          className="hover:text-accent-hover link text-primary"
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
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded bg-elevated">
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
          </TableContent>
        )}

        {isMobile && (
          <div className="flex-1 px-6 pb-6 overflow-x-auto">
            <div className="grid gap-4 mt-4">
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
      </CardContainer>

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

      {isAdmin && currentSeason?.id && selectedRound && (
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
