import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { trackEvent } from '../hooks/useMatomo'
import { seasonApi } from '../api/seasons'
import { playerApi } from '../api/players'
import { authApi } from '../api/auth'
import Button from '../components/Button'
import { TableHead, Th, TableBody, Td } from '../components/Table'
import { positionLabels, positionColors } from './Players'
import type { Player, Season, Position } from '../types'

interface FieldErrors {
  login?: string
  email?: string
  password?: string
  confirmPassword?: string
  firstName?: string
  lastName?: string
}

interface PlayerSlot {
  key: string
  label: string
  position: Position
}

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

const POSITION_LABELS: Record<Position, string> = {
  GOALKEEPER: 'TW',
  DEFENDER: 'ABW',
  MIDFIELD: 'MF',
  STRIKER: 'ST',
}

const POSITION_GROUPS: { label: string; position: Position; slots: PlayerSlot[] }[] = [
  { label: 'Torwart', position: 'GOALKEEPER', slots: PLAYER_SLOTS.filter(s => s.position === 'GOALKEEPER') },
  { label: 'Abwehr', position: 'DEFENDER', slots: PLAYER_SLOTS.filter(s => s.position === 'DEFENDER') },
  { label: 'Mittelfeld', position: 'MIDFIELD', slots: PLAYER_SLOTS.filter(s => s.position === 'MIDFIELD') },
  { label: 'Sturm', position: 'STRIKER', slots: PLAYER_SLOTS.filter(s => s.position === 'STRIKER') },
]

const STEP_LABELS = ['Deine Daten', 'Dein Avatar', 'Dein Team', 'Deine Aufstellung']


function WizardStepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0 px-8 py-5">
      {STEP_LABELS.map((label, idx) => {
        const stepNum = idx + 1
        const isCompleted = stepNum < currentStep
        const isActive = stepNum === currentStep
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-accent text-primary-foreground'
                    : isActive
                      ? 'bg-accent-muted border-2 border-accent text-accent'
                      : 'bg-[#2a2a3e] border border-[#3a3a4e] text-[#6b7280]'
                }`}
              >
                {isCompleted ? (
                  <i className="sap-icon sap-icon-accept text-[14px]" />
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={`text-[11px] mt-1.5 font-medium whitespace-nowrap ${
                  isActive ? 'text-accent' : isCompleted ? 'text-accent/70' : 'text-[#6b7280]'
                }`}
              >
                {label}
              </span>
            </div>
            {idx < STEP_LABELS.length - 1 && (
              <div
                className={`w-16 md:w-24 h-[2px] mx-3 mt-[-18px] transition-all duration-300 ${
                  stepNum < currentStep ? 'bg-accent' : 'bg-[#3a3a4e]'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function PlayerSelect({
  slot,
  players,
  selectedIds,
  value,
  onChange,
}: {
  slot: PlayerSlot
  players: Player[]
  selectedIds: Set<number>
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
    let filtered = players.filter(p => p.position === slot.position)

    filtered = filtered.filter(p => p.id === value || !selectedIds.has(p.id))

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
  }, [players, slot.position, selectedIds, value, search, priceMin, priceMax])

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

  const handleClear = () => {
    onChange(null)
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
            onClick={handleClear}
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
          <p className="text-[11px] text-muted mt-0.5">{selectedPlayer.prize.toLocaleString('de-DE')} €</p>
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
        <span>{slot.label} wählen...</span>
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

export default function Register() {
  const [step, setStep] = useState(1)
  const [login, setLogin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const { register } = useAuth()
  const navigate = useNavigate()
  const firstInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const successDialogRef = useRef<HTMLDivElement>(null)

  const [season, setSeason] = useState<Season | null>(null)
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [playersLoading, setPlayersLoading] = useState(false)
  const [selectedPlayers, setSelectedPlayers] = useState<Record<string, number | null>>(() => {
    const initial: Record<string, number | null> = {}
    PLAYER_SLOTS.forEach(s => { initial[s.key] = null })
    return initial
  })
  const [freePosition, setFreePosition] = useState<'DEFENDER' | 'MIDFIELD' | 'STRIKER'>('DEFENDER')

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

  useEffect(() => {
    seasonApi.getAll().then(res => {
      if (res.data && res.data.length > 0) {
        setSeason(res.data[0])
      }
    }).catch(() => {})
  }, [])

  const loadPlayers = (seasonId: number) => {
    setPlayersLoading(true)
    playerApi.getBySeason(seasonId)
      .then(res => setAllPlayers(res.data))
      .catch(() => {})
      .finally(() => setPlayersLoading(false))
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

  const validateField = (field: keyof FieldErrors, value: string) => {
    if (!value.trim()) {
      setFieldErrors(prev => ({ ...prev, [field]: 'Dieses Feld ist erforderlich.' }))
      return false
    }
    if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setFieldErrors(prev => ({ ...prev, [field]: 'Bitte eine gültige E-Mail-Adresse eingeben.' }))
      return false
    }
    if (field === 'confirmPassword' && value !== password) {
      setFieldErrors(prev => ({ ...prev, [field]: 'Passwörter stimmen nicht überein.' }))
      return false
    }
    setFieldErrors(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
    return true
  }

  const handleBlur = (field: keyof FieldErrors, value: string) => {
    validateField(field, value)
  }

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const errors: FieldErrors = {}
    if (!login.trim()) errors.login = 'Dieses Feld ist erforderlich.'
    if (!email.trim()) errors.email = 'Dieses Feld ist erforderlich.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Bitte eine gültige E-Mail-Adresse eingeben.'
    if (!password.trim()) errors.password = 'Dieses Feld ist erforderlich.'
    if (!confirmPassword.trim()) errors.confirmPassword = 'Dieses Feld ist erforderlich.'
    else if (confirmPassword !== password) errors.confirmPassword = 'Passwörter stimmen nicht überein.'
    if (!firstName.trim()) errors.firstName = 'Dieses Feld ist erforderlich.'
    if (!lastName.trim()) errors.lastName = 'Dieses Feld ist erforderlich.'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsLoading(true)
    try {
      const [loginAvailable, emailAvailable] = await Promise.all([
        authApi.checkLogin(login),
        authApi.checkEmail(email),
      ])

      if (!loginAvailable) errors.login = 'Login bereits vergeben.'
      if (!emailAvailable) errors.email = 'E-Mail bereits registriert.'

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        return
      }
    } catch {
      setError('Verbindung zum Server fehlgeschlagen.')
      return
    } finally {
      setIsLoading(false)
    }

    setFieldErrors({})
    setStep(2)
  }

  const handleStep2Next = () => {
    setError('')
    if (season && allPlayers.length === 0) {
      loadPlayers(season.id)
    }
    setStep(3)
  }

  const handleStep3Next = () => {
    setError('')
    if (!allSlotsFilled) {
      const filled = visibleSlots.filter(s => selectedPlayers[s.key] !== null).length
      setError(`Bitte wähle alle 11 Spieler aus (aktuell ${filled}).`)
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
    setStep(4)
  }

  const handleAutoLineup = () => {
    setError('')
    if (allPlayers.length === 0) return

    const shuffle = <T,>(arr: T[]): T[] => {
      const a = [...arr]
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
      }
      return a
    }

    const positions: ('DEFENDER' | 'MIDFIELD' | 'STRIKER')[] = ['DEFENDER', 'MIDFIELD', 'STRIKER']
    const maxAttempts = 50

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const freePosCandidate = positions[Math.floor(Math.random() * positions.length)]

      const needs: { position: Position; count: number }[] = [
        { position: 'GOALKEEPER', count: 1 },
        { position: 'DEFENDER', count: freePosCandidate === 'DEFENDER' ? 4 : 3 },
        { position: 'MIDFIELD', count: freePosCandidate === 'MIDFIELD' ? 4 : 3 },
        { position: 'STRIKER', count: freePosCandidate === 'STRIKER' ? 4 : 3 },
      ]

      const byPosition: Record<Position, Player[]> = {
        GOALKEEPER: shuffle(allPlayers.filter(p => p.position === 'GOALKEEPER')),
        DEFENDER: shuffle(allPlayers.filter(p => p.position === 'DEFENDER')),
        MIDFIELD: shuffle(allPlayers.filter(p => p.position === 'MIDFIELD')),
        STRIKER: shuffle(allPlayers.filter(p => p.position === 'STRIKER')),
      }

      const picked: Player[] = []
      const teamCountsLocal: Record<string, number> = {}
      let totalPrice = 0
      let valid = true

      for (const { position, count } of needs) {
        let filled = 0
        for (const player of byPosition[position]) {
          if (filled >= count) break
          const teamName = player.teams?.length > 0 ? player.teams[player.teams.length - 1].name : ''
          const currentTeamCount = teamName ? (teamCountsLocal[teamName] || 0) : 0
          if (currentTeamCount >= 5) continue
          if (totalPrice + player.prize > budget) continue
          picked.push(player)
          totalPrice += player.prize
          if (teamName) teamCountsLocal[teamName] = currentTeamCount + 1
          filled++
        }
        if (filled < count) { valid = false; break }
      }

      if (!valid) continue

      const newSelected: Record<string, number | null> = {}
      PLAYER_SLOTS.forEach(s => { newSelected[s.key] = null })

      let gkIdx = 0, defIdx = 0, midIdx = 0, strIdx = 0
      const gkSlots = PLAYER_SLOTS.filter(s => s.position === 'GOALKEEPER')
      const defSlots = PLAYER_SLOTS.filter(s => s.position === 'DEFENDER')
      const midSlots = PLAYER_SLOTS.filter(s => s.position === 'MIDFIELD')
      const strSlots = PLAYER_SLOTS.filter(s => s.position === 'STRIKER')

      const defCount = freePosCandidate === 'DEFENDER' ? 4 : 3
      const midCount = freePosCandidate === 'MIDFIELD' ? 4 : 3
      const strCount = freePosCandidate === 'STRIKER' ? 4 : 3

      for (const player of picked) {
        if (player.position === 'GOALKEEPER' && gkIdx < 1) {
          newSelected[gkSlots[gkIdx++].key] = player.id
        } else if (player.position === 'DEFENDER' && defIdx < defCount) {
          newSelected[defSlots[defIdx++].key] = player.id
        } else if (player.position === 'MIDFIELD' && midIdx < midCount) {
          newSelected[midSlots[midIdx++].key] = player.id
        } else if (player.position === 'STRIKER' && strIdx < strCount) {
          newSelected[strSlots[strIdx++].key] = player.id
        }
      }

      setFreePosition(freePosCandidate)
      setSelectedPlayers(newSelected)
      return
    }

    setError('Auto-Aufstellung konnte keine gültige Aufstellung finden.')
  }

  const handleSubmit = async () => {
    setError('')
    setIsLoading(true)

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
      setIsLoading(false)
      return
    }

    try {
      await register({
        login,
        email,
        password,
        firstName,
        lastName,
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
      }, avatarFile ?? undefined)
      trackEvent('auth', 'register', 'success')
      setShowSuccessDialog(true)
    } catch (err: unknown) {
      trackEvent('auth', 'register', 'failure')
      const axiosError = err as { response?: { data?: string } }
      if (axiosError.response?.data && typeof axiosError.response.data === 'string') {
        setError(axiosError.response.data)
      } else {
        setError('Registrierung fehlgeschlagen. Login oder E-Mail bereits vergeben.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (step === 1) {
      firstInputRef.current?.focus()
    }
  }, [step])

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  const handleCloseSuccessDialog = useCallback(() => {
    setShowSuccessDialog(false)
    navigate('/login')
  }, [navigate])

  const handleSuccessDialogKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCloseSuccessDialog()
      return
    }
    if (e.key === 'Tab' && successDialogRef.current) {
      const focusable = successDialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
  }, [handleCloseSuccessDialog])

  useEffect(() => {
    if (showSuccessDialog) {
      document.addEventListener('keydown', handleSuccessDialogKeyDown)
      document.body.style.overflow = 'hidden'
      setTimeout(() => {
        const firstFocusable = successDialogRef.current?.querySelector<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])'
        )
        firstFocusable?.focus()
      }, 50)
    }
    return () => {
      document.removeEventListener('keydown', handleSuccessDialogKeyDown)
      document.body.style.overflow = ''
    }
  }, [showSuccessDialog, handleSuccessDialogKeyDown])

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleAvatarRemove = () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(null)
    setAvatarPreview(null)
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background py-6 px-4 sm:px-6 lg:px-8 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/background.png')" }}
    >
      <div className={`bg-surface/95 backdrop-blur-sm border border-border rounded-xl w-full ${step === 4 ? 'max-w-[960px]' : step === 3 ? 'max-w-[900px]' : 'max-w-[720px]'} max-h-[92vh] flex flex-col shadow-2xl overflow-hidden`}>

        <div className="relative h-28 shrink-0 overflow-hidden">
          <div
            className="absolute inset-0 bg-[length:100%_auto] bg-center bg-no-repeat"
            style={{ backgroundImage: 'url(/hero-banner.png)' }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to right, rgba(10,14,20,0.85) 0%, rgba(10,14,20,0.50) 50%, rgba(10,14,20,0.30) 100%)',
            }}
          />
          <div className="relative z-10 flex items-center h-full px-6">
            <div className="flex items-center">
              <div>
                <h1 className="text-xl font-bold text-white tracking-wide">Registrierung</h1>
                <p className="text-xs text-white/60 tracking-widest uppercase mt-0.5">Fantasy Football League</p>
              </div>
            </div>
            <button
              className="absolute top-4 right-4 p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              onClick={() => navigate('/login')}
              aria-label="Schließen"
            >
              <i className="sap-icon sap-icon-decline text-[18px]" />
            </button>
          </div>
        </div>

        <div className="border-b border-border bg-surface/80">
          <WizardStepper currentStep={step} />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {error && (
            <div className="flex items-center gap-3 p-3 bg-danger-bg border border-danger/30 rounded-lg mt-4">
              <i className="sap-icon sap-icon-alert text-[18px] text-danger shrink-0" />
              <p className="text-danger text-sm">{error}</p>
            </div>
          )}

          {step === 1 && (
            <form id="step1-form" className="mt-5" onSubmit={handleStep1Submit} noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label className="block text-xs text-muted mb-1">
                    Login <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle">
                      <i className="sap-icon sap-icon-person-placeholder text-[14px]" />
                    </span>
                    <input
                      ref={firstInputRef}
                      type="text"
                      required
                      maxLength={15}
                      placeholder="Login"
                      value={login}
                      onChange={(e) => {
                        setLogin(e.target.value)
                        if (fieldErrors.login) validateField('login', e.target.value)
                      }}
                      onBlur={() => handleBlur('login', login)}
                      className={`input-field w-full pl-9 pr-3 py-2.5 rounded-lg focus:outline-none text-sm ${fieldErrors.login ? 'border-danger focus:border-danger' : ''}`}
                    />
                  </div>
                  {fieldErrors.login && (
                    <p className="text-xs text-danger mt-1">{fieldErrors.login}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-muted mb-1">
                    E-Mail <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle">
                      <i className="sap-icon sap-icon-email text-[14px]" />
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (fieldErrors.email) validateField('email', e.target.value)
                      }}
                      onBlur={() => handleBlur('email', email)}
                      className={`input-field w-full pl-9 pr-3 py-2.5 rounded-lg focus:outline-none text-sm ${fieldErrors.email ? 'border-danger focus:border-danger' : ''}`}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-xs text-danger mt-1">{fieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-muted mb-1">
                    Passwort <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle">
                      <i className="sap-icon sap-icon-locked text-[14px]" />
                    </span>
                    <input
                      type="password"
                      required
                      autoComplete="new-password"
                      placeholder="Passwort"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (fieldErrors.password) validateField('password', e.target.value)
                      }}
                      onBlur={() => handleBlur('password', password)}
                      className={`input-field w-full pl-9 pr-3 py-2.5 rounded-lg focus:outline-none text-sm ${fieldErrors.password ? 'border-danger focus:border-danger' : ''}`}
                    />
                  </div>
                  {fieldErrors.password && (
                    <p className="text-xs text-danger mt-1">{fieldErrors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-muted mb-1">
                    Passwort wiederholen <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle">
                      <i className="sap-icon sap-icon-locked text-[14px]" />
                    </span>
                    <input
                      type="password"
                      required
                      autoComplete="new-password"
                      placeholder="Passwort"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        if (fieldErrors.confirmPassword) validateField('confirmPassword', e.target.value)
                      }}
                      onBlur={() => handleBlur('confirmPassword', confirmPassword)}
                      className={`input-field w-full pl-9 pr-3 py-2.5 rounded-lg focus:outline-none text-sm ${fieldErrors.confirmPassword ? 'border-danger focus:border-danger' : ''}`}
                    />
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="text-xs text-danger mt-1">{fieldErrors.confirmPassword}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-muted mb-1">
                    Vorname <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle">
                      <i className="sap-icon sap-icon-employee text-[14px]" />
                    </span>
                    <input
                      type="text"
                      required
                      maxLength={15}
                      placeholder="Vorname"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value)
                        if (fieldErrors.firstName) validateField('firstName', e.target.value)
                      }}
                      onBlur={() => handleBlur('firstName', firstName)}
                      className={`input-field w-full pl-9 pr-3 py-2.5 rounded-lg focus:outline-none text-sm ${fieldErrors.firstName ? 'border-danger focus:border-danger' : ''}`}
                    />
                  </div>
                  {fieldErrors.firstName && (
                    <p className="text-xs text-danger mt-1">{fieldErrors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-muted mb-1">
                    Nachname <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle">
                      <i className="sap-icon sap-icon-employee text-[14px]" />
                    </span>
                    <input
                      type="text"
                      required
                      maxLength={15}
                      placeholder="Nachname"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value)
                        if (fieldErrors.lastName) validateField('lastName', e.target.value)
                      }}
                      onBlur={() => handleBlur('lastName', lastName)}
                      className={`input-field w-full pl-9 pr-3 py-2.5 rounded-lg focus:outline-none text-sm ${fieldErrors.lastName ? 'border-danger focus:border-danger' : ''}`}
                    />
                  </div>
                  {fieldErrors.lastName && (
                    <p className="text-xs text-danger mt-1">{fieldErrors.lastName}</p>
                  )}
                </div>
              </div>

            </form>
          )}

          {step === 2 && (
            <div className="mt-5 flex flex-col items-center">
              <p className="text-sm text-muted mb-6">Wähle ein Profilbild aus (optional)</p>

              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="w-32 h-32 rounded-full border-2 border-dashed border-border hover:border-accent transition-colors flex items-center justify-center overflow-hidden focus:outline-none focus:ring-2 focus:ring-accent-ring cursor-pointer"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-muted select-none">
                    {initials || <i className="sap-icon sap-icon-person-placeholder text-[40px] text-subtle" />}
                  </span>
                )}
              </button>

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarSelect}
              />

              {avatarFile ? (
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-sm text-foreground">{avatarFile.name}</span>
                  <button
                    type="button"
                    onClick={handleAvatarRemove}
                    className="text-xs text-danger hover:text-danger/80 transition-colors"
                  >
                    Entfernen
                  </button>
                </div>
              ) : (
                <p className="mt-4 text-xs text-subtle">JPG, PNG oder WebP, max. 2 MB</p>
              )}

            </div>
          )}

          {step === 3 && (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-3 bg-elevated/60 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span className="text-[11px] text-muted">Budget</span>
                  <span className="text-xs font-semibold text-foreground">{budget.toLocaleString('de-DE')} €</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span className="text-[11px] text-muted">Ausgegeben</span>
                  <span className="text-xs font-semibold text-foreground">{totalCost.toLocaleString('de-DE')} €</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isBudgetExceeded ? 'bg-red-400' : 'bg-emerald-400'}`} />
                  <span className="text-[11px] text-muted">Verbleibend</span>
                  <span className={`text-xs font-bold ${isBudgetExceeded ? 'text-danger' : 'text-success'}`}>
                    {remaining.toLocaleString('de-DE')} €
                  </span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted">Freie Position</span>
                  <select
                    value={freePosition}
                    onChange={(e) => handleFreePositionChange(e.target.value as 'DEFENDER' | 'MIDFIELD' | 'STRIKER')}
                    className="input-field px-2 py-0.5 rounded text-[11px] cursor-pointer"
                  >
                    <option value="DEFENDER">Abwehr</option>
                    <option value="MIDFIELD">Mittelfeld</option>
                    <option value="STRIKER">Sturm</option>
                  </select>
                </div>
              </div>

              {hasTeamViolation && (
                <div className="flex items-center gap-3 p-3 bg-warning-bg border border-warning/30 rounded-lg">
                  <i className="sap-icon sap-icon-alert text-[18px] text-warning shrink-0" />
                  <p className="text-warning text-sm">Maximal 5 Spieler pro Verein erlaubt.</p>
                </div>
              )}

              {playersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
                  <span className="text-muted text-sm">Spieler werden geladen...</span>
                </div>
              ) : (
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
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {Object.entries(teamCounts).filter(([, c]) => c > 5).map(([team, count]) => (
                <div key={team} className="text-xs text-danger">
                  {team}: {count} Spieler (max. 5)
                </div>
              ))}

            </div>
          )}

          {step === 4 && (
            <div className="mt-4 space-y-4">
              <div className="bg-elevated/40 rounded-lg p-4 border border-border/50">
                <h3 className="text-xs font-semibold text-accent uppercase tracking-wider mb-3 flex items-center gap-2">
                  <i className="sap-icon sap-icon-person-placeholder text-[14px]" />
                  Deine Daten
                </h3>
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-full border-2 border-border overflow-hidden flex items-center justify-center shrink-0 bg-elevated">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-muted select-none">
                        {initials || <i className="sap-icon sap-icon-person-placeholder text-[28px] text-subtle" />}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm flex-1">
                    <div>
                      <p className="text-[11px] text-muted">Login</p>
                      <p className="text-foreground font-medium">{login}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted">Vorname</p>
                      <p className="text-foreground font-medium">{firstName}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted">Nachname</p>
                      <p className="text-foreground font-medium">{lastName}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted">E-Mail</p>
                      <p className="text-foreground font-medium truncate">{email}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted">Ausgegebenes Budget</p>
                      <p className="text-foreground font-medium">{totalCost.toLocaleString('de-DE')} €</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted">Restbudget</p>
                      <p className={`font-bold ${isBudgetExceeded ? 'text-danger' : 'text-success'}`}>{remaining.toLocaleString('de-DE')} €</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-elevated/40 rounded-lg p-4 border border-border/50">
                <h3 className="text-xs font-semibold text-accent uppercase tracking-wider mb-3 flex items-center gap-2">
                  <i className="sap-icon sap-icon-group text-[14px]" />
                  Kader ({selectedIds.size}/11)
                </h3>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full">
                    <TableHead>
                      <tr>
                        <Th>Name</Th>
                        <Th align="right">Preis</Th>
                        <Th>Position</Th>
                        <Th>Team</Th>
                      </tr>
                    </TableHead>
                    <TableBody>
                      {(() => {
                        const posOrder: Record<string, number> = { GOALKEEPER: 0, DEFENDER: 1, MIDFIELD: 2, STRIKER: 3 }
                        const squadPlayers = PLAYER_SLOTS
                          .map(slot => {
                            const id = selectedPlayers[slot.key]
                            return id ? allPlayers.find(p => p.id === id) ?? null : null
                          })
                          .filter((p): p is Player => p !== null)
                          .sort((a, b) => (posOrder[a.position] ?? 999) - (posOrder[b.position] ?? 999))
                        return squadPlayers.length > 0 ? squadPlayers.map(player => {
                          const team = player.teams?.length > 0 ? player.teams[player.teams.length - 1] : null
                          return (
                            <tr key={player.id} className="border-b border-border last:border-b-0">
                              <Td>
                                <div className="flex items-center">
                                  {player.pictureUrl ? (
                                    <img src={player.pictureUrl} alt={player.nameKicker} className="w-8 h-8 rounded-full object-cover mr-3" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-elevated flex items-center justify-center mr-3">
                                      <span className="text-[10px] text-muted">{POSITION_LABELS[player.position]}</span>
                                    </div>
                                  )}
                                  <span className="font-medium text-foreground">{player.nameKicker}</span>
                                </div>
                              </Td>
                              <Td align="right" className="text-foreground">
                                {player.prize.toLocaleString('de-DE')} €
                              </Td>
                              <Td>
                                <span className={`${positionColors[player.position]} text-xs font-medium px-2 py-0.5 rounded`}>
                                  {positionLabels[player.position]}
                                </span>
                              </Td>
                              <Td className="text-muted">
                                {team ? (
                                  <span className="flex items-center gap-2">
                                    {team.logoSUrl && (
                                      <img src={team.logoSUrl} alt={team.name} className="w-5 h-5 object-contain flex-shrink-0" />
                                    )}
                                    <span className="text-foreground">{team.name}</span>
                                  </span>
                                ) : '-'}
                              </Td>
                            </tr>
                          )
                        }) : (
                          <tr>
                            <td colSpan={4} className="text-center text-subtle py-6">
                              Keine Spieler ausgewählt
                            </td>
                          </tr>
                        )
                      })()}
                    </TableBody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border px-6 py-4 flex gap-3 justify-end bg-surface/95">
          {step === 1 && (
            <>
              <Button
                variant="transparent"
                onClick={() => navigate('/login')}
                disabled={isLoading}
              >
                Abbrechen
              </Button>
              <Button
                variant="emphasized"
                type="submit"
                form="step1-form"
                disabled={isLoading}
              >
                {isLoading ? 'Wird geprüft …' : 'Weiter'}
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button
                variant="transparent"
                onClick={() => {
                  setStep(1)
                  setError('')
                }}
              >
                Zurück
              </Button>
              <Button
                variant="emphasized"
                onClick={handleStep2Next}
              >
                Weiter
              </Button>
            </>
          )}
          {step === 3 && (
            <div className="flex items-center justify-between w-full">
              <Button
                variant="ghost"
                onClick={handleAutoLineup}
                disabled={isLoading || allPlayers.length === 0}
              >
                <i className="sap-icon sap-icon-synchronize text-[14px]" />
                Auto-Aufstellung
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="transparent"
                  onClick={() => {
                    setStep(2)
                    setError('')
                  }}
                  disabled={isLoading}
                >
                  Zurück
                </Button>
                <Button
                  variant="emphasized"
                  onClick={handleStep3Next}
                  disabled={!allSlotsFilled || isBudgetExceeded || hasTeamViolation}
                >
                  Weiter
                </Button>
              </div>
            </div>
          )}
          {step === 4 && (
            <>
              <Button
                variant="transparent"
                onClick={() => {
                  setStep(3)
                  setError('')
                }}
                disabled={isLoading}
              >
                Zurück
              </Button>
              <Button
                variant="emphasized"
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? 'Wird registriert …' : 'Registrieren'}
              </Button>
            </>
          )}
        </div>
      </div>

      {showSuccessDialog && (
        <div
          className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4"
          role="presentation"
        >
          <div
            ref={successDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="success-dialog-title"
            className="bg-surface border border-border rounded-lg w-full max-w-[500px] max-h-[90vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-end px-6 pt-4">
              <Button
                variant="transparent"
                size="sm"
                onClick={handleCloseSuccessDialog}
                aria-label="Schließen"
                className="p-1.5 -mr-1.5"
              >
                <i className="sap-icon sap-icon-decline text-[20px]" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 pb-8">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                  <i className="sap-icon sap-icon-message-success text-[32px] text-success" />
                </div>
                <h2 id="success-dialog-title" className="text-2xl font-bold text-foreground">
                  Anmeldung erfolgreich!
                </h2>
              </div>

              <p className="text-foreground text-center mb-6">
                {firstName}, bitte überweise die Startgebühr von{' '}
                <span className="font-semibold">
                  {season?.spieleinsatzEuro != null
                    ? `${Number(season.spieleinsatzEuro).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
                    : '–'}
                </span>.
              </p>

              {season?.paypalLink && (
                <a
                  href={season.paypalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full border border-border rounded-lg px-6 py-4 mb-6 hover:bg-hover transition-colors"
                >
                  <img src="/paypal.png" alt="PayPal" className="h-8 object-contain" />
                  <span className="text-foreground font-medium">Jetzt mit PayPal bezahlen</span>
                  <i className="sap-icon sap-icon-action text-muted text-[14px]" />
                </a>
              )}

              {(season?.iban || season?.bankName) && (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted uppercase tracking-wider">Alternativ per Überweisung</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <div className="bg-hover/50 rounded-lg px-5 py-4 mb-6">
                    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                      {season.kontoinhaber && (
                        <>
                          <span className="text-muted">Kontoinhaber</span>
                          <span className="text-foreground">{season.kontoinhaber}</span>
                        </>
                      )}
                      {season.iban && (
                        <>
                          <span className="text-muted">IBAN</span>
                          <span className="text-foreground font-mono text-xs tracking-wide">{season.iban}</span>
                        </>
                      )}
                      {season.bic && (
                        <>
                          <span className="text-muted">BIC</span>
                          <span className="text-foreground font-mono text-xs tracking-wide">{season.bic}</span>
                        </>
                      )}
                      {season.bankName && (
                        <>
                          <span className="text-muted">Bank</span>
                          <span className="text-foreground">{season.bankName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}

              <p className="text-xs text-muted text-center mb-6">
                Eine Zusammenfassung erhältst du per E-Mail.
              </p>

              <Button
                variant="emphasized"
                onClick={handleCloseSuccessDialog}
                className="w-full"
              >
                Fenster schließen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
