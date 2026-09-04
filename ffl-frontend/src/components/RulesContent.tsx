import { useInvitationPreview, usePublicCurrentSeason } from '../hooks/useSeasons'

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2.5 text-xs font-bold text-subtle uppercase tracking-wider">
      {children}
    </p>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-card">
      <div className="px-5 py-4 text-foreground text-sm leading-relaxed">
        {children}
      </div>
    </div>
  )
}

export default function RulesContent() {
  const { data: preview, isLoading, isError } = useInvitationPreview()
  const { data: season } = usePublicCurrentSeason()
  const isBeforeSeason = season?.seasonState === 'BEFORE_SEASON'

  if (isLoading) {
    return (
      <div className="py-10 text-center text-muted text-sm">
        Laden …
      </div>
    )
  }

  if (isError || !preview) {
    return (
      <div className="py-10 text-center text-muted text-sm">
        Die Spielinformationen sind momentan nicht verfügbar.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-foreground rounded-card px-6 py-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="m-0 mb-2 text-on-dark-muted text-[11px] font-bold uppercase tracking-[1.5px]">
              FFL &middot; Fantasy Football League
            </p>
            <h2 className="m-0 mb-1 text-surface text-2xl font-bold leading-tight">
              {isBeforeSeason ? 'Einladung' : 'Die FFL in Kürze'}
            </h2>
            <p className="m-0 text-on-dark-muted text-sm font-medium">
              Saison <strong className="font-bold text-on-dark">{preview.seasonName}</strong>
            </p>
          </div>
          <span
            className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-success text-success-foreground text-lg font-bold"
            aria-hidden="true"
          >
            &#9993;
          </span>
        </div>
      </div>

      <section>
        <SectionEyebrow>{isBeforeSeason ? 'Die neue Saison ruft!' : 'Das Spiel'}</SectionEyebrow>
        <Card>
          {isBeforeSeason && (
            <p className="m-0 mb-3 text-muted">
              Ab <strong className="font-semibold text-foreground">{preview.startDateLong}</strong> rollt der Ball wieder, und damit geht auch unsere <strong className="font-semibold text-foreground">Fantasy Football League</strong> in die nächste Saison. Wir freuen uns, wenn Du dabei bist.
            </p>
          )}
          <p className="m-0 mb-3 text-muted">
            Wir betreuen das Spiel seit <strong className="font-semibold text-foreground">2011/2012</strong>, mittlerweile spielen <strong className="font-semibold text-foreground">200 bis 260 Fußballfans</strong> mit, von Deutschland bis Irland, Kanada und Kuba.
          </p>
          <p className="m-0 text-muted">
            Die FFL ist ein einfaches Managerspiel: Du stellst <strong className="font-semibold text-foreground">einmalig</strong> ein Team aus echten Bundesligaspielern zusammen und sammelst <strong className="font-semibold text-foreground">34 Spieltage</strong> lang Punkte für deren Tore und Leistungen.
          </p>
        </Card>
      </section>

      {isBeforeSeason && (
        <section>
          <SectionEyebrow>Jetzt anmelden</SectionEyebrow>
          <Card>
            <p className="m-0 mb-3 text-muted">Registriere Dich und stelle Dein Team auf:</p>
            <ul className="m-0 mb-3 pl-5 text-muted space-y-1.5 list-disc marker:text-subtle">
              <li>
                <strong className="font-semibold text-foreground">
                  Anmeldeschluss: {preview.deadlineDate} um {preview.deadlineTime} Uhr
                </strong>
              </li>
              <li>Bis dahin kannst Du Dein Team <strong className="font-semibold text-foreground">beliebig oft umbauen</strong></li>
            </ul>
          </Card>
        </section>
      )}

      <section>
        <SectionEyebrow>Spielregeln</SectionEyebrow>
        <Card>
          <ul className="m-0 pl-5 text-muted space-y-1.5 list-disc marker:text-subtle">
            <li><strong className="font-semibold text-foreground">Elf Spieler:</strong> 1 Torwart, 3 Abwehr, 3 Mittelfeld, 3 Sturm, dazu 1 Joker auf einer frei wählbaren Feldposition</li>
            <li><strong className="font-semibold text-foreground">Budget: {preview.budget} Euro</strong>, keine Begrenzung der Spieler pro Verein</li>
            <li><strong className="font-semibold text-foreground">Tore:</strong> Stürmer 3 Punkte, Mittelfeld 5, Abwehr 7, Torwart 10 (Torwart per Elfmeter 3)</li>
            <li><strong className="font-semibold text-foreground">Zu Null:</strong> Torwart 5 Punkte, Abwehr 2</li>
          </ul>
        </Card>
      </section>

      <section>
        <SectionEyebrow>Einsatz: {preview.spieleinsatz} Euro pro Manager</SectionEyebrow>
        <Card>
          <ul className="m-0 pl-5 text-muted space-y-1.5 list-disc marker:text-subtle">
            <li>Die <strong className="font-semibold text-foreground">{preview.anzahlSpielleiter}</strong> Spielleiter spielen mit je einem Team kostenlos mit.</li>
            <li>Vom Einsatz gehen <strong className="font-semibold text-foreground">{preview.serverkosten}</strong> Euro für <strong className="font-semibold text-foreground">Serverbetrieb und KI Nutzung</strong> ab.</li>
            <li>Ausgeschüttet wird an die <strong className="font-semibold text-foreground">besten 10 Prozent</strong>, bei 200 Managern also an die <strong className="font-semibold text-foreground">ersten 20</strong>.</li>
            <li>Der Erste Gewinner bekommt <strong className="font-semibold text-foreground">{preview.gewinnProzent}</strong> Prozent der Ausschüttung, der letzte Gewinner <strong className="font-semibold text-foreground">{preview.gewinnLetzter}</strong> Euro.</li>
          </ul>
        </Card>
      </section>

      <section>
        <SectionEyebrow>Spielerliste und Saisonverlauf</SectionEyebrow>
        <Card>
          <ul className="m-0 pl-5 text-muted space-y-1.5 list-disc marker:text-subtle">
            {preview.playersUrl ? (
              <li><a className="link font-semibold" href={preview.playersUrl}>Spielerliste online öffnen</a> oder im <strong className="font-semibold text-foreground">kicker Sonderheft</strong></li>
            ) : (
              <li>Die Spielerliste findest du online und im <strong className="font-semibold text-foreground">kicker Sonderheft</strong></li>
            )}
            {preview.documentsUrl ? (
              <li>Die erfolgreichsten Spieler der letzten Saison: in den <a className="link font-semibold" href={preview.documentsUrl}>Dokumenten</a></li>
            ) : (
              <li>Die erfolgreichsten Spieler der letzten Saison: in den <strong className="font-semibold text-foreground">Dokumenten</strong></li>
            )}
            <li>In der <strong className="font-semibold text-foreground">Winterpause</strong> dürfen <strong className="font-semibold text-foreground">bis zu drei Spieler</strong> getauscht werden</li>
          </ul>
        </Card>
      </section>

      <section>
        <SectionEyebrow>Viel Erfolg!</SectionEyebrow>
        <Card>
          <p className="m-0 text-muted">
            Wir wünschen allen Managerinnen und Managern eine gute Hand beim Aufstellen, viele Punkte und vor allem viel Spaß. <strong className="font-semibold text-foreground">Möge das beste Team gewinnen!</strong>
          </p>
        </Card>
      </section>
    </div>
  )
}
