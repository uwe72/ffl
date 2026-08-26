import { useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useCurrentSeason, useSendReminderTestMail, useReminderRegisteredEmails } from '../hooks/useSeasons'
import { useEmails } from '../hooks/useEmails'
import InvitationMailSendDialog from '../components/InvitationMailSendDialog'
import Button from '../components/Button'
import FormCard from '../components/FormCard'

interface Props {
  variant: 'danke' | 'erinnerung'
}

export default function MailingReminder({ variant }: Props) {
  const { data: season, isLoading } = useCurrentSeason()
  const { data: addressBook } = useEmails()
  const { data: registeredEmails } = useReminderRegisteredEmails(season?.id ?? 0)
  const sendTestMail = useSendReminderTestMail()

  const [showSendDialog, setShowSendDialog] = useState(false)

  const registeredSet = useMemo(
    () => new Set((registeredEmails ?? []).map((e) => e.toLowerCase())),
    [registeredEmails],
  )

  const filteredEmails = useMemo(() => {
    if (!addressBook) return []
    return addressBook.filter((addr) => {
      const isRegistered = registeredSet.has((addr.email ?? '').toLowerCase())
      return variant === 'danke' ? isRegistered : !isRegistered
    })
  }, [addressBook, registeredSet, variant])

  const isDanke = variant === 'danke'

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
              {isDanke ? (
                <>
                  Diese Erinnerungsmail geht an <strong>bereits angemeldete</strong> Adressen der Saison{' '}
                  <strong>{season.name}</strong> und wird als <strong>eine BCC-Mail</strong> gebündelt versendet.
                  Sie bedankt sich für die Anmeldung, regt zum Einladen von Freunden bzw. zur Zweitteam-Registrierung an
                  und wiederholt den Einladungstext zum Weiterleiten. Sende eine Testmail an die Admin-Adresse, um das
                  Ergebnis zu prüfen.
                </>
              ) : (
                <>
                  Diese Erinnerungsmail geht an <strong>noch nicht angemeldete</strong> Adressen der Saison{' '}
                  <strong>{season.name}</strong> und wird <strong>einzeln</strong> versendet (mit personalisiertem
                  Abmeldelink). Sie erinnert kurz an die offene Anmeldung und nennt die Anzahl der bereits angemeldeten
                  Manager. Sende eine Testmail an die Admin-Adresse, um das Ergebnis zu prüfen.
                </>
              )}
            </p>
          </div>
        </FormCard>
      </div>

      <div className="mt-6 flex flex-wrap gap-4">
        <Button
          variant="ghost"
          onClick={() => sendTestMail.mutate({ id: season.id, variant })}
          disabled={sendTestMail.isPending}
        >
          {sendTestMail.isPending ? 'Wird gesendet...' : 'Test-Mail an Admin'}
        </Button>
        <Button
          variant="emphasized"
          onClick={() => setShowSendDialog(true)}
          disabled={filteredEmails.length === 0}
        >
          {isDanke ? 'Danke-Mail senden' : 'Erinnerung senden'}
        </Button>
      </div>

      {filteredEmails.length === 0 && (
        <div className="mt-4 bg-warning/10 border border-border rounded-card p-4">
          <p className="text-muted text-sm">
            Keine {isDanke ? 'angemeldeten' : 'nicht angemeldeten'} Adressen für diese Saison vorhanden.
          </p>
        </div>
      )}

      {sendTestMail.isSuccess && (
        <div className="mt-4 bg-success/10 border border-success rounded-card p-4">
          <p className="text-success text-sm font-medium">
            Test-Erinnerungsmail wurde an die Admin-Adresse versendet.
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
        title={isDanke ? 'Danke-Mail (Angemeldete)' : 'Erinnerung (Nicht-Angemeldete)'}
        sendLabel={isDanke ? 'Danke-Mail senden' : 'Erinnerung senden'}
        testSendLabel="Test-Mail senden"
        endpoint="/reminder-mail/stream"
        progressTitle={isDanke ? 'Versende Danke-Mails…' : 'Versende Erinnerungs-Mails…'}
        emails={filteredEmails}
        sendMode={variant}
      />
    </div>
  )
}
