import { useState, useMemo, useEffect } from 'react'
import { Card, Button, Input } from '@heroui/react'
import { useManagersBySeason } from '../hooks/useManagers'
import type { Manager } from '../types'
import PrizeDistributionMailDialog from './PrizeDistributionMailDialog'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  return isMobile
}

function ManagerCard({
  manager,
  isSelected,
  hasEmail,
  onToggle,
}: {
  manager: Manager
  isSelected: boolean
  hasEmail: boolean
  onToggle: () => void
}) {
  const displayName = [manager.firstName, manager.lastName].filter(Boolean).join(' ') || manager.name

  return (
    <Card className={`p-4 bg-[#1a2028] border border-[#2d3748] ${!hasEmail ? 'opacity-50' : ''}`}>
      <div className="flex gap-4 items-start">
        <input
          type="checkbox"
          disabled={!hasEmail}
          checked={isSelected}
          onChange={onToggle}
          className="w-5 h-5 accent-[#c9a66b] mt-1 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6b7280] font-mono">#{manager.id}</span>
            <div className="font-semibold text-[#f5f5f5] truncate">{displayName}</div>
          </div>
          {manager.shortName && (
            <div className="text-sm text-[#c9a66b]">{manager.shortName}</div>
          )}
          {manager.login && (
            <div className="text-sm text-[#a0aec0] mt-1">{manager.login}</div>
          )}
          <div className="text-sm text-[#6b7280] mt-1 truncate">
            {manager.email || <em>keine Mailadresse</em>}
          </div>
        </div>
      </div>
    </Card>
  )
}

interface Props {
  isOpen: boolean
  onClose: () => void
  seasonId: number
  seasonName: string
}

export default function PrizeDistributionMailSendDialog({ isOpen, onClose, seasonId, seasonName }: Props) {
  const isMobile = useIsMobile()
  const { data: managers } = useManagersBySeason(seasonId)

  const [selectedManagerIds, setSelectedManagerIds] = useState<number[]>([])
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [adminFilter, setAdminFilter] = useState(false)
  const [rangeFromId, setRangeFromId] = useState('')
  const [rangeToId, setRangeToId] = useState('')
  const [testMode, setTestMode] = useState(false)

  const availableManagers = useMemo(() => {
    if (!managers) return []
    const filtered = managers.filter((m) => {
      const matchesSearch = searchTerm === '' ||
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.shortName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.login?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesAdmin = !adminFilter || m.email === 'uwe.clement@gmail.com'

      return matchesSearch && matchesAdmin
    })
    return [...filtered].sort((a, b) => a.id - b.id)
  }, [managers, searchTerm, adminFilter])

  const eligibleManagers = useMemo(
    () => availableManagers.filter((m) => !!m.email),
    [availableManagers],
  )
  const allSelected =
    eligibleManagers.length > 0 && selectedManagerIds.length === eligibleManagers.length

  const toggleAll = () => {
    if (allSelected) setSelectedManagerIds([])
    else setSelectedManagerIds(eligibleManagers.map((m) => m.id))
  }

  const toggleOne = (id: number) => {
    setSelectedManagerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const selectRange = () => {
    const fromId = parseInt(rangeFromId, 10)
    const toId = parseInt(rangeToId, 10)
    if (isNaN(fromId) || isNaN(toId)) return
    const minId = Math.min(fromId, toId)
    const maxId = Math.max(fromId, toId)
    const idsToSelect = eligibleManagers
      .filter((m) => m.id >= minId && m.id <= maxId)
      .map((m) => m.id)
    setSelectedManagerIds((prev) => [...new Set([...prev, ...idsToSelect])])
  }

  const canSend = selectedManagerIds.length > 0

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <Card
        className="p-4 md:p-6 bg-[#1a2028] border border-[#2d3748] w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-[#f5f5f5]">Saisonabschlussmail</h2>
            <span className="px-2 py-1 rounded-md bg-[#c9a66b] text-[#0f1419] text-xs font-semibold">
              {seasonName}
            </span>
          </div>
          <Button size="sm" variant="secondary" onPress={onClose} className="h-7 px-3 text-xs">
            Schließen
          </Button>
        </div>

        <Card className="p-4 md:p-6 bg-[#1a2028] border border-[#2d3748] mb-4">
          <div className="mb-4 flex flex-col md:flex-row gap-3 md:gap-4 md:items-center">
            <h3 className="text-base md:text-lg font-semibold text-[#c9a66b] md:whitespace-nowrap">Empfänger</h3>
            <Input
              placeholder="Manager suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:max-w-md bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
            />
            <div className="flex gap-2 md:ml-auto">
              <Button
                size="sm"
                onPress={() => setAdminFilter(!adminFilter)}
                className={`px-3 py-1 ${
                  adminFilter
                    ? 'bg-[#c9a66b] text-[#0f1419]'
                    : 'bg-[#3d4a5c] text-[#f5f5f5]'
                }`}
              >
                Admins selektieren
              </Button>
              <Button
                size="sm"
                onPress={toggleAll}
                isDisabled={eligibleManagers.length === 0}
                className="bg-[#3d4a5c] text-[#f5f5f5] px-3 py-1"
              >
                {allSelected ? 'Alle abwählen' : 'Alle selektieren'}
              </Button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2 items-center">
            <span className="text-sm text-[#a0aec0]">Bereich selektieren:</span>
            <Input
              type="number"
              placeholder="Von ID"
              value={rangeFromId}
              onChange={(e) => setRangeFromId(e.target.value)}
              className="w-24 bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
            />
            <span className="text-[#a0aec0]">-</span>
            <Input
              type="number"
              placeholder="Bis ID"
              value={rangeToId}
              onChange={(e) => setRangeToId(e.target.value)}
              className="w-24 bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
            />
            <Button
              size="sm"
              onPress={selectRange}
              isDisabled={!rangeFromId || !rangeToId}
              className="bg-[#3d4a5c] text-[#f5f5f5] px-3 py-1"
            >
              Selektieren
            </Button>
          </div>

          {isMobile ? (
            <div className="grid gap-3 max-h-[300px] overflow-y-auto">
              {availableManagers.map((m) => {
                const hasEmail = !!m.email
                return (
                  <ManagerCard
                    key={m.id}
                    manager={m}
                    isSelected={selectedManagerIds.includes(m.id)}
                    hasEmail={hasEmail}
                    onToggle={() => toggleOne(m.id)}
                  />
                )
              })}
              {availableManagers.length === 0 && (
                <div className="py-4 text-center text-[#a0aec0]">
                  Keine Manager gefunden.
                </div>
              )}
            </div>
          ) : (
            <div className="max-h-[504px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#1a2028]">
                  <tr className="text-left text-[#a0aec0] border-b border-[#2d3748]">
                    <th className="py-2 w-10"></th>
                    <th className="py-2 w-14 text-center">ID</th>
                    <th className="py-2">Name</th>
                    <th className="py-2">Login</th>
                    <th className="py-2">E-Mail</th>
                    <th className="py-2">Theme</th>
                  </tr>
                </thead>
                <tbody>
                  {availableManagers.map((m) => {
                    const hasEmail = !!m.email
                    const displayName =
                      [m.firstName, m.lastName].filter(Boolean).join(' ') || m.name
                    return (
                      <tr
                        key={m.id}
                        className={`border-b border-[#2d3748] ${
                          hasEmail ? 'hover:bg-[#242d38]' : 'opacity-50'
                        }`}
                      >
                        <td className="py-2">
                          <input
                            type="checkbox"
                            disabled={!hasEmail}
                            checked={selectedManagerIds.includes(m.id)}
                            onChange={() => toggleOne(m.id)}
                            className="w-4 h-4 accent-[#c9a66b]"
                          />
                        </td>
                        <td className="py-2 text-center text-[#6b7280] font-mono text-xs">{m.id}</td>
                        <td className="py-2 text-[#f5f5f5]">{displayName}</td>
                        <td className="py-2 text-[#a0aec0]">{m.login || '-'}</td>
                        <td className="py-2 text-[#a0aec0]">
                          {m.email || <em>keine Mailadresse</em>}
                        </td>
                        <td className="py-2 text-[#a0aec0]">{m.mailTheme || 'LIGHTMODE'}</td>
                      </tr>
                    )
                  })}
                  {availableManagers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-[#a0aec0]">
                        Keine Manager gefunden.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 text-sm text-[#6b7280]">
            {availableManagers.length} von {managers?.length || 0} Managern
          </div>
        </Card>

        <Card className="p-4 bg-[#1a2028] border border-[#2d3748] mb-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={testMode}
              onChange={(e) => setTestMode(e.target.checked)}
              className="w-5 h-5 accent-[#c9a66b]"
            />
            <div>
              <span className="text-[#f5f5f5] font-medium">Test-Modus</span>
              <p className="text-sm text-[#a0aec0]">
                Alle Mails gehen an die Admin-Email statt an die Manager
              </p>
            </div>
          </label>
        </Card>

        <div className="flex items-center gap-4">
          <Button
            onPress={() => setSendDialogOpen(true)}
            isDisabled={!canSend}
            className={`w-full md:w-auto font-semibold px-6 py-2 rounded disabled:opacity-50 ${testMode ? 'bg-[#48bb78] text-[#0f1419] hover:bg-[#38a169]' : 'bg-[#c9a66b] text-[#0f1419] hover:bg-[#d4b87a]'}`}
          >
            {testMode ? `Test-Mail senden (${selectedManagerIds.length})` : `Saisonabschlussmail senden (${selectedManagerIds.length})`}
          </Button>
        </div>

        <PrizeDistributionMailDialog
          isOpen={sendDialogOpen}
          onClose={() => setSendDialogOpen(false)}
          seasonId={seasonId}
          managerIds={selectedManagerIds}
          testMode={testMode}
        />
      </Card>
    </div>
  )
}
