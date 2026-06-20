import { useState, useEffect, useMemo, useRef } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { managerApi } from '../api/managers'
import { authApi } from '../api/auth'
import { seasonApi } from '../api/seasons'
import { playerApi } from '../api/players'
import { useAvatar, useUploadAvatar, useDeleteAvatar } from '../hooks/useAvatar'
import Button from '../components/Button'
import PageHeader from '../components/PageHeader'
import PlayerSelect from '../components/PlayerSelect'
import type { PlayerSlot } from '../components/PlayerSelect'
import type { Player, Season, Position, Manager } from '../types'
import type { AxiosError } from 'axios'
import { positionLabels, positionColors } from './Players'

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

const POSITION_LABELS: Record<Position, string> = {
  GOALKEEPER: 'TW',
  DEFENDER: 'ABW',
  MIDFIELD: 'MF',
  STRIKER: 'ST',
}

interface TransferRow {
  oldPlayerId: number | null
  newPlayerId: number | null
}

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

function getLineupPlayers(manager: Manager): Player[] {
  const players: Player[] = []
  if (manager.playerGoalkeeper) players.push(manager.playerGoalkeeper)
  if (manager.playerDefender1) players.push(manager.playerDefender1)
  if (manager.playerDefender2) players.push(manager.playerDefender2)
  if (manager.playerDefender3) players.push(manager.playerDefender3)
  if (manager.playerMidfield1) players.push(manager.playerMidfield1)
  if (manager.playerMidfield2) players.push(manager.playerMidfield2)
  if (manager.playerMidfield3) players.push(manager.playerMidfield3)
  if (manager.playerStriker1) players.push(manager.playerStriker1)
  if (manager.playerStriker2) players.push(manager.playerStriker2)
  if (manager.playerStriker3) players.push(manager.playerStriker3)
  if (manager.playerFreeChoice) players.push(manager.playerFreeChoice)
  return players
}

function buildExistingTransfers(manager: Manager): TransferRow[] {
  const transfers: TransferRow[] = []
  if (manager.playerExchangedOld1 && manager.playerExchangedNew1) {
    transfers.push({ oldPlayerId: manager.playerExchangedOld1.id, newPlayerId: manager.playerExchangedNew1.id })
  }
  if (manager.playerExchangedOld2 && manager.playerExchangedNew2) {
    transfers.push({ oldPlayerId: manager.playerExchangedOld2.id, newPlayerId: manager.playerExchangedNew2.id })
  }
  if (manager.playerExchangedOld3 && manager.playerExchangedNew3) {
    transfers.push({ oldPlayerId: manager.playerExchangedOld3.id, newPlayerId: manager.playerExchangedNew3.id })
  }
  return transfers
}

function OldPlayerSearch({
  players,
  excludeIds,
  value,
  onChange,
}: {
  players: Player[]
  excludeIds: Set<number>
  value: number | null
  onChange: (id: number | null) => void
}) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedPlayer = useMemo(
    () => (value ? players.find(p => p.id === value) : null),
    [value, players]
  )

  const filteredPlayers = useMemo(() => {
    let filtered = players.filter(p => p.id === value || !excludeIds.has(p.id))

    if (search.trim()) {
      const term = search.toLowerCase()
      filtered = filtered.filter(p =>
        p.nameKicker.toLowerCase().includes(term) ||
        (p.firstName && p.firstName.toLowerCase().includes(term)) ||
        (p.lastName && p.lastName.toLowerCase().includes(term))
      )
    }

    return filtered.sort((a, b) => a.nameKicker.localeCompare(b.nameKicker))
  }, [players, excludeIds, value, search])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (player: Player) => {
    onChange(player.id)
    setIsOpen(false)
    setSearch('')
  }

  if (selectedPlayer) {
    const team = selectedPlayer.teams && selectedPlayer.teams.length > 0 ? selectedPlayer.teams[selectedPlayer.teams.length - 1] : null
    return (
      <div className="group bg-elevated/50 border border-border/60 rounded-lg p-2 flex items-center gap-2">
        <div className="relative shrink-0">
          {selectedPlayer.pictureUrl ? (
            <img src={selectedPlayer.pictureUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-elevated flex items-center justify-center">
              <span className="text-[9px] text-muted">{POSITION_LABELS[selectedPlayer.position]}</span>
            </div>
          )}
          <button
            onClick={() => onChange(null)}
            className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            title="Entfernen"
          >
            <i className="sap-icon sap-icon-decline text-[11px] text-red-400" />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground leading-tight truncate">
            {selectedPlayer.firstName && selectedPlayer.lastName
              ? `${selectedPlayer.firstName} ${selectedPlayer.lastName}`
              : selectedPlayer.nameKicker}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`${positionColors[selectedPlayer.position]} text-[10px] font-medium px-1.5 py-0.5 rounded`}>
              {positionLabels[selectedPlayer.position]}
            </span>
            <span className="text-[11px] text-muted">{selectedPlayer.prize.toLocaleString('de-DE')} €</span>
          </div>
        </div>
        {team?.logoSUrl ? (
          <img src={team.logoSUrl} alt={team.name} className="w-8 h-8 object-contain shrink-0" />
        ) : (
          <div className="w-8 h-8 shrink-0" />
        )}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className="input-field w-full px-3 py-2 rounded text-xs cursor-pointer flex items-center justify-between text-placeholder"
        onClick={() => {
          setIsOpen(!isOpen)
          setTimeout(() => inputRef.current?.focus(), 50)
        }}
      >
        <span>Spieler wählen...</span>
        <i className="sap-icon sap-icon-slim-arrow-down text-[10px] text-muted" />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 min-w-[320px] w-full bg-surface border border-border rounded-lg shadow-xl max-h-[280px] flex flex-col">
          <div className="p-2 border-b border-border">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Spieler suchen..."
              className="input-field w-full px-2 py-1.5 rounded text-xs focus:outline-none"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredPlayers.length === 0 ? (
              <div className="px-3 py-4 text-center text-subtle text-xs">Keine Spieler gefunden</div>
            ) : (
              filteredPlayers.map(player => {
                const team = player.teams && player.teams.length > 0 ? player.teams[player.teams.length - 1] : null
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => handleSelect(player)}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-elevated transition-colors flex items-center justify-between gap-3 ${
                      player.id === value ? 'bg-accent-muted' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {player.pictureUrl && (
                        <img src={player.pictureUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                      )}
                      <span className="text-foreground whitespace-nowrap">{player.nameKicker}</span>
                      <span className={`${positionColors[player.position]} text-[10px] font-medium px-1.5 py-0.5 rounded`}>{positionLabels[player.position]}</span>
                      {team && (
                        <span className="text-subtle text-[11px] whitespace-nowrap">
                          {team.shortName || team.name}
                        </span>
                      )}
                    </div>
                    <span className="text-accent text-[11px] font-semibold shrink-0">{player.prize.toLocaleString('de-DE')} €</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function TransferPlayerSearch({
  players,
  excludeIds,
  value,
  onChange,
}: {
  players: Player[]
  excludeIds: Set<number>
  value: number | null
  onChange: (id: number | null) => void
}) {
  const [search, setSearch] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedPlayer = useMemo(
    () => (value ? players.find(p => p.id === value) : null),
    [value, players]
  )

  const filteredPlayers = useMemo(() => {
    let filtered = players.filter(p => p.id === value || !excludeIds.has(p.id))

    if (search.trim()) {
      const term = search.toLowerCase()
      filtered = filtered.filter(p =>
        p.nameKicker.toLowerCase().includes(term) ||
        (p.firstName && p.firstName.toLowerCase().includes(term)) ||
        (p.lastName && p.lastName.toLowerCase().includes(term)) ||
        (p.teams && p.teams.length > 0 && p.teams[p.teams.length - 1].name.toLowerCase().includes(term))
      )
    }

    const min = priceMin ? Number(priceMin) : 0
    const max = priceMax ? Number(priceMax) : Infinity
    if (min > 0 || max < Infinity) {
      filtered = filtered.filter(p => p.prize >= min && p.prize <= max)
    }

    return filtered.sort((a, b) => a.nameKicker.localeCompare(b.nameKicker))
  }, [players, excludeIds, value, search, priceMin, priceMax])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
        setPriceMin('')
        setPriceMax('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (player: Player) => {
    onChange(player.id)
    setIsOpen(false)
    setSearch('')
    setPriceMin('')
    setPriceMax('')
  }

  if (selectedPlayer) {
    const team = selectedPlayer.teams && selectedPlayer.teams.length > 0 ? selectedPlayer.teams[selectedPlayer.teams.length - 1] : null
    return (
      <div className="group bg-elevated/50 border border-border/60 rounded-lg p-2 flex items-center gap-2">
        <div className="relative shrink-0">
          {selectedPlayer.pictureUrl ? (
            <img src={selectedPlayer.pictureUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-elevated flex items-center justify-center">
              <span className="text-[9px] text-muted">{POSITION_LABELS[selectedPlayer.position]}</span>
            </div>
          )}
          <button
            onClick={() => onChange(null)}
            className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            title="Entfernen"
          >
            <i className="sap-icon sap-icon-decline text-[11px] text-red-400" />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground leading-tight truncate">
            {selectedPlayer.firstName && selectedPlayer.lastName
              ? `${selectedPlayer.firstName} ${selectedPlayer.lastName}`
              : selectedPlayer.nameKicker}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`${positionColors[selectedPlayer.position]} text-[10px] font-medium px-1.5 py-0.5 rounded`}>
              {positionLabels[selectedPlayer.position]}
            </span>
            <span className="text-[11px] text-muted">{selectedPlayer.prize.toLocaleString('de-DE')} €</span>
          </div>
        </div>
        {team?.logoSUrl ? (
          <img src={team.logoSUrl} alt={team.name} className="w-8 h-8 object-contain shrink-0" />
        ) : (
          <div className="w-8 h-8 shrink-0" />
        )}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className="input-field w-full px-3 py-2 rounded text-xs cursor-pointer flex items-center justify-between text-placeholder"
        onClick={() => {
          setIsOpen(!isOpen)
          setTimeout(() => inputRef.current?.focus(), 50)
        }}
      >
        <span>Neuen Spieler wählen...</span>
        <i className="sap-icon sap-icon-slim-arrow-down text-[10px] text-muted" />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 min-w-[380px] w-full bg-surface border border-border rounded-lg shadow-xl max-h-[320px] flex flex-col">
          <div className="p-2 border-b border-border space-y-1.5">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Spieler suchen..."
              className="input-field w-full px-2 py-1.5 rounded text-xs focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="Min €"
                className="input-field w-1/2 px-2 py-1 rounded text-[11px] focus:outline-none"
              />
              <input
                type="number"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="Max €"
                className="input-field w-1/2 px-2 py-1 rounded text-[11px] focus:outline-none"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredPlayers.length === 0 ? (
              <div className="px-3 py-4 text-center text-subtle text-xs">Keine Spieler gefunden</div>
            ) : (
              filteredPlayers.map(player => {
                const team = player.teams && player.teams.length > 0 ? player.teams[player.teams.length - 1] : null
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => handleSelect(player)}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-elevated transition-colors flex items-center justify-between gap-3 ${
                      player.id === value ? 'bg-accent-muted' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {player.pictureUrl && (
                        <img src={player.pictureUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                      )}
                      <span className="text-foreground whitespace-nowrap">{player.nameKicker}</span>
                      <span className={`${positionColors[player.position]} text-[10px] font-medium px-1.5 py-0.5 rounded`}>{positionLabels[player.position]}</span>
                      {team && (
                        <span className="text-subtle text-[11px] whitespace-nowrap">
                          {team.shortName || team.name}
                        </span>
                      )}
                    </div>
                    <span className="text-accent text-[11px] font-semibold shrink-0">{player.prize.toLocaleString('de-DE')} €</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
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
  const [notFound, setNotFound] = useState(false)

  const [freePosition, setFreePosition] = useState<'DEFENDER' | 'MIDFIELD' | 'STRIKER'>('DEFENDER')
  const [selectedPlayers, setSelectedPlayers] = useState<Record<string, number | null>>(() => {
    const initial: Record<string, number | null> = {}
    PLAYER_SLOTS.forEach(s => { initial[s.key] = null })
    return initial
  })
  const [originalPlayers, setOriginalPlayers] = useState<Record<string, number | null>>({})
  const [originalFreePosition, setOriginalFreePosition] = useState<'DEFENDER' | 'MIDFIELD' | 'STRIKER'>('DEFENDER')

  const [profileFirstName, setProfileFirstName] = useState('')
  const [profileLastName, setProfileLastName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [originalProfile, setOriginalProfile] = useState({ firstName: '', lastName: '', email: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')

  const [transfers, setTransfers] = useState<TransferRow[]>([])
  const [originalTransfers, setOriginalTransfers] = useState<TransferRow[]>([])
  const [savingTransfers, setSavingTransfers] = useState(false)
  const [transferSuccess, setTransferSuccess] = useState('')

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const { data: avatarUrl } = useAvatar(user?.id ?? null)
  const uploadAvatar = useUploadAvatar()
  const deleteAvatar = useDeleteAvatar()

  const isBeforeSeason = season?.seasonState === 'BEFORE_SEASON'
  const isHinrunde = season?.seasonState === 'RUNNING_HINRUNDE'
  const isRueckrunde = season?.seasonState === 'RUNNING_RUECKRUNDE'

  useEffect(() => {
    const loadData = async () => {
      try {
        let mgr: Manager | null = null
        try {
          const managerRes = await managerApi.getCurrent()
          mgr = managerRes.data
        } catch (err) {
          const axiosErr = err as AxiosError
          if (axiosErr.response?.status === 404) {
            setNotFound(true)
            setLoading(false)
            return
          }
          throw err
        }

        setManager(mgr)
        setProfileFirstName(mgr.firstName || '')
        setProfileLastName(mgr.lastName || '')
        setProfileEmail(mgr.email || '')
        setOriginalProfile({ firstName: mgr.firstName || '', lastName: mgr.lastName || '', email: mgr.email || '' })

        const seasonRes = await seasonApi.getAll()
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

        const existingTransfers = buildExistingTransfers(mgr)
        setTransfers(existingTransfers)
        setOriginalTransfers(existingTransfers.map(t => ({ ...t })))
      } catch (err) {
        const axiosErr = err as AxiosError
        const status = axiosErr.response?.status
        const data = axiosErr.response?.data
        console.error('MyTeam load error:', status, data, err)
        setError(`Daten konnten nicht geladen werden.${status ? ` (HTTP ${status})` : ''}`)
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

  const avatarInitials = (profileFirstName && profileLastName)
    ? `${profileFirstName.charAt(0)}${profileLastName.charAt(0)}`.toUpperCase()
    : user?.login?.charAt(0).toUpperCase() || 'U'

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

  const lineupPlayers = useMemo(() => {
    if (!manager) return []
    return getLineupPlayers(manager)
  }, [manager])

  const resultingTeamAfterTransfers = useMemo(() => {
    if (!manager) return []
    const lineup = getLineupPlayers(manager)
    const result = [...lineup]
    for (const t of transfers) {
      if (t.oldPlayerId && t.newPlayerId) {
        const idx = result.findIndex(p => p.id === t.oldPlayerId)
        const newPlayer = allPlayers.find(p => p.id === t.newPlayerId)
        if (idx !== -1 && newPlayer) {
          result[idx] = newPlayer
        }
      }
    }
    return result
  }, [manager, transfers, allPlayers])

  const transferTotalCost = useMemo(() => {
    return resultingTeamAfterTransfers.reduce((sum, p) => sum + p.prize, 0)
  }, [resultingTeamAfterTransfers])

  const transferRemaining = budget - transferTotalCost
  const isTransferBudgetExceeded = transferRemaining < 0

  const transferTeamCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const player of resultingTeamAfterTransfers) {
      if (player.teams && player.teams.length > 0) {
        const teamName = player.teams[player.teams.length - 1].name
        counts[teamName] = (counts[teamName] || 0) + 1
      }
    }
    return counts
  }, [resultingTeamAfterTransfers])

  const hasTransferTeamViolation = Object.values(transferTeamCounts).some(c => c > 5)

  const transferPositionCounts = useMemo(() => {
    const counts: Record<Position, number> = { GOALKEEPER: 0, DEFENDER: 0, MIDFIELD: 0, STRIKER: 0 }
    for (const player of resultingTeamAfterTransfers) {
      counts[player.position]++
    }
    return counts
  }, [resultingTeamAfterTransfers])

  const hasTransferPositionViolation = useMemo(() => {
    const allComplete = transfers.every(t => t.oldPlayerId && t.newPlayerId)
    if (!allComplete) return false
    const c = transferPositionCounts
    return c.GOALKEEPER !== 1 || c.DEFENDER < 3 || c.DEFENDER > 4 || c.MIDFIELD < 3 || c.MIDFIELD > 4 || c.STRIKER < 3 || c.STRIKER > 4
  }, [transferPositionCounts, transfers])

  const transfersComplete = transfers.length > 0 && transfers.every(t => t.oldPlayerId && t.newPlayerId)

  const hasTransferChanges = useMemo(() => {
    if (transfers.length !== originalTransfers.length) return true
    for (let i = 0; i < transfers.length; i++) {
      if (transfers[i].oldPlayerId !== originalTransfers[i].oldPlayerId) return true
      if (transfers[i].newPlayerId !== originalTransfers[i].newPlayerId) return true
    }
    return false
  }, [transfers, originalTransfers])

  const transferExcludeIds = useMemo(() => {
    const lineupIds = new Set(lineupPlayers.map(p => p.id))
    const oldIds = new Set(transfers.map(t => t.oldPlayerId).filter((id): id is number => id !== null))
    const newIds = new Set(transfers.map(t => t.newPlayerId).filter((id): id is number => id !== null))
    const exclude = new Set<number>()
    for (const id of lineupIds) {
      if (!oldIds.has(id)) {
        exclude.add(id)
      }
    }
    for (const id of newIds) {
      exclude.add(id)
    }
    return exclude
  }, [lineupPlayers, transfers])

  const replacedPlayerIds = useMemo(() => {
    return new Set(transfers.map(t => t.oldPlayerId).filter((id): id is number => id !== null))
  }, [transfers])

  const newPlayerIds = useMemo(() => {
    return new Set(transfers.map(t => t.newPlayerId).filter((id): id is number => id !== null))
  }, [transfers])

  const transferDiff = useMemo(() => {
    let diff = 0
    for (const t of transfers) {
      if (t.oldPlayerId && t.newPlayerId) {
        const oldPlayer = allPlayers.find(p => p.id === t.oldPlayerId)
        const newPlayer = allPlayers.find(p => p.id === t.newPlayerId)
        if (oldPlayer && newPlayer) {
          diff += newPlayer.prize - oldPlayer.prize
        }
      }
    }
    return diff
  }, [transfers, allPlayers])

  const rueckrundePlayersByPosition = useMemo(() => {
    const grouped: Record<Position, Player[]> = { GOALKEEPER: [], DEFENDER: [], MIDFIELD: [], STRIKER: [] }
    for (const player of resultingTeamAfterTransfers) {
      grouped[player.position].push(player)
    }
    return grouped
  }, [resultingTeamAfterTransfers])

  const hasExistingTransfers = !!(manager?.playerExchangedOld1 || manager?.playerExchangedOld2 || manager?.playerExchangedOld3)
  const hasActiveTransfers = isHinrunde
    ? transfers.some(t => t.oldPlayerId && t.newPlayerId)
    : isRueckrunde ? hasExistingTransfers : false

  const existingReplacedIds = useMemo(() => {
    if (!isRueckrunde || !manager) return new Set<number>()
    const ids = new Set<number>()
    if (manager.playerExchangedOld1) ids.add(manager.playerExchangedOld1.id)
    if (manager.playerExchangedOld2) ids.add(manager.playerExchangedOld2.id)
    if (manager.playerExchangedOld3) ids.add(manager.playerExchangedOld3.id)
    return ids
  }, [isRueckrunde, manager])

  const existingNewIds = useMemo(() => {
    if (!isRueckrunde || !manager) return new Set<number>()
    const ids = new Set<number>()
    if (manager.playerExchangedNew1) ids.add(manager.playerExchangedNew1.id)
    if (manager.playerExchangedNew2) ids.add(manager.playerExchangedNew2.id)
    if (manager.playerExchangedNew3) ids.add(manager.playerExchangedNew3.id)
    return ids
  }, [isRueckrunde, manager])

  const activeReplacedIds = isRueckrunde ? existingReplacedIds : replacedPlayerIds
  const activeNewIds = isRueckrunde ? existingNewIds : newPlayerIds

  const existingTransferDiff = useMemo(() => {
    if (!isRueckrunde || !manager) return 0
    let diff = 0
    const pairs = [
      { old: manager.playerExchangedOld1, new_: manager.playerExchangedNew1 },
      { old: manager.playerExchangedOld2, new_: manager.playerExchangedNew2 },
      { old: manager.playerExchangedOld3, new_: manager.playerExchangedNew3 },
    ]
    for (const p of pairs) {
      if (p.old && p.new_) {
        diff += p.new_.prize - p.old.prize
      }
    }
    return diff
  }, [isRueckrunde, manager])

  const handleAddTransfer = () => {
    if (transfers.length >= 3) return
    setTransfers(prev => [...prev, { oldPlayerId: null, newPlayerId: null }])
  }

  const handleRemoveTransfer = (index: number) => {
    setTransfers(prev => prev.filter((_, i) => i !== index))
  }

  const handleTransferOldChange = (index: number, playerId: number | null) => {
    setTransfers(prev => prev.map((t, i) => i === index ? { ...t, oldPlayerId: playerId, newPlayerId: null } : t))
  }

  const handleTransferNewChange = (index: number, playerId: number | null) => {
    setTransfers(prev => prev.map((t, i) => i === index ? { ...t, newPlayerId: playerId } : t))
  }

  const handleSaveTransfers = async () => {
    setError('')
    setTransferSuccess('')

    const validTransfers = transfers.filter(t => t.oldPlayerId && t.newPlayerId)
    if (validTransfers.length === 0 && transfers.length > 0) {
      setError('Bitte wähle für jeden Wechsel einen alten und neuen Spieler aus.')
      return
    }

    setSavingTransfers(true)
    try {
      const res = await managerApi.updateWinterTransfers({
        transfers: validTransfers.map(t => ({
          oldPlayerId: t.oldPlayerId!,
          newPlayerId: t.newPlayerId!,
        })),
      })
      setManager(res.data)
      const newTransfers = buildExistingTransfers(res.data)
      setTransfers(newTransfers)
      setOriginalTransfers(newTransfers.map(t => ({ ...t })))
      setTransferSuccess('Winterwechsel gespeichert.')
      setTimeout(() => setTransferSuccess(''), 4000)
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: string } }
      if (axiosError.response?.data && typeof axiosError.response.data === 'string') {
        setError(axiosError.response.data)
      } else {
        setError('Fehler beim Speichern der Winterwechsel.')
      }
    } finally {
      setSavingTransfers(false)
    }
  }

  const handleResetTransfers = () => {
    setTransfers(originalTransfers.map(t => ({ ...t })))
    setError('')
    setTransferSuccess('')
  }

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

  const hasProfileChanges = profileFirstName !== originalProfile.firstName
    || profileLastName !== originalProfile.lastName
    || profileEmail !== originalProfile.email

  const handleSaveProfile = async () => {
    setProfileSuccess('')
    if (!profileEmail.trim()) {
      setError('E-Mail ist ein Pflichtfeld.')
      return
    }
    if (isBeforeSeason && !profileFirstName.trim()) {
      setError('Vorname ist ein Pflichtfeld.')
      return
    }
    if (isBeforeSeason && !profileLastName.trim()) {
      setError('Nachname ist ein Pflichtfeld.')
      return
    }
    setSavingProfile(true)
    setError('')
    try {
      const data: { email: string; firstName?: string; lastName?: string } = { email: profileEmail.trim() }
      if (isBeforeSeason) {
        data.firstName = profileFirstName.trim()
        data.lastName = profileLastName.trim()
      }
      await authApi.updateProfile(data)
      setOriginalProfile({ firstName: profileFirstName.trim(), lastName: profileLastName.trim(), email: profileEmail.trim() })
      setProfileSuccess('Profildaten gespeichert.')
      setTimeout(() => setProfileSuccess(''), 4000)
    } catch {
      setError('Fehler beim Speichern der Profildaten.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleResetProfile = () => {
    setProfileFirstName(originalProfile.firstName)
    setProfileLastName(originalProfile.lastName)
    setProfileEmail(originalProfile.email)
  }

  const formatDate = (date?: string) => {
    if (!date) return ''
    const [y, m, d] = date.split('-')
    return `${d}.${m}.${y}`
  }

  if (loading) return <div className="text-center py-8 text-muted">Laden...</div>

  if (notFound) {
    return (
      <div>
        <RouterLink to="/" className="inline-flex items-center gap-1 text-sm text-[#c9a66b] hover:text-[#d4b77a] hover:underline mb-4">
          <i className="sap-icon sap-icon-nav-back text-base" />
          Zurück zur Startseite
        </RouterLink>
        <PageHeader icon="sap-icon-competitor" title="Mein Team" />
        <div className="p-6 bg-surface border border-border rounded-lg text-center">
          <i className="sap-icon sap-icon-person-placeholder text-[40px] text-subtle mb-3" />
          <p className="text-foreground font-medium mb-2">Du hast noch kein Team registriert.</p>
          <p className="text-sm text-muted">Melde dich über die Registrierung an, um dein Team zusammenzustellen.</p>
        </div>
      </div>
    )
  }

  if (!manager) {
    return (
      <div>
        <RouterLink to="/" className="inline-flex items-center gap-1 text-sm text-[#c9a66b] hover:text-[#d4b77a] hover:underline mb-4">
          <i className="sap-icon sap-icon-nav-back text-base" />
          Zurück zur Startseite
        </RouterLink>
        <PageHeader icon="sap-icon-competitor" title="Mein Team" />
        <div className="flex items-center gap-3 p-3 bg-danger-bg border border-danger/30 rounded-lg">
          <i className="sap-icon sap-icon-alert text-[18px] text-danger shrink-0" />
          <p className="text-danger text-sm">{error || 'Daten konnten nicht geladen werden.'}</p>
        </div>
      </div>
    )
  }

  const renderPlayerCard = (player: Player, highlight?: 'replaced' | 'new') => {
    const team = player.teams && player.teams.length > 0 ? player.teams[player.teams.length - 1] : null
    const ringClass = highlight === 'replaced' ? 'ring-1 ring-danger/50' : highlight === 'new' ? 'ring-1 ring-success/50' : ''
    return (
      <div className={`bg-elevated/50 border border-border/60 rounded-lg p-2 flex items-center gap-2 ${ringClass}`}>
        <div className="shrink-0">
          {player.pictureUrl ? (
            <img src={player.pictureUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-elevated flex items-center justify-center">
              <span className="text-[9px] text-muted">{POSITION_LABELS[player.position]}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground leading-tight truncate">
            {player.firstName && player.lastName ? `${player.firstName} ${player.lastName}` : player.nameKicker}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`${positionColors[player.position]} text-[10px] font-medium px-1.5 py-0.5 rounded`}>
              {positionLabels[player.position]}
            </span>
            <span className="text-[11px] text-muted">{player.prize.toLocaleString('de-DE')} €</span>
          </div>
        </div>
        {team?.logoSUrl ? (
          <img src={team.logoSUrl} alt={team.name} className="w-8 h-8 object-contain shrink-0" />
        ) : (
          <div className="w-8 h-8 shrink-0" />
        )}
      </div>
    )
  }

  return (
    <div>
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

      {isHinrunde && (
        <div className="flex items-center gap-3 p-3 bg-accent-muted border border-accent/30 rounded-lg mb-6">
          <i className="sap-icon sap-icon-switch-classes text-[18px] text-accent shrink-0" />
          <p className="text-sm text-foreground">
            Die Hinrunde läuft. Du kannst bis zu <span className="font-semibold">3 Spieler</span> wechseln (Winterwechsel).
            Die neuen Spieler sind ab der Rückrunde (Spieltag {season?.startRoundRueckrunde ?? 16}) aktiv.
          </p>
        </div>
      )}

      {isRueckrunde && !hasExistingTransfers && (
        <div className="flex items-center gap-3 p-3 bg-elevated border border-border rounded-lg mb-6">
          <i className="sap-icon sap-icon-locked text-[18px] text-muted shrink-0" />
          <p className="text-sm text-muted">
            Die Rückrunde läuft. Deine Aufstellung kann nicht mehr geändert werden.
          </p>
        </div>
      )}

      {isRueckrunde && hasExistingTransfers && (
        <div className="flex items-center gap-3 p-3 bg-elevated border border-border rounded-lg mb-6">
          <i className="sap-icon sap-icon-locked text-[18px] text-muted shrink-0" />
          <p className="text-sm text-muted">
            Die Rückrunde läuft. Deine Winterwechsel sind aktiv.
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

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 mb-6">
        <div className="p-4 bg-surface border border-border rounded-lg">
          <h3 className="text-sm font-semibold text-foreground mb-3">Avatar</h3>
          <div className="flex items-center justify-center">
          <div className="relative group w-16 h-16 shrink-0">
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="w-16 h-16 p-0 rounded-full overflow-hidden cursor-pointer"
              disabled={uploadAvatar.isPending || deleteAvatar.isPending}
              title="Profilbild ändern"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xl font-bold">
                  {avatarInitials}
                </div>
              )}
            </button>
            <div className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 pointer-events-none">
              <i className="sap-icon sap-icon-camera text-white text-lg" />
            </div>
            {avatarUrl && (
              <button
                type="button"
                onClick={handleAvatarDelete}
                disabled={deleteAvatar.isPending || uploadAvatar.isPending}
                className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                title="Profilbild löschen"
              >
                <i className="sap-icon sap-icon-delete text-xs" />
              </button>
            )}
            {(uploadAvatar.isPending || deleteAvatar.isPending) && (
              <div className="absolute inset-0 bg-surface/80 flex items-center justify-center rounded-full">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          </div>
        </div>

        <div className="p-4 bg-surface border border-border rounded-lg">
          <h3 className="text-sm font-semibold text-foreground mb-3">Persönliche Daten</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
            <div>
              <span className="text-xs text-muted">Loginname <span className="text-danger">*</span></span>
              <p className="text-sm font-medium text-foreground">{manager?.login || '-'}</p>
            </div>
            <div>
              <span className="text-xs text-muted">E-Mail <span className="text-danger">*</span></span>
              <input
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="input-field w-full px-2 py-1 rounded text-sm mt-0.5"
              />
            </div>
            <div>
              <span className="text-xs text-muted">Vorname <span className="text-danger">*</span></span>
              {isBeforeSeason ? (
                <input
                  type="text"
                  value={profileFirstName}
                  onChange={(e) => setProfileFirstName(e.target.value)}
                  className="input-field w-full px-2 py-1 rounded text-sm mt-0.5"
                />
              ) : (
                <p className="text-sm font-medium text-foreground">{profileFirstName || '-'}</p>
              )}
            </div>
            <div>
              <span className="text-xs text-muted">Nachname <span className="text-danger">*</span></span>
              {isBeforeSeason ? (
                <input
                  type="text"
                  value={profileLastName}
                  onChange={(e) => setProfileLastName(e.target.value)}
                  className="input-field w-full px-2 py-1 rounded text-sm mt-0.5"
                />
              ) : (
                <p className="text-sm font-medium text-foreground">{profileLastName || '-'}</p>
              )}
            </div>
          </div>
          {hasProfileChanges && (
            <div className="mt-3 flex gap-2">
              <Button
                variant="emphasized"
                size="sm"
                onClick={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? 'Speichern...' : 'Speichern'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetProfile}
              >
                Abbrechen
              </Button>
            </div>
          )}
          {profileSuccess && (
            <p className="text-success text-xs mt-2">{profileSuccess}</p>
          )}
        </div>
      </div>

      <div className="p-6 bg-surface border border-border rounded-lg">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-y-2">
          <h2 className="text-sm font-semibold text-foreground">Aufstellung (Hinrunde)</h2>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-muted">Budget: <span className="text-foreground font-medium">{budget.toLocaleString('de-DE')} €</span></span>
              <span className="text-muted">Ausgegeben: <span className="text-foreground font-medium">{totalCost.toLocaleString('de-DE')} €</span></span>
              <span className="text-muted">Verbleibend: <span className={`font-bold ${isBudgetExceeded ? 'text-danger' : 'text-success'}`}>{remaining.toLocaleString('de-DE')} €</span></span>
            </div>
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
                      highlightClass={selectedPlayers[slot.key] && activeReplacedIds.has(selectedPlayers[slot.key]!) ? 'ring-1 ring-danger/50' : undefined}
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

      {isHinrunde && (
        <div className="p-6 bg-surface border border-border rounded-lg mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <i className="sap-icon sap-icon-switch-classes text-accent" />
              Winterwechsel
              <span className="text-[11px] text-muted font-normal">({transfers.length}/3)</span>
            </h2>
            <div className="flex items-center gap-3">
              {transferDiff !== 0 && (
                <span className={`text-xs font-semibold ${transferDiff > 0 ? 'text-danger' : 'text-success'}`}>
                  {transferDiff > 0 ? '+' : ''}{transferDiff.toLocaleString('de-DE')} €
                </span>
              )}
              {transfers.length < 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddTransfer}
                >
                  <i className="sap-icon sap-icon-add text-xs mr-1" />
                  Wechsel hinzufügen
                </Button>
              )}
            </div>
          </div>

          {transfers.length === 0 && (
            <div className="text-center py-6">
              <i className="sap-icon sap-icon-switch-classes text-[32px] text-subtle mb-2" />
              <p className="text-sm text-muted mb-3">Noch keine Winterwechsel eingetragen.</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddTransfer}
              >
                <i className="sap-icon sap-icon-add text-xs mr-1" />
                Ersten Wechsel hinzufügen
              </Button>
            </div>
          )}

          {transfers.length > 0 && (
            <div className="space-y-4">
              {transfers.map((transfer, index) => {
                const usedOldIds = transfers
                  .filter((_, i) => i !== index)
                  .map(t => t.oldPlayerId)
                  .filter((id): id is number => id !== null)
                const availableOldPlayers = lineupPlayers.filter(p => !usedOldIds.includes(p.id))

                const currentExcludeIds = new Set(transferExcludeIds)
                transfers.forEach((t, i) => {
                  if (i !== index && t.newPlayerId) {
                    currentExcludeIds.add(t.newPlayerId)
                  }
                })
                if (transfer.newPlayerId) {
                  currentExcludeIds.delete(transfer.newPlayerId)
                }

                return (
                  <div key={index} className="bg-elevated/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold text-foreground">Wechsel {index + 1}</h3>
                      <button
                        onClick={() => handleRemoveTransfer(index)}
                        className="text-muted hover:text-danger transition-colors p-1"
                        title="Wechsel entfernen"
                      >
                        <i className="sap-icon sap-icon-delete text-sm" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-start">
                      <div>
                        <span className="text-[11px] text-danger font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <i className="sap-icon sap-icon-arrow-right text-[10px]" />
                          Raus
                        </span>
                        <OldPlayerSearch
                          players={availableOldPlayers}
                          excludeIds={new Set(usedOldIds)}
                          value={transfer.oldPlayerId}
                          onChange={(id) => handleTransferOldChange(index, id)}
                        />
                      </div>

                      <div className="flex items-center justify-center pt-6">
                        <i className="sap-icon sap-icon-arrow-right text-accent text-lg" />
                      </div>

                      <div>
                        <span className="text-[11px] text-success font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <i className="sap-icon sap-icon-arrow-left text-[10px]" />
                          Rein
                        </span>
                        {transfer.oldPlayerId ? (
                          <TransferPlayerSearch
                            players={allPlayers}
                            excludeIds={currentExcludeIds}
                            value={transfer.newPlayerId}
                            onChange={(id) => handleTransferNewChange(index, id)}
                          />
                        ) : (
                          <div className="input-field w-full px-3 py-2 rounded text-xs text-placeholder opacity-50">
                            Wähle zuerst einen Spieler zum Tauschen
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {isTransferBudgetExceeded && (
                <div className="flex items-center gap-3 p-3 bg-danger-bg border border-danger/30 rounded-lg">
                  <i className="sap-icon sap-icon-alert text-[18px] text-danger shrink-0" />
                  <p className="text-danger text-sm">Budget überschritten. Das Team nach den Wechseln kostet {transferTotalCost.toLocaleString('de-DE')} € (Budget: {budget.toLocaleString('de-DE')} €).</p>
                </div>
              )}

              {hasTransferTeamViolation && (
                <div className="flex items-center gap-3 p-3 bg-warning-bg border border-warning/30 rounded-lg">
                  <i className="sap-icon sap-icon-alert text-[18px] text-warning shrink-0" />
                  <div>
                    <p className="text-warning text-sm">Maximal 5 Spieler pro Verein erlaubt.</p>
                    {Object.entries(transferTeamCounts).filter(([, c]) => c > 5).map(([team, count]) => (
                      <p key={team} className="text-warning text-xs mt-1">{team}: {count} Spieler</p>
                    ))}
                  </div>
                </div>
              )}

              {hasTransferPositionViolation && (
                <div className="flex items-center gap-3 p-3 bg-warning-bg border border-warning/30 rounded-lg">
                  <i className="sap-icon sap-icon-alert text-[18px] text-warning shrink-0" />
                  <p className="text-warning text-sm">
                    Ungültige Positionsverteilung: {transferPositionCounts.GOALKEEPER} TW, {transferPositionCounts.DEFENDER} ABW, {transferPositionCounts.MIDFIELD} MF, {transferPositionCounts.STRIKER} ST.
                    Erlaubt: 1 TW, 3-4 ABW, 3-4 MF, 3-4 ST.
                  </p>
                </div>
              )}

              {transferSuccess && (
                <div className="flex items-center gap-3 p-3 bg-success-bg border border-success/30 rounded-lg">
                  <i className="sap-icon sap-icon-accept text-[18px] text-success shrink-0" />
                  <p className="text-success text-sm">{transferSuccess}</p>
                </div>
              )}

              {hasTransferChanges && (
                <div className="flex gap-4 pt-4 border-t border-border">
                  <Button
                    variant="emphasized"
                    onClick={handleSaveTransfers}
                    disabled={savingTransfers || !transfersComplete || isTransferBudgetExceeded || hasTransferTeamViolation || hasTransferPositionViolation}
                  >
                    {savingTransfers ? 'Wird gespeichert...' : 'Winterwechsel speichern'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleResetTransfers}
                    disabled={savingTransfers}
                  >
                    Zurücksetzen
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isRueckrunde && hasExistingTransfers && (
        <div className="p-6 bg-surface border border-border rounded-lg mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <i className="sap-icon sap-icon-switch-classes text-accent" />
              Winterwechsel
            </h2>
            {existingTransferDiff !== 0 && (
              <span className={`text-xs font-semibold ${existingTransferDiff > 0 ? 'text-danger' : 'text-success'}`}>
                {existingTransferDiff > 0 ? '+' : ''}{existingTransferDiff.toLocaleString('de-DE')} €
              </span>
            )}
          </div>
          <div className="space-y-3">
            {[
              { old: manager.playerExchangedOld1, new_: manager.playerExchangedNew1 },
              { old: manager.playerExchangedOld2, new_: manager.playerExchangedNew2 },
              { old: manager.playerExchangedOld3, new_: manager.playerExchangedNew3 },
            ]
              .filter(t => t.old && t.new_)
              .map((t, i) => (
                <div key={i} className="bg-elevated/30 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-start">
                    <div>
                      <span className="text-[11px] text-danger font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <i className="sap-icon sap-icon-arrow-right text-[10px]" />
                        Raus
                      </span>
                      {renderPlayerCard(t.old!)}
                    </div>
                    <div className="flex items-center justify-center pt-6">
                      <i className="sap-icon sap-icon-arrow-right text-accent text-lg" />
                    </div>
                    <div>
                      <span className="text-[11px] text-success font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <i className="sap-icon sap-icon-arrow-left text-[10px]" />
                        Rein
                      </span>
                      {renderPlayerCard(t.new_!)}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {hasActiveTransfers && (
        <div className="p-6 bg-surface border border-border rounded-lg mt-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-y-2">
            <h2 className="text-sm font-semibold text-foreground">Aufstellung (Rückrunde)</h2>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-muted">Budget: <span className="text-foreground font-medium">{budget.toLocaleString('de-DE')} €</span></span>
              <span className="text-muted">Ausgegeben: <span className="text-foreground font-medium">{transferTotalCost.toLocaleString('de-DE')} €</span></span>
              <span className="text-muted">Verbleibend: <span className={`font-bold ${isTransferBudgetExceeded ? 'text-danger' : 'text-success'}`}>{transferRemaining.toLocaleString('de-DE')} €</span></span>
            </div>
          </div>

          <div className="space-y-4">
            {(['GOALKEEPER', 'DEFENDER', 'MIDFIELD', 'STRIKER'] as Position[]).map(pos => {
              const players = rueckrundePlayersByPosition[pos]
              if (players.length === 0) return null
              const groupLabel = pos === 'GOALKEEPER' ? 'Torwart' : pos === 'DEFENDER' ? 'Abwehr' : pos === 'MIDFIELD' ? 'Mittelfeld' : 'Sturm'
              return (
                <div key={pos} className="bg-elevated/30 rounded-lg p-3">
                  <h3 className="text-xs font-semibold text-accent uppercase tracking-wider mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    {groupLabel}
                  </h3>
                  <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    {players.map(player => (
                      <div key={player.id}>
                        {renderPlayerCard(player, activeNewIds.has(player.id) ? 'new' : undefined)}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
