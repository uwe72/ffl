const positions = [
  { key: 'GOALKEEPER', label: 'Torwart', edge: 'border-l-goalkeeper', tore: '10', toreNote: 'per Elfmeter 3 Punkte', zuNull: '5' },
  { key: 'DEFENDER', label: 'Abwehr', edge: 'border-l-defender', tore: '7', toreNote: '', zuNull: '2' },
  { key: 'MIDFIELD', label: 'Mittelfeld', edge: 'border-l-midfield', tore: '5', toreNote: '', zuNull: '–' },
  { key: 'STRIKER', label: 'Sturm', edge: 'border-l-striker', tore: '3', toreNote: '', zuNull: '–' },
]

function SectionTitle({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-base font-semibold text-foreground mb-3">
      <i className={`sap-icon ${icon} text-[18px] text-accent-light`} />
      {children}
    </h3>
  )
}

export default function RulesContent() {
  return (
    <div className="divide-y divide-border-subtle">
      <p className="text-[15px] text-foreground leading-relaxed pb-5">
        Du stellst aus dem Kader der Bundesliga dein eigenes Team zusammen und sammelst über alle{' '}
        <strong className="font-semibold">34 Spieltage</strong> Punkte.
        Gewertet wird ausschließlich, was deine Spieler auf dem Platz tatsächlich leisten.
        Bewusst einfach gehalten: keine Spielernoten, keine wöchentlichen Wechsel, kein tägliches Nachjustieren.
        Einmal aufstellen, dann mitfiebern.
      </p>

      <section className="py-5">
        <SectionTitle icon="sap-icon-group">Dein Kader</SectionTitle>
        <ul className="space-y-2 text-sm text-muted list-disc pl-5 marker:text-subtle">
          <li>Budget: <strong className="font-semibold text-foreground">30 Millionen Euro</strong></li>
          <li>Aufstellung: <strong className="font-semibold text-foreground">1 Torwart, 3 Abwehr, 3 Mittelfeld, 3 Sturm</strong></li>
          <li>Dazu <strong className="font-semibold text-foreground">1 Joker</strong> auf einer frei wählbaren Feldposition</li>
          <li>Keine Begrenzung, wie viele Spieler du von einem Verein nimmst</li>
          <li>Bis zum Anmeldeschluss kannst du dein Team <strong className="font-semibold text-foreground">beliebig oft umbauen</strong></li>
        </ul>
      </section>

      <section className="py-5">
        <SectionTitle icon="sap-icon-goal">Punkte gibt es nur für zwei Dinge: Tore und Zu Null</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {positions.map((p) => (
            <div
              key={p.key}
              className={`border-l-4 ${p.edge} bg-card-muted border border-border rounded-control px-3 py-2.5`}
            >
              <div className="text-sm font-semibold text-foreground">{p.label}</div>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <div className="flex flex-col">
                  <span className="text-[11px] text-subtle">Tore</span>
                  <span className="text-lg font-semibold text-foreground tnum leading-tight">
                    {p.tore}
                  </span>
                  {p.toreNote && <span className="text-xs text-subtle">({p.toreNote})</span>}
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] text-subtle">Zu Null</span>
                  <span className="text-lg font-semibold text-foreground tnum leading-tight">{p.zuNull}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-start gap-3 p-3 bg-info-bg border border-info/30 rounded-control">
          <i className="sap-icon sap-icon-information text-[18px] text-info shrink-0 mt-0.5" />
          <p className="text-info text-sm">
            <strong className="font-semibold">Alles andere</strong>, also Vorlagen, Einsatzminuten, Karten oder Noten, zählt nicht.
          </p>
        </div>
      </section>

      <section className="py-5">
        <SectionTitle icon="sap-icon-hint">Gut zu wissen</SectionTitle>
        <ul className="space-y-2 text-sm text-muted list-disc pl-5 marker:text-subtle">
          <li>Der Joker ist ein ganz normaler Spieler und hat <strong className="font-semibold text-foreground">keinen Zusatzeffekt</strong>, du bist bei ihm nur in der Position frei</li>
          <li>Zu Null Punkte gibt es, sobald der Spieler eingesetzt wurde, auch bei nur <strong className="font-semibold text-foreground">einer Sekunde Spielzeit</strong></li>
          <li>Wechselt ein Spieler innerhalb der Bundesliga den Verein, sammelt er <strong className="font-semibold text-foreground">weiter Punkte</strong> für dich. Nur wer die Liga verlässt, bringt keine Punkte mehr</li>
          <li>In der Winterpause darfst du bis zu <strong className="font-semibold text-foreground">drei Spieler tauschen</strong></li>
        </ul>
      </section>

      <section className="pt-5">
        <SectionTitle icon="sap-icon-money-bills">Mitmachen</SectionTitle>
        <ul className="space-y-2 text-sm text-muted list-disc pl-5 marker:text-subtle">
          <li>Startgebühr: <strong className="font-semibold text-foreground">10 Euro</strong> pro Team</li>
          <li>Anmeldeschluss: <strong className="font-semibold text-foreground">Freitag, 28. August 2026, 20:30 Uhr</strong></li>
          <li>Die Spielerliste findest du online und im <strong className="font-semibold text-foreground">kicker Sonderheft</strong></li>
          <li>Ausgeschüttet wird an die <strong className="font-semibold text-foreground">besten 10 Prozent</strong> aller Teilnehmer</li>
        </ul>
      </section>
    </div>
  )
}
