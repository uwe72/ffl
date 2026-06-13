import { gameApi } from '../api/games'
import { playerApi } from '../api/players'
import { teamApi } from '../api/teams'
import { useState, useEffect } from 'react'
import { positionLabels, positionColors } from '../pages/Players'
import type { ValidationResult, PlayerSearchDto, Team, Game } from '../types'
import Button from './Button'

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
        await gameApi.importWithMappings(gameId, mappings, formationExtern)
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
      <div className="bg-surface rounded-lg border border-border p-6 max-w-4xl w-full mx-4 max-h-[200vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Formation importieren
        </h3>
        <div className="flex items-center justify-center gap-4 mb-4 py-3 bg-elevated rounded-lg">
          {game?.hostLogoUrl && (
            <img src={game.hostLogoUrl} alt={game.hostName} className="h-10 w-10 object-contain" />
          )}
          <span className="text-foreground font-medium">{game?.hostName}</span>
          <span className="text-subtle text-sm">vs</span>
          <span className="text-foreground font-medium">{game?.visitorName}</span>
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
              className="input-field w-full h-[500px] px-3 py-2 text-sm focus:outline-none font-mono resize-y mb-4"
              placeholder="Tore, Aufstellung, Wechsel, Trainer einfügen (Strg+V)..."
              autoFocus
            />

            {successMessage && (
              <div className="bg-success-bg border border-success/30 rounded-lg p-3 mb-4 text-success flex items-center gap-2">
                <span className="text-lg">✓</span>
                <span>{successMessage}</span>
              </div>
            )}

            {error && (
              <div className="bg-danger-bg border border-danger/30 rounded-lg p-3 mb-4 text-danger flex items-center gap-2">
                <span className="text-lg">✗</span>
                <span>{error}</span>
              </div>
            )}

            {validation && (
              <div className={`border rounded-lg p-3 mb-4 ${validation.valid ? 'bg-success-bg border-success/30' : 'bg-warning-bg border-warning/30'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-lg ${validation.valid ? 'text-success' : 'text-warning'}`}>
                    {validation.valid ? '✓' : '⚠'}
                  </span>
                  <span className={`font-medium ${validation.valid ? 'text-success' : 'text-warning'}`}>
                    {validation.valid ? 'Validierung erfolgreich' : 'Validierungsfehler'}
                  </span>
                </div>
                {!validation.valid && validation.errors.length > 0 && (
                  <ul className="text-sm text-muted space-y-1 mb-2">
                    {validation.errors.map((err, idx) => (
                      <li key={idx}>• {err}</li>
                    ))}
                  </ul>
                )}
                {validation.missingPlayers && validation.missingPlayers.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-danger mb-1">Fehlende Spieler:</p>
                    <ul className="text-sm text-muted space-y-1">
                      {validation.missingPlayers.map((mp, idx) => (
                        <li key={idx}>• {mp.playerName} ({mp.teamName})</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="text-sm text-muted mt-2">
                  Heim: {validation.hostPlayerCount} Spieler | Gast: {validation.visitorPlayerCount} Spieler
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={handleValidate}
                disabled={!formationExtern.trim()}
              >
                Validieren
              </Button>
              <Button
                variant="emphasized"
                onClick={handleDirectImport}
                disabled={importing || !formationExtern.trim() || validation === null || !validation.valid}
              >
                {importing ? 'Importiere...' : 'Importieren'}
              </Button>
              <Button
                variant="ghost"
                onClick={onClose}
              >
                Abbrechen
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-danger">⚠</span>
              <span className="text-danger font-medium">Spieler nicht gefunden:</span>
              <span className="text-primary font-semibold">{currentMissing?.playerName}</span>
              {currentMissing?.teamName && <span className="text-muted">({currentMissing.teamName})</span>}
              <span className="text-subtle ml-auto">{currentMissingIndex + 1}/{validation?.missingPlayers?.length || 0}</span>
            </div>

            {successMessage && (
              <div className="bg-success-bg border border-success/30 rounded-lg p-3 mb-4 text-success flex items-center gap-2">
                <span className="text-lg">✓</span>
                <span>{successMessage}</span>
              </div>
            )}

            {error && (
              <div className="bg-danger-bg border border-danger/30 rounded-lg p-3 mb-4 text-danger flex items-center gap-2">
                <span className="text-lg">✗</span>
                <span>{error}</span>
              </div>
            )}

            <div className="flex border-b border-border mb-4">
              <button
                onClick={() => setActiveTab('search')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'search'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-subtle hover:text-muted'
                }`}
              >
                Spieler suchen
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'create'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-subtle hover:text-muted'
                }`}
              >
                Neu erstellen (99 Mio.)
              </button>
            </div>

            {activeTab === 'search' && (
              <div>
                <div className="flex gap-3 mb-3">
                  <div className="flex-1">
                    <label className="block text-xs text-subtle mb-1">Verein (optional)</label>
                    <select
                      value={selectedTeamId ?? ''}
                      onChange={(e) => setSelectedTeamId(e.target.value ? Number(e.target.value) : null)}
                      className="input-field w-full px-3 py-2"
                    >
                      <option value="">Alle Vereine</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-subtle mb-1">Name suchen</label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Name eingeben..."
                      className="input-field w-full px-3 py-2"
                    />
                  </div>
                </div>

                <div className="border border-border rounded-lg overflow-y-auto" style={{ maxHeight: '280px' }}>
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
                          <thead className="bg-elevated sticky top-0">
                            <tr>
                              <th className="px-2 py-2 text-left text-xs font-semibold text-muted">Name</th>
                              <th className="px-2 py-2 text-left text-xs font-semibold text-muted">Alt1</th>
                              <th className="px-2 py-2 text-left text-xs font-semibold text-muted">Alt2</th>
                              <th className="px-2 py-2 text-left text-xs font-semibold text-muted">Alt3</th>
                              <th className="px-2 py-2 text-left text-xs font-semibold text-muted">Pos</th>
                              <th className="px-2 py-2 text-left text-xs font-semibold text-muted">Verein</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredPlayers
                              .sort((a, b) => (POSITION_ORDER[a.position || ''] || 99) - (POSITION_ORDER[b.position || ''] || 99))
                              .map((player, idx) => (
                              <tr
                                key={player.id}
                                onClick={() => setSelectedPlayerId(player.id)}
                                className={`border-b border-border cursor-pointer transition-colors ${
                                  selectedPlayerId === player.id 
                                    ? 'bg-primary/30 border-l-2 border-l-primary' 
                                    : idx % 2 === 1 ? 'bg-zebra hover:bg-card-hover' : 'hover:bg-card-hover'
                                }`}
                              >
                                <td className="px-2 py-2 text-foreground">{player.nameKicker}</td>
                                <td className="px-2 py-2 text-muted text-xs">{player.nameKickerAlt1 || '-'}</td>
                                <td className="px-2 py-2 text-muted text-xs">{player.nameKickerAlt2 || '-'}</td>
                                <td className="px-2 py-2 text-muted text-xs">{player.nameKickerAlt3 || '-'}</td>
                                <td className="px-2 py-2">
                                  {player.position ? (
                                    <span className={`${positionColors[player.position]} text-xs font-medium px-2 py-0.5 rounded`}>
                                      {positionLabels[player.position]}
                                    </span>
                                  ) : '-'}
                                </td>
                                <td className="px-2 py-2 text-muted text-xs">
                                  {player.teams?.map(t => t.name).join(', ') || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )
                    }
                    return (
                      <div className="p-4 text-center text-subtle">
                        Keine Spieler gefunden
                      </div>
                    )
                  })()}
                </div>

                <Button
                  variant="emphasized"
                  onClick={handleSelectPlayer}
                  disabled={!selectedPlayerId}
                  className="mt-3"
                >
                  {selectedPlayerId ? 'Übernehmen' : 'Spieler auswählen'}
                </Button>
              </div>
            )}

            {activeTab === 'create' && (
              <div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs text-subtle mb-1">Name</label>
                    <input
                      type="text"
                      value={currentMissing?.playerName || ''}
                      disabled
                      className="input-field w-full px-3 py-2 opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-subtle mb-1">Position</label>
                    <select
                      value={createPosition}
                      onChange={(e) => setCreatePosition(e.target.value)}
                      className="input-field w-full px-3 py-2"
                    >
                      <option value="GOALKEEPER">Torwart</option>
                      <option value="DEFENDER">Verteidiger</option>
                      <option value="MIDFIELD">Mittelfeld</option>
                      <option value="STRIKER">Stürmer</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs text-subtle mb-1">Verein</label>
                  {currentMissing?.teamId ? (
                    <input
                      type="text"
                      value={currentMissing.teamName || ''}
                      disabled
                      className="input-field w-full px-3 py-2 opacity-60"
                    />
                  ) : (
                    <select
                      value={createTeamId || ''}
                      onChange={(e) => setCreateTeamId(Number(e.target.value))}
                      className="input-field w-full px-3 py-2"
                    >
                      <option value={game?.hostId}>{game?.hostName}</option>
                      <option value={game?.visitorId}>{game?.visitorName}</option>
                    </select>
                  )}
                </div>

                <Button
                  variant="ghost"
                  onClick={handleCreateNew}
                  disabled={importing || (!currentMissing?.teamId && !createTeamId)}
                  className="w-full"
                >
                  {importing ? 'Erstelle...' : 'Neu erstellen'}
                </Button>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-border flex justify-end">
              <Button
                variant="ghost"
                onClick={onClose}
              >
                Abbrechen
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
