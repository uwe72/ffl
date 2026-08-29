import { useState, useMemo, useEffect } from 'react'
import { useManagersBySeason } from '../hooks/useManagers'
import Button from './Button'
import TransparencyMailProgressDialog from './TransparencyMailProgressDialog'

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

interface Props {
  isOpen: boolean
  onClose: () => void
  seasonId: number
  seasonName: string
}

export default function TransparencyMailSendDialog({ isOpen, onClose, seasonId, seasonName }: Props) {
  const isMobile = useIsMobile()
  const { data: managers } = useManagersBySeason(seasonId)

  const [selectedEmails, setSelectedEmails] = useState<string[]>([])
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [rangeFromId, setRangeFromId] = useState('')
  const [rangeToId, setRangeToId] = useState('')
  const [testMode, setTestMode] = useState(false)

  const uniqueEmails = useMemo(() => {
    if (!managers) return []
    const seen = new Set<string>()
    const result: string[] = []
    for (const m of managers) {
      const email = m.email?.trim()
      if (!email) continue
      const key = email.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      result.push(email)
    }
    return result.sort((a, b) => a.localeCompare(b))
  }, [managers])

  const availableEmails = useMemo(() => {
    if (searchTerm === '') return uniqueEmails
    const term = searchTerm.toLowerCase()
    return uniqueEmails.filter((e) => e.toLowerCase().includes(term))
  }, [uniqueEmails, searchTerm])

  const allSelected =
    availableEmails.length > 0 && selectedEmails.length === availableEmails.length

  const toggleAll = () => {
    if (allSelected) setSelectedEmails([])
    else setSelectedEmails(availableEmails)
  }

  const toggleOne = (email: string) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((x) => x !== email) : [...prev, email],
    )
  }

  const selectRange = () => {
    const fromId = parseInt(rangeFromId, 10)
    const toId = parseInt(rangeToId, 10)
    if (isNaN(fromId) || isNaN(toId)) return
    const minId = Math.min(fromId, toId)
    const maxId = Math.max(fromId, toId)
    const emailsToSelect = uniqueEmails
      .filter((_, index) => {
        const id = index + 1
        return id >= minId && id <= maxId
      })
    setSelectedEmails((prev) => [...new Set([...prev, ...emailsToSelect])])
  }

  const canSend = selectedEmails.length > 0

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="p-4 md:p-6 bg-surface border border-border w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-foreground">Transparenz-Report</h2>
            <span className="px-2 py-1 rounded-badge bg-primary text-primary-foreground text-xs font-semibold">
              {seasonName}
            </span>
          </div>
          <Button variant="ghost" size="compact" onClick={onClose}>
            Schließen
          </Button>
        </div>

        <div className="p-4 md:p-6 bg-surface border border-border mb-4">
          <div className="mb-4 flex flex-col md:flex-row gap-3 md:gap-4 md:items-center">
            <h3 className="text-base md:text-lg font-semibold text-primary md:whitespace-nowrap">Empfänger</h3>
            <input
              placeholder="E-Mail suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field w-full md:max-w-md px-3 py-2 focus:outline-none"
            />
            <div className="md:ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAll}
                disabled={availableEmails.length === 0}
              >
                {allSelected ? 'Alle abwählen' : 'Alle selektieren'}
              </Button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted">Bereich selektieren:</span>
            <input
              type="number"
              placeholder="Von ID"
              value={rangeFromId}
              onChange={(e) => setRangeFromId(e.target.value)}
              className="input-field w-24 px-3 py-2 focus:outline-none"
            />
            <span className="text-muted">-</span>
            <input
              type="number"
              placeholder="Bis ID"
              value={rangeToId}
              onChange={(e) => setRangeToId(e.target.value)}
              className="input-field w-24 px-3 py-2 focus:outline-none"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={selectRange}
              disabled={!rangeFromId || !rangeToId}
            >
              Selektieren
            </Button>
          </div>

          {isMobile ? (
            <div className="grid gap-3 max-h-[300px] overflow-y-auto">
              {availableEmails.map((email, index) => (
                <div
                  key={email}
                  className="p-4 bg-surface border border-border"
                >
                  <div className="flex gap-4 items-start">
                    <input
                      type="checkbox"
                      checked={selectedEmails.includes(email)}
                      onChange={() => toggleOne(email)}
                      className="w-5 h-5 accent-accent mt-1 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-subtle font-mono">#{index + 1}</span>
                        <div className="font-semibold text-foreground truncate">{email}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {availableEmails.length === 0 && (
                <div className="py-4 text-center text-muted">
                  Keine E-Mail-Adressen gefunden.
                </div>
              )}
            </div>
          ) : (
            <div className="max-h-[504px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface">
                  <tr className="text-left text-muted border-b border-border">
                    <th className="py-2 w-10"></th>
                    <th className="py-2 w-14 text-center">ID</th>
                    <th className="py-2">E-Mail-Adresse</th>
                  </tr>
                </thead>
                <tbody>
                  {availableEmails.map((email, idx) => (
                    <tr
                      key={email}
                      className={`border-b border-border ${
                        idx % 2 === 1 ? 'bg-zebra hover:bg-card-hover' : 'hover:bg-card-hover'
                      }`}
                    >
                      <td className="py-2">
                        <input
                          type="checkbox"
                          checked={selectedEmails.includes(email)}
                          onChange={() => toggleOne(email)}
                          className="w-4 h-4 accent-accent"
                        />
                      </td>
                      <td className="py-2 text-center text-subtle font-mono text-xs">
                        {uniqueEmails.indexOf(email) + 1}
                      </td>
                      <td className="py-2 text-foreground">{email}</td>
                    </tr>
                  ))}
                  {availableEmails.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-muted">
                        Keine E-Mail-Adressen gefunden.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 text-sm text-subtle">
            {uniqueEmails.length} eindeutige E-Mail-Adressen von {managers?.length || 0} Managern
          </div>
        </div>

        <div className="p-4 bg-surface border border-border mb-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={testMode}
              onChange={(e) => setTestMode(e.target.checked)}
              className="w-5 h-5 accent-accent"
            />
            <div>
              <span className="text-foreground font-medium">Test-Modus</span>
              <p className="text-sm text-muted">
                Report geht an die Admin-Email statt als BCC an die Empfänger
              </p>
            </div>
          </label>
        </div>

        <div className="flex items-center gap-4">
          <Button
            onClick={() => setSendDialogOpen(true)}
            disabled={!canSend}
            variant="emphasized"
            className={`w-full md:w-auto font-semibold ${testMode ? 'bg-success text-background hover:bg-success' : ''}`}
          >
            {testMode ? `Test-Mail senden (${selectedEmails.length})` : `Transparenz-Report als BCC senden (${selectedEmails.length})`}
          </Button>
        </div>

        <TransparencyMailProgressDialog
          isOpen={sendDialogOpen}
          onClose={() => setSendDialogOpen(false)}
          seasonId={seasonId}
          emails={selectedEmails}
          testMode={testMode}
        />
      </div>
    </div>
  )
}
