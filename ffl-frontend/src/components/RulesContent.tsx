const positions = [
  { key: 'GOALKEEPER', label: 'Torwart', edge: 'border-l-goalkeeper', tore: '10', toreNote: 'per Elfmeter 3 Punkte', zuNull: '5' },
  { key: 'DEFENDER', label: 'Abwehr', edge: 'border-l-defender', tore: '7', toreNote: '', zuNull: '2' },
  { key: 'MIDFIELD', label: 'Mittelfeld', edge: 'border-l-midfield', tore: '5', toreNote: '', zuNull: '–' },
  { key: 'STRIKER', label: 'Sturm', edge: 'border-l-striker', tore: '3', toreNote: '', zuNull: '–' },
]

export default function RulesContent() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted leading-relaxed">
        Du stellst aus dem Kader der Bundesliga dein eigenes Team zusammen und sammelst über alle 34 Spieltage Punkte.
        Gewertet wird ausschließlich, was deine Spieler auf dem Platz tatsächlich leisten.
        Bewusst einfach gehalten: keine Spielernoten, keine wöchentlichen Wechsel, kein tägliches Nachjustieren.
        Einmal aufstellen, dann mitfiebern.
      </p>

      <section>
        <h3 className="text-base font-semibold text-foreground mb-3">Dein Kader</h3>
        <ul className="space-y-1.5 text-sm text-muted">
          <li>Budget: 30 Millionen Euro</li>
          <li>Aufstellung: 1 Torwart, 3 Abwehr, 3 Mittelfeld, 3 Sturm</li>
          <li>Dazu 1 Joker auf einer frei wählbaren Feldposition</li>
          <li>Keine Begrenzung, wie viele Spieler du von einem Verein nimmst</li>
          <li>Bis zum Anmeldeschluss kannst du dein Team beliebig oft umbauen</li>
        </ul>
      </section>

      <section>
        <h3 className="text-base font-semibold text-foreground mb-3">
          Punkte gibt es nur für zwei Dinge: Tore und Zu Null
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {positions.map((p) => (
            <div
              key={p.key}
              className={`border-l-4 ${p.edge} bg-surface border border-border rounded-control px-3 py-2.5`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">{p.label}</span>
                <span className="text-[11px] uppercase tracking-wide text-subtle">Punkte</span>
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <div className="flex flex-col">
                  <span className="text-[11px] text-subtle">Tore</span>
                  <span className="text-foreground font-medium">
                    {p.tore}
                    {p.toreNote && <span className="text-xs text-subtle font-normal"> ({p.toreNote})</span>}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] text-subtle">Zu Null</span>
                  <span className="text-foreground font-medium">{p.zuNull}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-start gap-3 p-3 bg-info-bg border border-info/30 rounded-control">
          <i className="sap-icon sap-icon-information text-[18px] text-info shrink-0 mt-0.5" />
          <p className="text-info text-sm">
            Alles andere, also Vorlagen, Einsatzminuten, Karten oder Noten, zählt nicht.
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold text-foreground mb-3">Gut zu wissen</h3>
        <ul className="space-y-1.5 text-sm text-muted">
          <li>Der Joker ist ein ganz normaler Spieler und hat keinen Zusatzeffekt, du bist bei ihm nur in der Position frei</li>
          <li>Zu Null Punkte gibt es, sobald der Spieler eingesetzt wurde, auch bei nur einer Sekunde Spielzeit</li>
          <li>Wechselt ein Spieler innerhalb der Bundesliga den Verein, sammelt er weiter Punkte für dich. Nur wer die Liga verlässt, bringt keine Punkte mehr</li>
          <li>In der Winterpause darfst du bis zu drei Spieler tauschen</li>
        </ul>
      </section>

      <section>
        <h3 className="text-base font-semibold text-foreground mb-3">Mitmachen</h3>
        <ul className="space-y-1.5 text-sm text-muted">
          <li>Startgebühr: 10 Euro pro Team</li>
          <li>Anmeldeschluss: Freitag, 28. August 2026, 20:30 Uhr</li>
          <li>Die Spielerliste findest du online und im kicker Sonderheft</li>
          <li>Ausgeschüttet wird an die besten 10 Prozent aller Teilnehmer</li>
        </ul>
      </section>
    </div>
  )
}
