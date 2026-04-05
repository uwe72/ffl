import { gameApi } from '../api/games'
import { playerApi } from '../api/players'
import { teamApi } from '../api/teams'
import { useState, useEffect } from 'react'
import { Chip } from '@heroui/react'
import { positionLabels, positionColors } from '../pages/Players'
import type { ValidationResult, PlayerSearchDto, Team, Game } from '../types'

const POSITION_ORDER: Record<string, number> = {
  'GOALKEEPER': 1,
  'DEFENDER': 2,
  'MIDFIELD': 3,
  'STRIKER': 4
}

interface FormationImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onImport: () => void
  initialValue: string
  gameId: number
  game: Game | null | undefined
}

export default function FormationImportDialog({
  isOpen,
  onClose,
  onImport,
  initialValue,
  gameId,
  game
}: FormationImportDialogProps) {
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
  const [searchTerm, setSearchTerm] = useState('')
  
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
      setSearchTerm('')
    }
  }, [showMissingDialog, currentMissing, game?.hostId])

  useEffect(() => {
    if (!game?.seasonId) return
    if (selectedTeamId) {
      playerApi.getByTeamAndSeason(selectedTeamId, game.seasonId)
        .then(res => setTeamPlayers(res.data))
        .catch(() => setTeamPlayers([]))
    } else {
      playerApi.getAllBySeason(game.seasonId)
        .then(res => setTeamPlayers(res.data))
        .catch(() => setTeamPlayers([]))
    }
  }, [selectedTeamId, game?.seasonId])

  const handleValidate = async () => {
    if (!formationExtern.trim()) return
    setError(null)
    console.log('=== FRONTEND VALIDATE ===')
    console.log('Länge:', formationExtern.length)
    console.log('Letzte 100 Zeichen:', formationExtern.slice(-100))
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
      <div className="bg-[#1a2028] rounded-lg border border-[#2d3748] p-6 max-w-4xl w-full mx-4 max-h-[200vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-[#f5f5f5] mb-4">
          Formation importieren
        </h3>
        <div className="flex items-center justify-center gap-4 mb-4 py-3 bg-[#242d38] rounded-lg">
          {game?.hostLogoUrl && (
            <img src={game.hostLogoUrl} alt={game.hostName} className="h-10 w-10 object-contain" />
          )}
          <span className="text-[#f5f5f5] font-medium">{game?.hostName}</span>
          <span className="text-[#6b7280] text-sm">vs</span>
          <span className="text-[#f5f5f5] font-medium">{game?.visitorName}</span>
          {game?.visitorLogoUrl && (
            <img src={game.visitorLogoUrl} alt={game.visitorName} className="h-10 w-10 object-contain" />
          )}
        </div>
        
        {!showMissingDialog ? (
          <>
            <textarea
              value={formationExtern}
              onChange={(e) => {
                setFormationExtern(e.target.value)
                setValidation(null)
              }}
              className="w-full h-[500px] px-3 py-2 rounded border border-[#2d3748] bg-[#242d38] text-[#a0aec0] font-mono text-sm resize-y mb-4"
              placeholder="Tore, Aufstellung, Wechsel, Trainer einfügen (Strg+V)..."
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
                disabled={importing || !formationExtern.trim() || validation === null || !validation.valid}
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
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[#e05252]">⚠</span>
              <span className="text-[#e05252] font-medium">Spieler nicht gefunden:</span>
              <span className="text-[#c9a66b] font-semibold">{currentMissing?.playerName}</span>
              {currentMissing?.teamName && <span className="text-[#a0aec0]">({currentMissing.teamName})</span>}
              <span className="text-[#6b7280] ml-auto">{currentMissingIndex + 1}/{validation?.missingPlayers?.length || 0}</span>
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

            {activeTab === 'search' && (
              <div>
                <div className="flex gap-3 mb-3">
                  <div className="flex-1">
                    <label className="block text-xs text-[#6b7280] mb-1">Verein (optional)</label>
                    <select
                      value={selectedTeamId ?? ''}
                      onChange={(e) => setSelectedTeamId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 rounded border border-[#2d3748] bg-[#242d38] text-[#f5f5f5]"
                    >
                      <option value="">Alle Vereine</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-[#6b7280] mb-1">Name suchen</label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Name eingeben..."
                      className="w-full px-3 py-2 rounded border border-[#2d3748] bg-[#242d38] text-[#f5f5f5] placeholder-[#6b7280]"
                    />
                  </div>
                </div>

                <div className="border border-[#2d3748] rounded-lg overflow-y-auto" style={{ maxHeight: '280px' }}>
                  {(() => {
                    const searchLower = searchTerm.toLowerCase()
                    const filteredPlayers = teamPlayers.filter(p => {
                      if (!searchTerm) return true
                      return [p.nameKicker, p.nameKickerAlt1, p.nameKickerAlt2, p.nameKickerAlt3]
                        .some(name => name?.toLowerCase().includes(searchLower))
                    })
                    
                    if (filteredPlayers.length > 0) {
                      return (
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
                            {filteredPlayers
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
                      )
                    }
                    return (
                      <div className="p-4 text-center text-[#6b7280]">
                        Keine Spieler gefunden
                      </div>
                    )
                  })()}
                </div>

                <button
                  onClick={handleSelectPlayer}
                  disabled={!selectedPlayerId}
                  className="mt-3 px-4 py-2 rounded bg-[#c9a66b] text-[#1a2028] font-medium hover:bg-[#b8956a] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedPlayerId ? 'Übernehmen' : 'Spieler auswählen'}
                </button>
              </div>
            )}

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
