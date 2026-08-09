import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useCurrentSeason, useSendInvitationTestMail } from '../hooks/useSeasons'
import InvitationMailSendDialog from '../components/InvitationMailSendDialog'
import Button from '../components/Button'
import FormCard from '../components/FormCard'

export default function MailingInvitation() {
  const { data: season, isLoading } = useCurrentSeason()
  const sendTestMail = useSendInvitationTestMail()

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
              <strong> FFL | Einladung zur Saison {season.name}</strong>. Sende eine Testmail an die Admin-Adresse,
              um das Ergebnis zu prüfen.
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
          variant="emphasized"
          onClick={() => setShowSendDialog(true)}
        >
          An alle E-Mail-Adressen senden
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

      <InvitationMailSendDialog
        isOpen={showSendDialog}
        onClose={() => setShowSendDialog(false)}
        seasonId={season.id}
        seasonName={season.name}
      />
    </div>
  )
}
