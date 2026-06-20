import { Link as RouterLink } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import FormCard from '../components/FormCard'

interface MailCard {
  title: string
  description: string
  recipients: string
  route: string
  icon: string
}

const sections: { label: string; cards: MailCard[] }[] = [
  {
    label: 'Vor der Saison',
    cards: [
      {
        title: 'Saisoneinladung',
        description: 'Lädt neue Mitspieler zur kommenden Saison ein. Die Mail wird an alle Adressen im Adressbuch gesendet und enthält Infos zur neuen Saison sowie den Anmeldelink.',
        recipients: 'Adressbuch',
        route: '/mailing/einladung',
        icon: 'sap-icon-letter'
      }
    ]
  },
  {
    label: 'Während der Saison',
    cards: [
      {
        title: 'Spieltagsmail',
        description: 'Versendet nach jedem Spieltag eine individuelle Zusammenfassung an jeden Manager mit Punkten, Ergebnissen und KI-generiertem Kommentar.',
        recipients: 'Manager (auswählbar)',
        route: '/mailing/spieltagsmail',
        icon: 'sap-icon-email'
      }
    ]
  },
  {
    label: 'Nach der Saison',
    cards: [
      {
        title: 'Saisonabschlussmail',
        description: 'Informiert alle Manager über das Saisonende, die finale Rangliste und die Gewinnverteilung.',
        recipients: 'Manager (auswählbar)',
        route: '/mailing/abschlussmail',
        icon: 'sap-icon-email-read'
      },
      {
        title: 'Admin-Report',
        description: 'Sendet eine umfassende Zusammenfassung der gesamten Saison an den Admin. Ideal als Datensicherung vor einem Saison-Reset.',
        recipients: 'Admin',
        route: '/mailing/saisonabschluss',
        icon: 'sap-icon-manager-insight'
      }
    ]
  }
]

export default function Mailing() {
  return (
    <div>
      <PageHeader icon="sap-icon-email" title="Mailing" />

      <div className="space-y-8">
        {sections.map((section) => (
          <div key={section.label}>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">
              {section.label}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {section.cards.map((card) => (
                <FormCard key={card.route} className="flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <i className={`sap-icon ${card.icon} text-xl text-primary`} />
                      <h3 className="text-lg font-bold text-foreground">{card.title}</h3>
                    </div>
                    <p className="text-sm text-muted mb-4">{card.description}</p>
                    <p className="text-xs text-muted">
                      <span className="font-medium text-foreground">Empfänger:</span> {card.recipients}
                    </p>
                  </div>
                  <div className="mt-5">
                    <RouterLink
                      to={card.route}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-button-primary-hover transition-colors"
                    >
                      Öffnen
                      <i className="sap-icon sap-icon-navigation-right-arrow text-xs" />
                    </RouterLink>
                  </div>
                </FormCard>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
