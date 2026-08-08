import { useState, useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useCurrentSeason, useUpdateSeason, useInvitationMailPreview, useSendInvitationTestMail } from '../hooks/useSeasons'
import InvitationMailSendDialog from '../components/InvitationMailSendDialog'
import Button from '../components/Button'
import FormCard from '../components/FormCard'
import type { Season } from '../types'

export default function MailingInvitation() {
  const { data: season, isLoading } = useCurrentSeason()
  const updateSeason = useUpdateSeason()
  const { refetch: fetchInvitationPreview, isFetching: isFetchingPreview } = useInvitationMailPreview(season?.id ?? 0)
  const sendTestMail = useSendInvitationTestMail()

  const [formData, setFormData] = useState<Partial<Season>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [showSendDialog, setShowSendDialog] = useState(false)

  useEffect(() => {
    if (season) {
      setFormData({
        invitationMailSubject: season.invitationMailSubject ?? '',
        invitationMailText: season.invitationMailText ?? ''
      })
      setHasChanges(false)
    }
  }, [season])

  const handleChange = (field: keyof Season, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!season || !hasChanges) return
    await updateSeason.mutateAsync({ id: season.id, data: formData })
    setHasChanges(false)
  }

  const resetFormData = () => {
    if (!season) return
    setFormData({
      invitationMailSubject: season.invitationMailSubject ?? '',
      invitationMailText: season.invitationMailText ?? ''
    })
    setHasChanges(false)
  }

  if (isLoading) {
    return <div className="text-muted">Laden...</div>
  }

  if (!season) {
    return <div className="text-muted">Keine Saison gefunden.</div>
  }

  return (
    <div>
      <RouterLink to="/mailing" className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover hover:underline font-semibold mb-4">
        <i className="sap-icon sap-icon-nav-back text-base" />
        Zurück zur Übersicht
      </RouterLink>

      <div className="grid gap-6">
        <FormCard className="overflow-visible">
          <label className="block text-sm text-muted mb-2">Betreff</label>
          <input
            type="text"
            value={formData.invitationMailSubject ?? ''}
            onChange={(e) => handleChange('invitationMailSubject', e.target.value)}
            placeholder="z.B. FFL | Saison 25/26 | Einladung"
            className="input-field w-full px-3 py-2 focus:outline-none mb-4"
          />
          <div className="bg-info/10 border border-border rounded-card p-4 mb-2">
            <p className="text-sm text-muted leading-relaxed">
              Der Inhalt der Einladungsmail wird aus einem festen Template automatisch aus den Saisondaten generiert
              (Saisonname, Startdatum, Anmeldeschluss, Rückrunden-Spieltag, Spieleinsatz, Serverkosten, Gewinnausschüttung,
              Anzahl Spielleiter, Budget). In der Vorschau und Testmail sind die aus der Datenbank geladenen Werte
              <strong className="text-danger"> rot</strong> markiert. Passe den Betreff oben an, speichere und sende eine
              Testmail an die Admin-Adresse, um das Ergebnis zu prüfen.
            </p>
          </div>
        </FormCard>
      </div>

      <div className="mt-6 flex flex-wrap gap-4">
        {hasChanges && (
          <>
            <Button
              variant="emphasized"
              onClick={handleSave}
              disabled={updateSeason.isPending}
            >
              {updateSeason.isPending ? 'Wird gespeichert...' : 'Speichern'}
            </Button>
            <Button
              variant="ghost"
              onClick={resetFormData}
            >
              Abbrechen
            </Button>
          </>
        )}
        <Button
          variant="transparent"
          onClick={async () => {
            if (hasChanges) {
              await updateSeason.mutateAsync({ id: season.id, data: formData })
              setHasChanges(false)
            }
            const result = await fetchInvitationPreview()
            if (result.data) {
              setPreviewHtml(result.data.html)
              setShowPreviewModal(true)
            }
          }}
          disabled={isFetchingPreview}
        >
          {isFetchingPreview ? 'Lade Vorschau...' : 'Vorschau'}
        </Button>
        <Button
          variant="transparent"
          onClick={() => {
            if (hasChanges) {
              updateSeason.mutateAsync({ id: season.id, data: formData }).then(() => {
                setHasChanges(false)
                sendTestMail.mutate(season.id)
              })
            } else {
              sendTestMail.mutate(season.id)
            }
          }}
          disabled={sendTestMail.isPending}
        >
          {sendTestMail.isPending ? 'Wird gesendet...' : 'Test-Mail an Admin'}
        </Button>
      </div>

      {sendTestMail.isSuccess && (
        <div className="mt-4 bg-success/10 border border-success rounded-card p-4">
          <p className="text-success text-sm font-medium">
            Test-Einladungsmail wurde an die Admin-Adresse versendet.
          </p>
        </div>
      )}
      {sendTestMail.isError && (
        <div className="mt-4 bg-danger/10 border border-danger rounded-card p-4">
          <p className="text-danger text-sm font-medium">
            Fehler: {(sendTestMail.error as any)?.response?.data?.message || (sendTestMail.error as Error)?.message || 'Unbekannter Fehler'}
          </p>
        </div>
      )}

      <div className="mt-6">
        <Button
          variant="emphasized"
          onClick={() => setShowSendDialog(true)}
        >
          An alle E-Mail-Adressen senden
        </Button>
      </div>

      {showPreviewModal && previewHtml && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <FormCard className="w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-foreground">E-Mail Vorschau</h3>
              <Button
                variant="ghost"
                size="compact"
                onClick={() => {
                  setShowPreviewModal(false)
                  setPreviewHtml(null)
                }}
              >
                ✕
              </Button>
            </div>
            <div className="flex-1 overflow-auto rounded-card border border-border-hover">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-[60vh] bg-white"
                title="E-Mail Vorschau"
              />
            </div>
            <div className="flex justify-end mt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowPreviewModal(false)
                  setPreviewHtml(null)
                }}
              >
                Schließen
              </Button>
            </div>
          </FormCard>
        </div>
      )}

      <InvitationMailSendDialog
        isOpen={showSendDialog}
        onClose={() => setShowSendDialog(false)}
        seasonId={season.id}
        seasonName={season.name}
      />
    </div>
  )
}
