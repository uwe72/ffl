import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useCurrentSeason, useInvitationMailPreview, useSendInvitationTestMail } from '../hooks/useSeasons'
import InvitationMailSendDialog from '../components/InvitationMailSendDialog'
import Button from '../components/Button'
import FormCard from '../components/FormCard'

export default function MailingInvitation() {
  const { data: season, isLoading } = useCurrentSeason()
  const { refetch: fetchInvitationPreview, isFetching: isFetchingPreview } = useInvitationMailPreview(season?.id ?? 0)
  const sendTestMail = useSendInvitationTestMail()

  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [showSendDialog, setShowSendDialog] = useState(false)

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
          <div className="bg-info/10 border border-border rounded-card p-4">
            <p className="text-sm text-muted leading-relaxed">
              Der Inhalt der Einladungsmail wird aus einem festen Template automatisch aus den Saisondaten generiert
              (Saisonname, Startdatum, Anmeldeschluss, Rückrunden-Spieltag, Spieleinsatz, Serverkosten, Gewinnausschüttung,
              Anzahl Spielleiter, Budget). Der Betreff lautet immer
              <strong> FFL | Einladung zur Saison {season.name}</strong>. In der Vorschau und Testmail sind die aus der
              Datenbank geladenen Werte <strong className="text-danger">rot</strong> markiert. Sende eine Testmail an die
              Admin-Adresse, um das Ergebnis zu prüfen.
            </p>
          </div>
        </FormCard>
      </div>

      <div className="mt-6 flex flex-wrap gap-4">
        <Button
          variant="transparent"
          onClick={async () => {
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
          onClick={() => sendTestMail.mutate(season.id)}
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
