import { useState } from 'react'
import { useEmails } from '../hooks/useEmails'
import Button from './Button'
import InvitationMailProgressDialog from './InvitationMailProgressDialog'

interface Props {
  isOpen: boolean
  onClose: () => void
  seasonId: number
  seasonName: string
}

export default function InvitationMailSendDialog({ isOpen, onClose, seasonId, seasonName }: Props) {
  const { data: emails } = useEmails()
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [testMode, setTestMode] = useState(false)

  if (!isOpen) return null

  const emailCount = emails?.length ?? 0
  const batchCount = Math.ceil(emailCount / 10)

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="p-4 md:p-6 bg-surface border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-foreground">Saisoneinladung versenden</h2>
            <span className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs font-semibold">
              {seasonName}
            </span>
          </div>
          <Button variant="ghost" size="compact" onClick={onClose}>
            Schließen
          </Button>
        </div>

        <div className="p-4 md:p-6 bg-surface border border-border mb-4">
          <h3 className="text-base md:text-lg font-semibold text-primary mb-3">Empfänger</h3>
          <p className="text-sm text-muted mb-2">
            Die Einladungsmail wird an alle E-Mail-Adressen aus der Verwaltung gesendet.
          </p>
          <div className="flex items-center gap-4">
            <div className="bg-elevated border border-border-hover rounded-md px-4 py-3">
              <span className="text-2xl font-bold text-foreground">{emailCount}</span>
              <span className="text-sm text-muted ml-2">E-Mail-Adressen</span>
            </div>
            <div className="bg-elevated border border-border-hover rounded-md px-4 py-3">
              <span className="text-2xl font-bold text-foreground">{batchCount}</span>
              <span className="text-sm text-muted ml-2">Batches (à 10)</span>
            </div>
          </div>
          {emailCount > 0 && (
            <div className="mt-4 max-h-[200px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface">
                  <tr className="text-left text-muted border-b border-border">
                    <th className="py-2 w-14 text-center">#</th>
                    <th className="py-2">E-Mail-Adresse</th>
                  </tr>
                </thead>
                <tbody>
                  {emails?.map((email, idx) => (
                    <tr key={email.id} className={`border-b border-border ${idx % 2 === 1 ? 'bg-zebra' : ''}`}>
                      <td className="py-1.5 text-center text-subtle font-mono text-xs">{idx + 1}</td>
                      <td className="py-1.5 text-muted">{email.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
                Nur eine Test-Mail wird an die Admin-Email gesendet (kein BCC an Empfänger)
              </p>
            </div>
          </label>
        </div>

        <div className="flex items-center gap-4">
          <Button
            onClick={() => setSendDialogOpen(true)}
            disabled={emailCount === 0}
            variant="emphasized"
            className={`w-full md:w-auto font-semibold ${testMode ? 'bg-success text-background hover:bg-success' : ''}`}
          >
            {testMode ? `Test-Mail senden` : `Einladungsmail senden (${emailCount} Empfänger)`}
          </Button>
        </div>

        <InvitationMailProgressDialog
          isOpen={sendDialogOpen}
          onClose={() => setSendDialogOpen(false)}
          seasonId={seasonId}
          testMode={testMode}
        />
      </div>
    </div>
  )
}
