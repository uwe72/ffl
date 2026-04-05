import { useParams, Link as RouterLink } from 'react-router-dom'
import { useGame } from '../hooks/useGames'
import { gameApi } from '../api/games'
import { useQueryClient } from '@tanstack/react-query'
import type { PlayerPoints } from '../types'
import { useState, useEffect } from 'react'
import { Chip } from '@heroui/react'
import { positionLabels, positionColors } from './Players'
import FormationImportDialog from '../components/FormationImportDialog'

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
    <div className="bg-[#1a2028] rounded-lg border border-[#2d3748] overflow-hidden">
      <h3 className="px-4 py-3 text-lg font-semibold text-[#f5f5f5] border-b border-[#2d3748] bg-[#242d38]">
        {teamName} ({playerCount} Spieler)
      </h3>
      {sortedPlayers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2d3748] bg-[#1a2028]">
                <th className="px-4 py-2 text-left text-sm font-semibold text-[#a0aec0]">Spieler</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-[#a0aec0]">Position</th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-[#a0aec0]">Punkte</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-[#a0aec0]">Regeln</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((player) => {
                const altNames = [player.nameKickerAlt1, player.nameKickerAlt2, player.nameKickerAlt3].filter(Boolean)
                return (
                  <tr key={player.playerId} className="border-b border-[#2d3748] hover:bg-[#242d38] transition-colors">
                    <td className="px-4 py-2 text-[#f5f5f5]">
                      <div>
                        <div className="font-medium">{player.playerName}</div>
                        <div className="text-sm text-[#6b7280]">{altNames.length > 0 ? altNames.join(' | ') : '[Kein alternativer Name]'}</div>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {player.position ? (
                        <Chip size="sm" color={positionColors[player.position] as any} variant="soft">
                          {positionLabels[player.position]}
                        </Chip>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className="font-semibold text-[#c9a66b]">{player.totalPoints || '-'}</span>
                    </td>
                    <td className="px-4 py-2">
                      {player.rules && player.rules.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {player.rules.map((rule, idx) => (
                            <span key={idx} className="text-xs px-2 py-0.5 rounded bg-[#242d38] text-[#a0aec0]">
                              {rule.ruleLabel} ({rule.count})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#6b7280]">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-4 py-4 text-center text-[#6b7280]">
          Keine Spieler gefunden
        </div>
      )}
    </div>
  )
}

export default function GameDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
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

  if (isLoading) return <div className="text-center py-8 text-[#a0aec0]">Laden...</div>
  if (error) return <div className="text-center py-8 text-[#e05252]">Fehler beim Laden</div>
  if (!game) return <div className="text-center py-8 text-[#6b7280]">Spiel nicht gefunden</div>

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-6">
        <RouterLink to="/games" className="text-[#a0aec0] hover:text-[#c9a66b] link">
          ← Spiele
        </RouterLink>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportDialog(true)}
            className="px-4 py-2 rounded bg-[#c9a66b] text-[#1a2028] font-medium hover:bg-[#b8956a]"
          >
            Import
          </button>
        </div>
      </div>

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

      <div className="bg-[#1a2028] rounded-lg border border-[#2d3748] p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 flex flex-col items-center">
            {game.hostLogoUrl && (
              <img 
                src={game.hostLogoUrl} 
                alt={game.hostName}
                className="w-20 h-20 object-contain mb-2"
              />
            )}
            <div className="text-lg font-medium text-[#f5f5f5] text-center">{game.hostName || '-'}</div>
            {game.hostShortName && (
              <div className="text-sm text-[#6b7280]">{game.hostShortName}</div>
            )}
          </div>
          
          <div className="flex items-center gap-4 px-8">
            <span className="text-4xl font-bold text-[#f5f5f5]">{game.goalHost ?? '-'}</span>
            <span className="text-3xl text-[#6b7280]">:</span>
            <span className="text-4xl font-bold text-[#f5f5f5]">{game.goalVisitor ?? '-'}</span>
          </div>
          
          <div className="flex-1 flex flex-col items-center">
            {game.visitorLogoUrl && (
              <img 
                src={game.visitorLogoUrl} 
                alt={game.visitorName}
                className="w-20 h-20 object-contain mb-2"
              />
            )}
            <div className="text-lg font-medium text-[#f5f5f5] text-center">{game.visitorName || '-'}</div>
            {game.visitorShortName && (
              <div className="text-sm text-[#6b7280]">{game.visitorShortName}</div>
            )}
          </div>
        </div>
        
        <div className="text-center mt-4 pt-4 border-t border-[#2d3748]">
          <span className="text-[#a0aec0]">Spieltag {game.roundNumber || '-'}</span>
        </div>
      </div>

      <div className="bg-[#1a2028] rounded-lg border border-[#2d3748] mb-6 overflow-hidden">
        <button
          onClick={() => setShowFormation(!showFormation)}
          className="w-full px-4 py-3 flex items-center justify-between text-lg font-semibold text-[#f5f5f5] bg-[#242d38] hover:bg-[#2d3748] transition-colors"
        >
          <span>Formation</span>
          <span className="text-[#a0aec0]">{showFormation ? '▲' : '▼'}</span>
        </button>
        {showFormation && (
          <div className="p-4">
            <textarea
              value={formation}
              onChange={(e) => setFormation(e.target.value)}
              className="w-full h-64 px-3 py-2 rounded border border-[#2d3748] bg-[#242d38] text-[#a0aec0] font-mono text-sm resize-y"
              placeholder="Formation-String hier einfügen..."
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleSaveFormation}
                disabled={saving}
                className="px-4 py-2 rounded bg-[#c9a66b] text-[#1a2028] font-medium hover:bg-[#b8956a] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Speichere...' : 'Speichern'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PlayerPointsTable players={game.playersHost} teamName={game.hostName || 'Heim'} />
        <PlayerPointsTable players={game.playersVisitor} teamName={game.visitorName || 'Gast'} />
      </div>
    </div>
  )
}
