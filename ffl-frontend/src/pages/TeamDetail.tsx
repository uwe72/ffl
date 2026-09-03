import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTeam, useTeamPlayers, useUpdateTeam } from '../hooks/useTeams'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import BackButton from '../components/BackButton'
import PlayerTable from '../components/PlayerTable'
import useIsMobile from '../hooks/useIsMobile'

export default function TeamDetail() {
  const { id } = useParams<{ id: string }>()
  const isMobile = useIsMobile()
  const { data: team } = useTeam(Number(id))
  const { data: players, isLoading, error } = useTeamPlayers(Number(id))
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const updateTeam = useUpdateTeam()

  const [editData, setEditData] = useState({ shortName: '', slogan: '', logoSUrl: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [stammdatenOpen, setStammdatenOpen] = useState(false)

  useEffect(() => {
    if (team) {
      setEditData({ shortName: team.shortName || '', slogan: team.slogan || '', logoSUrl: team.logoSUrl || '' })
    }
  }, [team])

  const hasChanges = team && (editData.shortName !== (team.shortName || '') || editData.slogan !== (team.slogan || '') || editData.logoSUrl !== (team.logoSUrl || ''))

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateTeam.mutateAsync({ id: Number(id), data: editData })
      setStammdatenOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (team) {
      setEditData({ shortName: team.shortName || '', slogan: team.slogan || '', logoSUrl: team.logoSUrl || '' })
    }
  }

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

  return (
    <div className="md:h-full md:flex md:flex-col md:min-h-0">
      <BackButton to="/teams" className="mb-4 md:shrink-0" />

      <div className="w-fit max-w-full md:flex-1 md:min-h-0 md:flex md:flex-col">
      {team && (
        <div className="p-4 bg-elevated border border-border rounded-card mb-6 md:shrink-0">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 shrink-0">
              {team.logoSUrl ? (
                <img src={team.logoSUrl} alt={team.name} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-accent-muted text-accent flex items-center justify-center">
                  <i className="sap-icon sap-icon-shield text-xl" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {!stammdatenOpen && (
                <div>
                  <h2 className="text-3xl font-bold text-foreground truncate">{team.name}</h2>
                  <p className="text-xs uppercase tracking-wide text-subtle mt-2">
                    {team.slogan || '-'}
                  </p>
                </div>
              )}

              {stammdatenOpen && (
                <div id="stammdaten-form">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="min-w-0">
                      <span className="text-xs text-muted">Name</span>
                      <input
                        type="text"
                        value={team.name}
                        readOnly
                        className="input-field control w-full px-2 py-1 rounded-control text-sm mt-1"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs text-muted">Kurzname</span>
                      <input
                        type="text"
                        value={editData.shortName}
                        onChange={(e) => setEditData({ ...editData, shortName: e.target.value })}
                        required
                        className="input-field control w-full px-2 py-1 rounded-control text-sm mt-1"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs text-muted">Slogan</span>
                      <input
                        type="text"
                        value={editData.slogan}
                        onChange={(e) => setEditData({ ...editData, slogan: e.target.value })}
                        maxLength={22}
                        className="input-field control w-full px-2 py-1 rounded-control text-sm mt-1"
                      />
                    </div>
                  </div>
                  <div className="mt-4 min-w-0">
                    <span className="text-xs text-muted">Logo URL</span>
                    <input
                      type="text"
                      value={editData.logoSUrl}
                      onChange={(e) => setEditData({ ...editData, logoSUrl: e.target.value })}
                      className="input-field control w-full px-2 py-1 rounded-control text-sm mt-1"
                    />
                  </div>
                  {hasChanges && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="emphasized"
                        size={isMobile ? 'sm' : 'input'}
                        onClick={handleSave}
                        disabled={isSaving}
                      >
                        {isSaving ? 'Wird gespeichert...' : 'Speichern'}
                      </Button>
                      <Button
                        variant="ghost"
                        size={isMobile ? 'sm' : 'input'}
                        onClick={handleReset}
                      >
                        Abbrechen
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {isAdmin && (
              <Button
                variant={stammdatenOpen ? 'ghost' : 'emphasized'}
                size={isMobile ? 'sm' : 'input'}
                onClick={() => setStammdatenOpen(o => !o)}
                aria-expanded={stammdatenOpen}
                aria-controls="stammdaten-form"
                className="shrink-0 self-start"
              >
                <i className={`sap-icon sap-icon-slim-arrow-${stammdatenOpen ? 'up' : 'down'} text-xs mr-1`} />
                {stammdatenOpen ? 'Schließen' : 'Bearbeiten'}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card mb-6 md:mb-0 w-full md:w-fit max-w-full md:flex-1 md:min-h-0 md:flex md:flex-col">
        <PlayerTable players={players ?? []} enableCompact defaultAktivFilter="aktiv" defaultSortKey="positionTotal" defaultSortOrder="asc" scroll hideSearch hideTeamFilter hidePriceFilter />
      </div>
      </div>

      <div className="h-10 md:hidden" />
    </div>
  )
}
