import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useCurrentSeason, useSendTransparencyTestMail, useTransparencyMailPreview } from '../hooks/useSeasons'
import TransparencyMailSendDialog from '../components/TransparencyMailSendDialog'
import Button from '../components/Button'
import FormCard from '../components/FormCard'

export default function MailingTransparency() {
  const { data: season, isLoading } = useCurrentSeason()
  const sendTestMail = useSendTransparencyTestMail()
  const { refetch: fetchPreview, isFetching: isFetchingPreview } = useTransparencyMailPreview(season?.id ?? 0)

  const [showSendDialog, setShowSendDialog] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)

  if (isLoading) {
    return <div className="text-muted">Laden...</div>
  }

  if (!season) {
    return <div className="text-muted">Keine Saison gefunden.</div>
  }

  const openPreview = async () => {
    const result = await fetchPreview()
    if (result.data) {
      setPreviewHtml(result.data.html)
      setShowPreviewModal(true)
    }
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
              Der Transparenz-Report wird zu Beginn der Saison einmalig an alle Manager versendet. Er enthält
              für jeden Manager den kompletten Kader (positionsfarbig gruppiert) sowie eine Tabelle aller
              verwendeten Spieler mit der Anzahl der Manager, die ihn aufgestellt haben. Der Betreff lautet
              immer <strong>FFL | Transparenz-Report Saison {season.name}</strong>. Empfänger werden als
              <strong> eine BCC-Mail</strong> an alle ausgewählten E-Mail-Adressen versendet; doppelte Adressen
              werden nur einmal berücksichtigt. Sende zuerst eine Testmail an die Admin-Adresse oder öffne die
              Vorschau, um das Ergebnis zu prüfen.
            </p>
          </div>
        </FormCard>
      </div>

      <div className="mt-6 flex flex-wrap gap-4">
        <Button
          variant="ghost"
          onClick={() => sendTestMail.mutate(season.id)}
          disabled={sendTestMail.isPending}
        >
          {sendTestMail.isPending ? 'Wird gesendet...' : 'Test-Mail an Admin'}
        </Button>
        <Button
          variant="transparent"
          onClick={openPreview}
          disabled={isFetchingPreview}
        >
          {isFetchingPreview ? 'Lade Vorschau...' : 'Vorschau'}
        </Button>
        <Button
          variant="emphasized"
          onClick={() => setShowSendDialog(true)}
        >
          An E-Mail-Adressen senden
        </Button>
      </div>

      {sendTestMail.isSuccess && (
        <div className="mt-4 bg-success/10 border border-success rounded-card p-4">
          <p className="text-success text-sm font-medium">
            Test-Transparenz-Report wurde an die Admin-Adresse versendet.
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

      <TransparencyMailSendDialog
        isOpen={showSendDialog}
        onClose={() => setShowSendDialog(false)}
        seasonId={season.id}
        seasonName={season.name}
      />
    </div>
  )
}
