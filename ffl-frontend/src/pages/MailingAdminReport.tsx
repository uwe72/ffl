import { Link as RouterLink } from 'react-router-dom'
import { useCurrentSeason, useSendSeasonReport } from '../hooks/useSeasons'
import Button from '../components/Button'
import PageHeader from '../components/PageHeader'
import FormCard from '../components/FormCard'

export default function MailingAdminReport() {
  const { data: season, isLoading } = useCurrentSeason()
  const sendSeasonReport = useSendSeasonReport()

  if (isLoading) {
    return <div className="text-muted">Laden...</div>
  }

  if (!season) {
    return <div className="text-muted">Keine Saison gefunden.</div>
  }

  return (
    <div>
      <RouterLink to="/mailing" className="inline-flex items-center gap-1 text-sm text-[#c9a66b] hover:text-[#d4b77a] hover:underline mb-4">
        <i className="sap-icon sap-icon-nav-back text-base" />
        Zurück zur Übersicht
      </RouterLink>

      <PageHeader icon="sap-icon-manager-insight" title="Admin-Report" />

      <div className="grid gap-6">
        <FormCard>
          <h3 className="text-lg font-bold text-foreground mb-3">Saison-Report an Admin senden</h3>
          <p className="text-sm text-muted mb-4">
            Sendet eine umfassende Zusammenfassung der gesamten Saison an die konfigurierte Gmail-Adresse.
            Ideal als Datensicherung vor einem Saison-Reset.
          </p>
          <div className="text-sm text-muted mb-6">
            <p className="font-medium text-foreground mb-2">Die E-Mail enthält:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Saisondaten (Name, Budget, Spieltage, Phase)</li>
              <li>Bankverbindung (PayPal, IBAN, BIC)</li>
              <li>Gewinnausschüttung (Parameter, Tabelle, Status, Kommentare)</li>
              <li>Manager-Rangliste (Endstand)</li>
              <li>Spieler-Rangliste (Endstand)</li>
              <li>Alle Gruppen mit Gruppenranglisten</li>
              <li>Manager-Kader (11 Spieler + Transfers pro Manager)</li>
              <li>Alle E-Mail-Adressen (Manager + Adressbuch)</li>
            </ul>
          </div>
          {sendSeasonReport.isSuccess && (
            <div className="bg-success/10 border border-success rounded-lg p-4 mb-4">
              <p className="text-success text-sm font-medium">Saison-Report wurde erfolgreich versendet.</p>
            </div>
          )}
          {sendSeasonReport.isError && (
            <div className="bg-danger/10 border border-danger rounded-lg p-4 mb-4">
              <p className="text-danger text-sm font-medium">
                Fehler: {(sendSeasonReport.error as any)?.response?.data?.message || (sendSeasonReport.error as Error)?.message || 'Unbekannter Fehler'}
              </p>
            </div>
          )}
          <Button
            variant="emphasized"
            onClick={() => sendSeasonReport.mutate(season.id)}
            disabled={sendSeasonReport.isPending}
          >
            {sendSeasonReport.isPending ? 'Wird gesendet...' : 'Saison-Report an Admin senden'}
          </Button>
        </FormCard>
      </div>
    </div>
  )
}
