import { useParams, Link as RouterLink } from 'react-router-dom'
import { useGame } from '../hooks/useGames'
import { gameApi } from '../api/games'
import { playerApi } from '../api/players'
import { teamApi } from '../api/teams'
import { useQueryClient } from '@tanstack/react-query'
import type { PlayerPoints, ValidationResult, PlayerSearchDto, Team } from '../types'
import { useState, useEffect } from 'react'
import { Chip } from '@heroui/react'
import { positionLabels, positionColors } from './Players'

const POSITION_ORDER: Record<string, number> = {
  'GOALKEEPER': 1,
  'DEFENDER': 2,
  'MIDFIELD': 3,
  'STRIKER': 4
}

function FormationImportDialog({
  isOpen,
  onClose,
  onImport,
  initialValue,
  gameId,
  game
}: {
  isOpen: boolean
  onClose: () => void
  onImport: () => void
  initialValue: string
  gameId: number
  game: any
}) {
  const [formationExtern, setFormationExtern] = useState(initialValue)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMissingDialog, setShowMissingDialog] = useState(false)
  const [currentMissingIndex, setCurrentMissingIndex] = useState(0)
  const [playerMappings, setPlayerMappings] = useState<Record<string, number>>({})
  
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)
  const [teamPlayers, setTeamPlayers] = useState<PlayerSearchDto[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null)
  
  const [createPosition, setCreatePosition] = useState<string>('MIDFIELD')
  const [createTeamId, setCreateTeamId] = useState<number | null>(null)
  
  const [activeTab, setActiveTab] = useState<'search' | 'create'>('search')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    setFormationExtern(initialValue)
    setValidation(null)
    setShowMissingDialog(false)
    setCurrentMissingIndex(0)
    setPlayerMappings({})
    setError(null)
    setActiveTab('search')
    setSelectedPlayerId(null)
    setSuccessMessage(null)
  }, [initialValue, isOpen])

  useEffect(() => {
    if (isOpen) {
      teamApi.getAll()
        .then(res => setTeams(res.data))
        .catch(err => {
          console.error('Fehler beim Laden der Teams:', err)
          setTeams([])
        })
    }
  }, [isOpen])

  const currentMissing = validation?.missingPlayers?.[currentMissingIndex]

  useEffect(() => {
    if (showMissingDialog && currentMissing) {
      const initialTeamId = currentMissing.teamId || game?.hostId || null
      setSelectedTeamId(initialTeamId)
      setCreateTeamId(initialTeamId)
      setSelectedPlayerId(null)
      setActiveTab('search')
    }
  }, [showMissingDialog, currentMissing, game?.hostId])

  useEffect(() => {
    if (selectedTeamId && game?.seasonId) {
      playerApi.getByTeamAndSeason(selectedTeamId, game.seasonId)
        .then(res => setTeamPlayers(res.data))
        .catch(() => setTeamPlayers([]))
    }
  }, [selectedTeamId, game?.seasonId])

  const handleValidate = async () => {
    if (!formationExtern.trim()) return
    setError(null)
    try {
      const res = await gameApi.validateFormation(gameId, formationExtern)
      setValidation(res.data)
      if (res.data.missingPlayers && res.data.missingPlayers.length > 0) {
        setShowMissingDialog(true)
        setCurrentMissingIndex(0)
        setPlayerMappings({})
      }
    } catch {
      setError('Validierung fehlgeschlagen')
    }
  }

  const handleSelectPlayer = async () => {
    if (!selectedPlayerId || !validation?.missingPlayers) return
    const current = validation.missingPlayers[currentMissingIndex]
    const newMappings = { ...playerMappings, [current.playerName]: selectedPlayerId }
    setPlayerMappings(newMappings)
    
    try {
      if (current.teamId) {
        await playerApi.assignToTeam(selectedPlayerId, current.teamId, current.playerName)
      }
    } catch (err) {
      console.error('Fehler beim Zuweisen', err)
    }
    
    if (currentMissingIndex < validation.missingPlayers.length - 1) {
      setCurrentMissingIndex(currentMissingIndex + 1)
      setSelectedPlayerId(null)
    } else {
      await executeImport(newMappings)
    }
  }

  const handleCreateNew = async () => {
    if (!validation?.missingPlayers || !createTeamId) return
    const current = validation.missingPlayers[currentMissingIndex]
    
    setImporting(true)
    try {
      await gameApi.createPlayer(gameId, current.playerName, createTeamId, createPosition)
      
      if (currentMissingIndex < validation.missingPlayers.length - 1) {
        setCurrentMissingIndex(currentMissingIndex + 1)
        setCreatePosition('MIDFIELD')
        setSelectedPlayerId(null)
      } else {
        await executeImport(playerMappings)
      }
    } catch {
      setError('Fehler beim Erstellen des Spielers')
    } finally {
      setImporting(false)
    }
  }

  const executeImport = async (mappings: Record<string, number>) => {
    setImporting(true)
    setError(null)
    try {
      if (Object.keys(mappings).length > 0) {
        await gameApi.importWithMappings(gameId, mappings)
      } else {
        await gameApi.importFormation(gameId, formationExtern)
      }
      setSuccessMessage('Formation erfolgreich importiert!')
      onImport()
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Import fehlgeschlagen'
      setError(errorMsg)
    } finally {
      setImporting(false)
    }
  }

  const handleDirectImport = async () => {
    setImporting(true)
    setError(null)
    try {
      await gameApi.importFormation(gameId, formationExtern)
      setSuccessMessage('Formation erfolgreich importiert!')
      onImport()
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Import fehlgeschlagen'
      setError(errorMsg)
    } finally {
      setImporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a2028] rounded-lg border border-[#2d3748] p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-[#f5f5f5] mb-4">
          Formation importieren
        </h3>
        
        {!showMissingDialog ? (
          <>
            <p className="text-sm text-[#a0aec0] mb-4">
              Text aus Zwischenablage einfügen (Strg+V) oder direkt eingeben:
            </p>

            <textarea
              value={formationExtern}
              onChange={(e) => {
                setFormationExtern(e.target.value)
                setValidation(null)
              }}
              className="w-full h-48 px-3 py-2 rounded border border-[#2d3748] bg-[#242d38] text-[#a0aec0] font-mono text-sm resize-y mb-4"
              placeholder="Tore, Aufstellung, Wechsel, Trainer hier einfügen..."
              autoFocus
            />

            {successMessage && (
              <div className="bg-green-900/20 border border-green-700 rounded-lg p-3 mb-4 text-green-400 flex items-center gap-2">
                <span className="text-lg">✓</span>
                <span>{successMessage}</span>
              </div>
            )}

            {error && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4 text-[#e05252] flex items-center gap-2">
                <span className="text-lg">✗</span>
                <span>{error}</span>
              </div>
            )}

            {validation && (
              <div className={`border rounded-lg p-3 mb-4 ${validation.valid ? 'bg-green-900/20 border-green-800' : 'bg-yellow-900/20 border-yellow-800'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-lg ${validation.valid ? 'text-green-500' : 'text-yellow-500'}`}>
                    {validation.valid ? '✓' : '⚠'}
                  </span>
                  <span className={`font-medium ${validation.valid ? 'text-green-400' : 'text-yellow-400'}`}>
                    {validation.valid ? 'Validierung erfolgreich' : 'Validierungsfehler'}
                  </span>
                </div>
                {!validation.valid && validation.errors.length > 0 && (
                  <ul className="text-sm text-[#a0aec0] space-y-1 mb-2">
                    {validation.errors.map((err, idx) => (
                      <li key={idx}>• {err}</li>
                    ))}
                  </ul>
                )}
                {validation.missingPlayers && validation.missingPlayers.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-[#e05252] mb-1">Fehlende Spieler:</p>
                    <ul className="text-sm text-[#a0aec0] space-y-1">
                      {validation.missingPlayers.map((mp, idx) => (
                        <li key={idx}>• {mp.playerName} ({mp.teamName})</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="text-sm text-[#a0aec0] mt-2">
                  Heim: {validation.hostPlayerCount} Spieler | Gast: {validation.visitorPlayerCount} Spieler
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={handleValidate}
                disabled={!formationExtern.trim()}
                className="px-4 py-2 rounded border border-[#2d3748] text-[#a0aec0] hover:bg-[#242d38] disabled:opacity-50"
              >
                Validieren
              </button>
              <button
                onClick={handleDirectImport}
                disabled={importing || !formationExtern.trim() || (validation !== null && !validation.valid)}
                className="px-4 py-2 rounded bg-[#c9a66b] text-[#1a2028] font-medium hover:bg-[#b8956a] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? 'Importiere...' : 'Importieren'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded border border-[#2d3748] text-[#a0aec0] hover:bg-[#242d38]"
              >
                Abbrechen
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4 text-[#e05252]">
              <span className="text-xl">⚠</span>
              <span className="font-medium">Spieler nicht gefunden</span>
            </div>
            
            <div className="mb-2 text-[#a0aec0]">
              Spieler: <span className="font-medium text-[#c9a66b]">{currentMissing?.playerName}</span> 
              {currentMissing?.teamName ? ` (${currentMissing.teamName})` : ' (Torschütze - Team unbekannt)'}
            </div>
            
            <div className="text-sm text-[#6b7280] mb-6">
              {currentMissingIndex + 1} von {validation?.missingPlayers?.length || 0} fehlenden Spielern
            </div>

            {successMessage && (
              <div className="bg-green-900/20 border border-green-700 rounded-lg p-3 mb-4 text-green-400 flex items-center gap-2">
                <span className="text-lg">✓</span>
                <span>{successMessage}</span>
              </div>
            )}

            {error && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4 text-[#e05252] flex items-center gap-2">
                <span className="text-lg">✗</span>
                <span>{error}</span>
              </div>
            )}

            {/* Tab-Header */}
            <div className="flex border-b border-[#2d3748] mb-4">
              <button
                onClick={() => setActiveTab('search')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'search'
                    ? 'text-[#c9a66b] border-b-2 border-[#c9a66b]'
                    : 'text-[#6b7280] hover:text-[#a0aec0]'
                }`}
              >
                Spieler suchen
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'create'
                    ? 'text-[#c9a66b] border-b-2 border-[#c9a66b]'
                    : 'text-[#6b7280] hover:text-[#a0aec0]'
                }`}
              >
                Neu erstellen (99 Mio.)
              </button>
            </div>

            {/* Tab-Inhalt: Suchen */}
            {activeTab === 'search' && (
              <div>
                <div className="mb-3">
                  <label className="block text-xs text-[#6b7280] mb-1">Verein</label>
                  <select
                    value={selectedTeamId || ''}
                    onChange={(e) => setSelectedTeamId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded border border-[#2d3748] bg-[#242d38] text-[#f5f5f5]"
                  >
                    {teams.length === 0 && (
                      <option value="">Keine Teams verfügbar</option>
                    )}
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="border border-[#2d3748] rounded-lg overflow-y-auto" style={{ maxHeight: '280px' }}>
                  {teamPlayers.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead className="bg-[#242d38] sticky top-0">
                        <tr>
                          <th className="px-2 py-2 text-left text-xs font-semibold text-[#a0aec0]">Name</th>
                          <th className="px-2 py-2 text-left text-xs font-semibold text-[#a0aec0]">Alt1</th>
                          <th className="px-2 py-2 text-left text-xs font-semibold text-[#a0aec0]">Alt2</th>
                          <th className="px-2 py-2 text-left text-xs font-semibold text-[#a0aec0]">Alt3</th>
                          <th className="px-2 py-2 text-left text-xs font-semibold text-[#a0aec0]">Pos</th>
                          <th className="px-2 py-2 text-left text-xs font-semibold text-[#a0aec0]">Verein</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamPlayers
                          .sort((a, b) => (POSITION_ORDER[a.position || ''] || 99) - (POSITION_ORDER[b.position || ''] || 99))
                          .map(player => (
                          <tr
                            key={player.id}
                            onClick={() => setSelectedPlayerId(player.id)}
                            className={`border-b border-[#2d3748] cursor-pointer transition-colors ${
                              selectedPlayerId === player.id 
                                ? 'bg-[#c9a66b]/30 border-l-2 border-l-[#c9a66b]' 
                                : 'hover:bg-[#242d38]'
                            }`}
                          >
                            <td className="px-2 py-2 text-[#f5f5f5]">{player.nameKicker}</td>
                            <td className="px-2 py-2 text-[#a0aec0] text-xs">{player.nameKickerAlt1 || '-'}</td>
                            <td className="px-2 py-2 text-[#a0aec0] text-xs">{player.nameKickerAlt2 || '-'}</td>
                            <td className="px-2 py-2 text-[#a0aec0] text-xs">{player.nameKickerAlt3 || '-'}</td>
                            <td className="px-2 py-2">
                              {player.position ? (
                                <Chip size="sm" color={positionColors[player.position] as any} variant="soft">
                                  {positionLabels[player.position]}
                                </Chip>
                              ) : '-'}
                            </td>
                            <td className="px-2 py-2 text-[#a0aec0] text-xs">
                              {player.teams?.map(t => t.name).join(', ') || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-4 text-center text-[#6b7280]">
                      {selectedTeamId ? 'Keine Spieler gefunden' : 'Bitte Verein auswählen'}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSelectPlayer}
                  disabled={!selectedPlayerId}
                  className="mt-3 w-full px-4 py-2 rounded bg-[#c9a66b] text-[#1a2028] font-medium hover:bg-[#b8956a] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedPlayerId ? 'Übernehmen' : 'Spieler auswählen'}
                </button>
              </div>
            )}

            {/* Tab-Inhalt: Erstellen */}
            {activeTab === 'create' && (
              <div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs text-[#6b7280] mb-1">Name</label>
                    <input
                      type="text"
                      value={currentMissing?.playerName || ''}
                      disabled
                      className="w-full px-3 py-2 rounded border border-[#2d3748] bg-[#242d38] text-[#a0aec0] opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#6b7280] mb-1">Position</label>
                    <select
                      value={createPosition}
                      onChange={(e) => setCreatePosition(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-[#2d3748] bg-[#242d38] text-[#f5f5f5]"
                    >
                      <option value="GOALKEEPER">Torwart</option>
                      <option value="DEFENDER">Verteidiger</option>
                      <option value="MIDFIELD">Mittelfeld</option>
                      <option value="STRIKER">Stürmer</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs text-[#6b7280] mb-1">Verein</label>
                  {currentMissing?.teamId ? (
                    <input
                      type="text"
                      value={currentMissing.teamName || ''}
                      disabled
                      className="w-full px-3 py-2 rounded border border-[#2d3748] bg-[#242d38] text-[#a0aec0] opacity-60"
                    />
                  ) : (
                    <select
                      value={createTeamId || ''}
                      onChange={(e) => setCreateTeamId(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded border border-[#2d3748] bg-[#242d38] text-[#f5f5f5]"
                    >
                      <option value={game?.hostId}>{game?.hostName}</option>
                      <option value={game?.visitorId}>{game?.visitorName}</option>
                    </select>
                  )}
                </div>

                <button
                  onClick={handleCreateNew}
                  disabled={importing || (!currentMissing?.teamId && !createTeamId)}
                  className="w-full px-4 py-2 rounded border border-[#2d3748] text-[#a0aec0] hover:bg-[#242d38] disabled:opacity-50"
                >
                  {importing ? 'Erstelle...' : 'Neu erstellen'}
                </button>
              </div>
            )}

            {/* Abbrechen-Button */}
            <div className="mt-6 pt-4 border-t border-[#2d3748] flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded border border-[#2d3748] text-[#a0aec0] hover:bg-[#242d38]"
              >
                Abbrechen
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
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
                        {altNames.length > 0 && (
                          <div className="text-sm text-[#6b7280]">{altNames.join(' | ')}</div>
                        )}
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
        onImport={() => queryClient.invalidateQueries({ queryKey: ['games', Number(id)] })}
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
