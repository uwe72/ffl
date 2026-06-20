import { useState, useMemo, useEffect } from 'react'
import { useEmails } from '../hooks/useEmails'
import type { EmailAddress } from '../types'
import Button from './Button'
import InvitationMailProgressDialog from './InvitationMailProgressDialog'

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

function EmailCard({
  email,
  isSelected,
  onToggle,
}: {
  email: EmailAddress
  isSelected: boolean
  onToggle: () => void
}) {
  return (
    <div className="p-4 bg-surface border border-border">
      <div className="flex gap-4 items-start">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="w-5 h-5 accent-[#0a6ed1] mt-1 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-subtle font-mono">#{email.id}</span>
            <div className="font-semibold text-foreground truncate">{email.email}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface Props {
  isOpen: boolean
  onClose: () => void
  seasonId: number
  seasonName: string
}

export default function InvitationMailSendDialog({ isOpen, onClose, seasonId, seasonName }: Props) {
  const isMobile = useIsMobile()
  const { data: emails } = useEmails()

  const [selectedEmailIds, setSelectedEmailIds] = useState<number[]>([])
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [rangeFromId, setRangeFromId] = useState('')
  const [rangeToId, setRangeToId] = useState('')
  const [testMode, setTestMode] = useState(false)

  const filteredEmails = useMemo(() => {
    if (!emails) return []
    const filtered = emails.filter((e) => {
      return searchTerm === '' ||
        e.email.toLowerCase().includes(searchTerm.toLowerCase())
    })
    return [...filtered].sort((a, b) => a.id - b.id)
  }, [emails, searchTerm])

  const allSelected =
    filteredEmails.length > 0 && selectedEmailIds.length === filteredEmails.length

  const toggleAll = () => {
    if (allSelected) setSelectedEmailIds([])
    else setSelectedEmailIds(filteredEmails.map((e) => e.id))
  }

  const toggleOne = (id: number) => {
    setSelectedEmailIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const selectRange = () => {
    const fromId = parseInt(rangeFromId, 10)
    const toId = parseInt(rangeToId, 10)
    if (isNaN(fromId) || isNaN(toId)) return
    const minId = Math.min(fromId, toId)
    const maxId = Math.max(fromId, toId)
    const idsToSelect = filteredEmails
      .filter((e) => e.id >= minId && e.id <= maxId)
      .map((e) => e.id)
    setSelectedEmailIds((prev) => [...new Set([...prev, ...idsToSelect])])
  }

  const canSend = selectedEmailIds.length > 0

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="p-4 md:p-6 bg-surface border border-border w-full max-w-5xl max-h-[72vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-foreground">Saisoneinladung</h2>
            <span className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs font-semibold">
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
              className="input-field w-full md:max-w-xs px-3 py-2 focus:outline-none"
            />
            <div className="flex gap-2 items-center">
              <input
                type="number"
                placeholder="Von ID"
                value={rangeFromId}
                onChange={(e) => setRangeFromId(e.target.value)}
                className="input-field w-20 px-2 py-2 focus:outline-none"
              />
              <span className="text-muted">-</span>
              <input
                type="number"
                placeholder="Bis ID"
                value={rangeToId}
                onChange={(e) => setRangeToId(e.target.value)}
                className="input-field w-20 px-2 py-2 focus:outline-none"
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
            <div className="md:ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAll}
                disabled={filteredEmails.length === 0}
              >
                {allSelected ? 'Alle abwählen' : 'Alle selektieren'}
              </Button>
            </div>
          </div>

          {isMobile ? (
            <div className="grid gap-3 max-h-[160px] overflow-y-auto">
              {filteredEmails.map((e) => (
                <EmailCard
                  key={e.id}
                  email={e}
                  isSelected={selectedEmailIds.includes(e.id)}
                  onToggle={() => toggleOne(e.id)}
                />
              ))}
              {filteredEmails.length === 0 && (
                <div className="py-4 text-center text-muted">
                  Keine E-Mail-Adressen gefunden.
                </div>
              )}
            </div>
          ) : (
            <div className="max-h-[240px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface">
                  <tr className="text-left text-muted border-b border-border">
                    <th className="py-2 w-10"></th>
                    <th className="py-2 w-14 text-center">ID</th>
                    <th className="py-2">E-Mail-Adresse</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmails.map((e, idx) => (
                    <tr
                      key={e.id}
                      className={`border-b border-border ${
                        idx % 2 === 1 ? 'bg-zebra hover:bg-card-hover' : 'hover:bg-card-hover'
                      }`}
                    >
                      <td className="py-2">
                        <input
                          type="checkbox"
                          checked={selectedEmailIds.includes(e.id)}
                          onChange={() => toggleOne(e.id)}
                          className="w-4 h-4 accent-[#0a6ed1]"
                        />
                      </td>
                      <td className="py-2 text-center text-subtle font-mono text-xs">{e.id}</td>
                      <td className="py-2 text-foreground">{e.email}</td>
                    </tr>
                  ))}
                  {filteredEmails.length === 0 && (
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
            {filteredEmails.length} von {emails?.length || 0} E-Mail-Adressen
          </div>
        </div>

        <div className="p-4 bg-surface border border-border mb-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={testMode}
              onChange={(e) => setTestMode(e.target.checked)}
              className="w-5 h-5 accent-[#0a6ed1]"
            />
            <div>
              <span className="text-foreground font-medium">Test-Modus</span>
              <p className="text-sm text-muted">
                Alle Mails gehen an die Admin-Email statt an die Empfänger
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
            {testMode ? `Test-Mail senden (${selectedEmailIds.length})` : `Einladungsmail senden (${selectedEmailIds.length})`}
          </Button>
        </div>

        <InvitationMailProgressDialog
          isOpen={sendDialogOpen}
          onClose={() => setSendDialogOpen(false)}
          seasonId={seasonId}
          emailIds={selectedEmailIds}
          testMode={testMode}
        />
      </div>
    </div>
  )
}
