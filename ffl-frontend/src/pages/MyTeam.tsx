import { useState, useEffect, useMemo, useRef } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { managerApi } from '../api/managers'
import { seasonApi } from '../api/seasons'
import { playerApi } from '../api/players'
import { useAvatar, useUploadAvatar, useDeleteAvatar } from '../hooks/useAvatar'
import Button from '../components/Button'
import PageHeader from '../components/PageHeader'
import PlayerSelect from '../components/PlayerSelect'
import type { PlayerSlot } from '../components/PlayerSelect'
import type { Player, Season, Position, Manager } from '../types'

const PLAYER_SLOTS: PlayerSlot[] = [
  { key: 'playerGoalkeeperId', label: 'Torwart', position: 'GOALKEEPER' },
  { key: 'playerDefender1Id', label: 'Abwehr 1', position: 'DEFENDER' },
  { key: 'playerDefender2Id', label: 'Abwehr 2', position: 'DEFENDER' },
  { key: 'playerDefender3Id', label: 'Abwehr 3', position: 'DEFENDER' },
  { key: 'playerDefender4Id', label: 'Abwehr 4', position: 'DEFENDER' },
  { key: 'playerMidfield1Id', label: 'Mittelfeld 1', position: 'MIDFIELD' },
  { key: 'playerMidfield2Id', label: 'Mittelfeld 2', position: 'MIDFIELD' },
  { key: 'playerMidfield3Id', label: 'Mittelfeld 3', position: 'MIDFIELD' },
  { key: 'playerMidfield4Id', label: 'Mittelfeld 4', position: 'MIDFIELD' },
  { key: 'playerStriker1Id', label: 'Sturm 1', position: 'STRIKER' },
  { key: 'playerStriker2Id', label: 'Sturm 2', position: 'STRIKER' },
  { key: 'playerStriker3Id', label: 'Sturm 3', position: 'STRIKER' },
  { key: 'playerStriker4Id', label: 'Sturm 4', position: 'STRIKER' },
]

const POSITION_GROUPS: { label: string; position: Position; slots: PlayerSlot[] }[] = [
  { label: 'Torwart', position: 'GOALKEEPER', slots: PLAYER_SLOTS.filter(s => s.position === 'GOALKEEPER') },
  { label: 'Abwehr', position: 'DEFENDER', slots: PLAYER_SLOTS.filter(s => s.position === 'DEFENDER') },
  { label: 'Mittelfeld', position: 'MIDFIELD', slots: PLAYER_SLOTS.filter(s => s.position === 'MIDFIELD') },
  { label: 'Sturm', position: 'STRIKER', slots: PLAYER_SLOTS.filter(s => s.position === 'STRIKER') },
]

function detectFreePosition(manager: Manager): 'DEFENDER' | 'MIDFIELD' | 'STRIKER' {
  if (manager.playerFreeChoice) {
    const pos = manager.playerFreeChoice.position
    if (pos === 'DEFENDER' || pos === 'MIDFIELD' || pos === 'STRIKER') {
      return pos
    }
  }
  return 'DEFENDER'
}

function buildSelectedPlayers(manager: Manager, freePos: 'DEFENDER' | 'MIDFIELD' | 'STRIKER'): Record<string, number | null> {
  const selected: Record<string, number | null> = {}
  PLAYER_SLOTS.forEach(s => { selected[s.key] = null })

  selected['playerGoalkeeperId'] = manager.playerGoalkeeper?.id ?? null
  selected['playerDefender1Id'] = manager.playerDefender1?.id ?? null
  selected['playerDefender2Id'] = manager.playerDefender2?.id ?? null
  selected['playerDefender3Id'] = manager.playerDefender3?.id ?? null
  selected['playerMidfield1Id'] = manager.playerMidfield1?.id ?? null
  selected['playerMidfield2Id'] = manager.playerMidfield2?.id ?? null
  selected['playerMidfield3Id'] = manager.playerMidfield3?.id ?? null
  selected['playerStriker1Id'] = manager.playerStriker1?.id ?? null
  selected['playerStriker2Id'] = manager.playerStriker2?.id ?? null
  selected['playerStriker3Id'] = manager.playerStriker3?.id ?? null

  if (manager.playerFreeChoice) {
    const slot4Key = `player${freePos === 'DEFENDER' ? 'Defender' : freePos === 'MIDFIELD' ? 'Midfield' : 'Striker'}4Id`
    selected[slot4Key] = manager.playerFreeChoice.id
  }

  return selected
}

export default function MyTeam() {
  const { user } = useAuth()
  const [manager, setManager] = useState<Manager | null>(null)
  const [season, setSeason] = useState<Season | null>(null)
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [freePosition, setFreePosition] = useState<'DEFENDER' | 'MIDFIELD' | 'STRIKER'>('DEFENDER')
  const [selectedPlayers, setSelectedPlayers] = useState<Record<string, number | null>>(() => {
    const initial: Record<string, number | null> = {}
    PLAYER_SLOTS.forEach(s => { initial[s.key] = null })
    return initial
  })
  const [originalPlayers, setOriginalPlayers] = useState<Record<string, number | null>>({})
  const [originalFreePosition, setOriginalFreePosition] = useState<'DEFENDER' | 'MIDFIELD' | 'STRIKER'>('DEFENDER')

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const { data: avatarUrl } = useAvatar(user?.id ?? null)
  const uploadAvatar = useUploadAvatar()
  const deleteAvatar = useDeleteAvatar()

  const isBeforeSeason = season?.seasonState === 'BEFORE_SEASON'

  useEffect(() => {
    const loadData = async () => {
      try {
        const [managerRes, seasonRes] = await Promise.all([
          managerApi.getCurrent(),
          seasonApi.getAll(),
        ])

        const mgr = managerRes.data
        setManager(mgr)

        const s = seasonRes.data?.[0] ?? null
        setSeason(s)

        if (s) {
          const playersRes = await playerApi.getBySeason(s.id)
          setAllPlayers(playersRes.data)
        }

        const freePos = detectFreePosition(mgr)
        setFreePosition(freePos)
        setOriginalFreePosition(freePos)

        const sel = buildSelectedPlayers(mgr, freePos)
        setSelectedPlayers(sel)
        setOriginalPlayers({ ...sel })
      } catch {
        setError('Daten konnten nicht geladen werden.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleFreePositionChange = (newPos: 'DEFENDER' | 'MIDFIELD' | 'STRIKER') => {
    if (newPos === freePosition) return
    const old4thSlot = PLAYER_SLOTS.find(s => s.position === freePosition && s.key.endsWith('4Id'))
    if (old4thSlot && selectedPlayers[old4thSlot.key] !== null) {
      setSelectedPlayers(prev => ({ ...prev, [old4thSlot.key]: null }))
    }
    setFreePosition(newPos)
  }

  const getVisibleSlots = (group: typeof POSITION_GROUPS[number]) => {
    if (group.position === 'GOALKEEPER') return group.slots.slice(0, 1)
    if (group.position === freePosition) return group.slots
    return group.slots.slice(0, 3)
  }

  const selectedIds = useMemo(() => {
    const ids = new Set<number>()
    Object.values(selectedPlayers).forEach(id => {
      if (id !== null) ids.add(id)
    })
    return ids
  }, [selectedPlayers])

  const totalCost = useMemo(() => {
    let sum = 0
    Object.values(selectedPlayers).forEach(id => {
      if (id !== null) {
        const player = allPlayers.find(p => p.id === id)
        if (player) sum += player.prize
      }
    })
    return sum
  }, [selectedPlayers, allPlayers])

  const budget = season?.budget ?? 0
  const remaining = budget - totalCost
  const isBudgetExceeded = remaining < 0

  const teamCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    Object.values(selectedPlayers).forEach(id => {
      if (id !== null) {
        const player = allPlayers.find(p => p.id === id)
        if (player && player.teams && player.teams.length > 0) {
          const teamName = player.teams[player.teams.length - 1].name
          counts[teamName] = (counts[teamName] || 0) + 1
        }
      }
    })
    return counts
  }, [selectedPlayers, allPlayers])

  const hasTeamViolation = Object.values(teamCounts).some(c => c > 5)

  const visibleSlots = useMemo(() => {
    return POSITION_GROUPS.flatMap(group => getVisibleSlots(group))
  }, [freePosition])

  const allSlotsFilled = visibleSlots.every(s => selectedPlayers[s.key] !== null)

  const hasChanges = useMemo(() => {
    if (freePosition !== originalFreePosition) return true
    for (const slot of PLAYER_SLOTS) {
      if (selectedPlayers[slot.key] !== originalPlayers[slot.key]) return true
    }
    return false
  }, [selectedPlayers, originalPlayers, freePosition, originalFreePosition])

  const handleSave = async () => {
    setError('')
    setSuccess('')

    if (!allSlotsFilled) {
      setError('Bitte wähle alle 11 Spieler aus.')
      return
    }
    if (isBudgetExceeded) {
      setError('Budget überschritten.')
      return
    }
    if (hasTeamViolation) {
      setError('Maximal 5 Spieler pro Verein erlaubt.')
      return
    }

    const gkId = selectedPlayers['playerGoalkeeperId']
    const def1 = selectedPlayers['playerDefender1Id']
    const def2 = selectedPlayers['playerDefender2Id']
    const def3 = selectedPlayers['playerDefender3Id']
    const mf1 = selectedPlayers['playerMidfield1Id']
    const mf2 = selectedPlayers['playerMidfield2Id']
    const mf3 = selectedPlayers['playerMidfield3Id']
    const st1 = selectedPlayers['playerStriker1Id']
    const st2 = selectedPlayers['playerStriker2Id']
    const st3 = selectedPlayers['playerStriker3Id']

    const free4thKey = PLAYER_SLOTS.find(s => s.position === freePosition && s.key.endsWith('4Id'))?.key
    const freeChoiceId = free4thKey ? selectedPlayers[free4thKey] : null

    if (!gkId || !def1 || !def2 || !def3 || !mf1 || !mf2 || !mf3 || !st1 || !st2 || !st3 || !freeChoiceId) {
      setError('Bitte wähle alle 11 Spieler aus.')
      return
    }

    setSaving(true)
    try {
      await managerApi.updateLineup({
        playerGoalkeeperId: gkId,
        playerDefender1Id: def1,
        playerDefender2Id: def2,
        playerDefender3Id: def3,
        playerMidfield1Id: mf1,
        playerMidfield2Id: mf2,
        playerMidfield3Id: mf3,
        playerStriker1Id: st1,
        playerStriker2Id: st2,
        playerStriker3Id: st3,
        playerFreeChoiceId: freeChoiceId,
      })
      setOriginalPlayers({ ...selectedPlayers })
      setOriginalFreePosition(freePosition)
      setSuccess('Aufstellung gespeichert.')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: string } }
      if (axiosError.response?.data && typeof axiosError.response.data === 'string') {
        setError(axiosError.response.data)
      } else {
        setError('Fehler beim Speichern der Aufstellung.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setSelectedPlayers({ ...originalPlayers })
    setFreePosition(originalFreePosition)
    setError('')
    setSuccess('')
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return
    try {
      await uploadAvatar.mutateAsync({ file, userId: user.id })
    } catch {
      setError('Fehler beim Hochladen des Avatars.')
    } finally {
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const handleAvatarDelete = async () => {
    if (!user?.id) return
    try {
      await deleteAvatar.mutateAsync({ userId: user.id })
    } catch {
      setError('Fehler beim Entfernen des Avatars.')
    }
  }

  const formatDate = (date?: string) => {
    if (!date) return ''
    const [y, m, d] = date.split('-')
    return `${d}.${m}.${y}`
  }

  if (loading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (!manager) return <div className="text-center py-8 text-subtle">Kein Manager-Profil gefunden.</div>

  return (
    <div>
      <RouterLink to="/" className="inline-flex items-center gap-1 text-sm text-[#c9a66b] hover:text-[#d4b77a] hover:underline mb-4">
        <i className="sap-icon sap-icon-nav-back text-base" />
        Zurück zur Startseite
      </RouterLink>

      <PageHeader icon="sap-icon-competitor" title="Mein Team" />

      {isBeforeSeason && season?.seasonStartDate && (
        <div className="flex items-center gap-3 p-3 bg-accent-muted border border-accent/30 rounded-lg mb-6">
          <i className="sap-icon sap-icon-information text-[18px] text-accent shrink-0" />
          <p className="text-sm text-foreground">
            Änderungen sind bis zum Saisonstart am <span className="font-semibold">{formatDate(season.seasonStartDate)}</span>
            {season.seasonStartTime && <> um <span className="font-semibold">{season.seasonStartTime} Uhr</span></>} möglich.
          </p>
        </div>
      )}

      {!isBeforeSeason && (
        <div className="flex items-center gap-3 p-3 bg-elevated border border-border rounded-lg mb-6">
          <i className="sap-icon sap-icon-locked text-[18px] text-muted shrink-0" />
          <p className="text-sm text-muted">
            Die Saison läuft. Deine Aufstellung kann nicht mehr geändert werden.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-3 bg-danger-bg border border-danger/30 rounded-lg mb-4">
          <i className="sap-icon sap-icon-alert text-[18px] text-danger shrink-0" />
          <p className="text-danger text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 p-3 bg-success-bg border border-success/30 rounded-lg mb-4">
          <i className="sap-icon sap-icon-accept text-[18px] text-success shrink-0" />
          <p className="text-success text-sm">{success}</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <div className="p-6 bg-surface border border-border rounded-lg">
          <label className="block text-sm text-muted mb-3">Avatar</label>
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xl font-bold">
                  {user?.login?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
            {isBeforeSeason && (
              <div className="flex flex-col gap-2">
                <Button
                  variant="ghost"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadAvatar.isPending}
                >
                  {uploadAvatar.isPending ? 'Hochladen...' : 'Bild ändern'}
                </Button>
                {avatarUrl && (
                  <Button
                    variant="ghost"
                    onClick={handleAvatarDelete}
                    disabled={deleteAvatar.isPending}
                  >
                    Entfernen
                  </Button>
                )}
              </div>
            )}
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        <div className="p-6 bg-surface border border-border rounded-lg">
          <label className="block text-sm text-muted mb-3">Budget</label>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted">Saisonbudget</span>
              <span className="text-sm font-semibold text-foreground">{budget.toLocaleString('de-DE')} €</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted">Ausgegeben</span>
              <span className="text-sm font-semibold text-foreground">{totalCost.toLocaleString('de-DE')} €</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between items-center">
              <span className="text-sm text-muted">Verbleibend</span>
              <span className={`text-sm font-bold ${isBudgetExceeded ? 'text-danger' : 'text-success'}`}>
                {remaining.toLocaleString('de-DE')} €
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 bg-surface border border-border rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Aufstellung</h2>
          {isBeforeSeason && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted">Freie Position</span>
              <select
                value={freePosition}
                onChange={(e) => handleFreePositionChange(e.target.value as 'DEFENDER' | 'MIDFIELD' | 'STRIKER')}
                className="input-field px-2 py-1 rounded text-xs cursor-pointer"
              >
                <option value="DEFENDER">Abwehr</option>
                <option value="MIDFIELD">Mittelfeld</option>
                <option value="STRIKER">Sturm</option>
              </select>
            </div>
          )}
        </div>

        {hasTeamViolation && (
          <div className="flex items-center gap-3 p-3 bg-warning-bg border border-warning/30 rounded-lg mb-4">
            <i className="sap-icon sap-icon-alert text-[18px] text-warning shrink-0" />
            <p className="text-warning text-sm">Maximal 5 Spieler pro Verein erlaubt.</p>
          </div>
        )}

        <div className="space-y-4">
          {POSITION_GROUPS.map(group => {
            const slots = getVisibleSlots(group)
            return (
              <div key={group.label} className="bg-elevated/30 rounded-lg p-3">
                <h3 className="text-xs font-semibold text-accent uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  {group.label}
                  {group.position === freePosition && (
                    <span className="text-[10px] text-accent/60 font-normal normal-case tracking-normal ml-1">+1 Freie Wahl</span>
                  )}
                </h3>
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  {slots.map(slot => (
                    <PlayerSelect
                      key={slot.key}
                      slot={slot}
                      players={allPlayers}
                      selectedIds={selectedIds}
                      value={selectedPlayers[slot.key]}
                      onChange={(id) => setSelectedPlayers(prev => ({ ...prev, [slot.key]: id }))}
                      disabled={!isBeforeSeason}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {Object.entries(teamCounts).filter(([, c]) => c > 5).map(([team, count]) => (
          <div key={team} className="text-xs text-danger mt-2">
            {team}: {count} Spieler (max. 5)
          </div>
        ))}

        {isBeforeSeason && hasChanges && (
          <div className="mt-6 flex gap-4 pt-4 border-t border-border">
            <Button
              variant="emphasized"
              onClick={handleSave}
              disabled={saving || isBudgetExceeded || hasTeamViolation || !allSlotsFilled}
            >
              {saving ? 'Wird gespeichert...' : 'Aufstellung speichern'}
            </Button>
            <Button
              variant="ghost"
              onClick={handleReset}
              disabled={saving}
            >
              Zurücksetzen
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
