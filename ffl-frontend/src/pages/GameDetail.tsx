import { useParams, Link as RouterLink, Link } from 'react-router-dom'
import { useGame } from '../hooks/useGames'
import { gameApi } from '../api/games'
import { useQueryClient } from '@tanstack/react-query'
import type { PlayerPoints } from '../types'
import { useState, useEffect } from 'react'
import { positionLabels, positionColors } from './Players'
import { useAuth } from '../context/AuthContext'
import Badge from '../components/Badge'
import Button from '../components/Button'
import FormationImportDialog from '../components/FormationImportDialog'
import { TableHead, Th, TableBody } from '../components/Table'

const POSITION_ORDER: Record<string, number> = {
  'GOALKEEPER': 1,
  'DEFENDER': 2,
  'MIDFIELD': 3,
  'STRIKER': 4
}

function PlayerPointsTable({ players, teamName }: { players: PlayerPoints[] | undefined; teamName: string }) {
  const playerCount = players?.length || 0
  const sortedPlayers = [...(players || [])].sort((a, b) => {
    const posA = POSITION_ORDER[a.position || ''] || 99
    const posB = POSITION_ORDER[b.position || ''] || 99
    if (posA !== posB) return posA - posB
    return (b.totalPoints || 0) - (a.totalPoints || 0)
  })

  return (
    <div className="bg-surface rounded-lg border border-border overflow-hidden">
      <h3 className="px-4 py-3 text-lg font-semibold text-foreground border-b border-border bg-elevated">
        {teamName} ({playerCount} Spieler)
      </h3>
      {sortedPlayers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <TableHead>
              <tr>
                <Th>Spieler</Th>
                <Th>Position</Th>
                <Th align="center">Punkte</Th>
                <Th>Regeln</Th>
              </tr>
            </TableHead>
            <TableBody>
              {sortedPlayers.map((player, index) => {
                const altNames = [player.nameKickerAlt1, player.nameKickerAlt2, player.nameKickerAlt3].filter(Boolean)
                return (
                  <tr key={player.playerId} className={`border-b border-border hover:bg-card-hover transition-colors ${index % 2 === 1 ? 'bg-zebra' : ''}`}>
                    <td className="px-3 py-2 text-foreground">
                      <div className="flex items-center">
                        {player.pictureUrl && (
                          <img src={player.pictureUrl} alt={player.playerName} className="w-10 h-10 rounded-full object-cover mr-3" />
                        )}
                        <div>
                          <Link to={`/players/${player.playerId}`} className="font-medium hover:text-accent-hover link">
                            {player.playerName}
                          </Link>
                          <div className="text-xs text-subtle">{altNames.length > 0 ? altNames.join(' | ') : '[Kein alternativer Name]'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {player.position ? (
                        <span className={`${positionColors[player.position]} text-xs font-medium px-2 py-0.5 rounded`}>
                          {positionLabels[player.position]}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="font-semibold text-primary">{player.totalPoints || '-'}</span>
                    </td>
                    <td className="px-3 py-2">
                      {player.rules && player.rules.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {player.rules.map((rule, idx) => (
                            <span key={idx} className="text-xs px-2 py-0.5 rounded bg-elevated text-muted">
                              {rule.ruleLabel} ({rule.count})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-subtle">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </TableBody>
          </table>
        </div>
      ) : (
        <div className="px-4 py-4 text-center text-subtle">
          Keine Spieler gefunden
        </div>
      )}
    </div>
  )
}

export default function GameDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const { data: game, isLoading, error } = useGame(Number(id))
  const [showFormation, setShowFormation] = useState(false)
  const [formation, setFormation] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
    
  useEffect(() => {
    if (game?.formation) {
      setFormation(game.formation)
    }
  }, [game?.formation])

  const handleSaveFormation = async () => {
    if (!id) return
    setSaving(true)
    try {
      await gameApi.updateFormation(Number(id), formation)
      queryClient.invalidateQueries({ queryKey: ['games', Number(id)] })
    } catch (err) {
      console.error('Fehler beim Speichern', err)
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>
  if (!game) return <div className="text-center py-8 text-subtle">Spiel nicht gefunden</div>

  return (
    <div>
      <RouterLink to="/games" className="inline-flex items-center gap-1 text-sm text-[#c9a66b] hover:text-[#d4b77a] hover:underline mb-4">
        <i className="sap-icon sap-icon-nav-back text-base" />
        Zurück zur Übersicht
      </RouterLink>

      {isAdmin && (
        <FormationImportDialog
          isOpen={showImportDialog}
          onClose={() => setShowImportDialog(false)}
          onImport={() => {
            queryClient.invalidateQueries({ queryKey: ['games'] })
            queryClient.invalidateQueries({ queryKey: ['games', Number(id)] })
          }}
          initialValue={game?.formationExtern || ''}
          gameId={Number(id)}
          game={game}
        />
      )}

      <div className="bg-surface rounded-lg border border-border p-6 mb-6">
        <div className="text-center mb-4">
          <Badge>{game.roundNumber ? `${game.roundNumber}. Spieltag` : 'Spieltag'}</Badge>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex-1 flex flex-col items-center">
            {game.hostLogoUrl && (
              <img 
                src={game.hostLogoUrl} 
                alt={game.hostName}
                className="w-20 h-20 object-contain mb-2"
              />
            )}
            <div className="text-lg font-medium text-foreground text-center">{game.hostName || '-'}</div>
            {game.hostShortName && (
              <div className="text-sm text-subtle">{game.hostShortName}</div>
            )}
          </div>
          
          <div className="flex items-center gap-4 px-8">
            <span className="text-4xl font-bold text-foreground">{game.goalHost ?? '-'}</span>
            <span className="text-3xl text-subtle">:</span>
            <span className="text-4xl font-bold text-foreground">{game.goalVisitor ?? '-'}</span>
          </div>
          
          <div className="flex-1 flex flex-col items-center">
            {game.visitorLogoUrl && (
              <img 
                src={game.visitorLogoUrl} 
                alt={game.visitorName}
                className="w-20 h-20 object-contain mb-2"
              />
            )}
            <div className="text-lg font-medium text-foreground text-center">{game.visitorName || '-'}</div>
            {game.visitorShortName && (
              <div className="text-sm text-subtle">{game.visitorShortName}</div>
            )}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="bg-surface rounded-lg border border-border mb-6 overflow-hidden">
          <button
            onClick={() => setShowFormation(!showFormation)}
            className="w-full px-4 py-3 flex items-center justify-between text-lg font-semibold text-foreground bg-elevated hover:bg-default transition-colors"
          >
            <span className="flex items-center gap-2">
              <span>Formation</span>
              <span className="text-muted">{showFormation ? '▲' : '▼'}</span>
            </span>
            <Button
              variant="emphasized"
              size="sm"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); setShowImportDialog(true) }}
            >
              + Import
            </Button>
          </button>
          {showFormation && (
            <div className="p-4">
              <textarea
                value={formation}
                onChange={(e) => setFormation(e.target.value)}
                className="w-full h-64 px-3 py-2 rounded border border-border bg-elevated text-muted font-mono text-sm resize-y"
                placeholder="Formation-String hier einfügen..."
              />
              <div className="flex justify-end mt-2">
                <Button
                  variant="emphasized"
                  onClick={handleSaveFormation}
                  disabled={saving}
                >
                  {saving ? 'Speichere...' : 'Speichern'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PlayerPointsTable players={game.playersHost} teamName={game.hostName || 'Heim'} />
        <PlayerPointsTable players={game.playersVisitor} teamName={game.visitorName || 'Gast'} />
      </div>
    </div>
  )
}
