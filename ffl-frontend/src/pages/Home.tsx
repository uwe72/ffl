import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom'
import { useCurrentManager, useManagersBySeason } from '../hooks/useManagers'
import { useCurrentSeason } from '../hooks/useSeasons'
import { useDashboardAufstellung } from '../hooks/useDashboard'
import { useFavorites, useAddFavorite, useRemoveFavorite, useSetStandard } from '../hooks/useFavorites'
import { useMyGroupsWithStats, useGroupLogo, useSetStandardGroup } from '../hooks/useManagerGroups'
import { useAuth } from '../context/AuthContext'
import useIsMobile from '../hooks/useIsMobile'
import useHorizontalSwipe from '../hooks/useHorizontalSwipe'
import useElementSize from '../hooks/useElementSize'
import ManagerSelect from '../components/ManagerSelect'
import Button from '../components/Button'
import Tabs from '../components/Tabs'
import SegmentedTabs from '../components/SegmentedTabs'
import { TableHead, ThSortable, TableBody } from '../components/Table'
import SortIcon from '../components/SortIcon'
import AufstellungsFeld from '../components/statistik/AufstellungsFeld'
import AufstellungVertikal from '../components/statistik/AufstellungVertikal'
import ScoreLine from '../components/statistik/ScoreLine'
import type { Aufstellung } from '../types/dashboard'
import type { ManagerGroupRoundStats, Manager } from '../types'
import Managers from './Managers'

const EMPTY_AUFSTELLUNG: Aufstellung = {
  phase: 'SAISON',
  spieltag: 0,
  teamname: '',
  punkteGesamt: null,
  punkteSpieltag: null,
  positionGesamt: null,
  positionSpieltag: null,
  teilnehmer: null,
  positionGesamtVorher: null,
  positionSpieltagVorher: null,
  punkteGesamtVorher: null,
  punkteSpieltagVorher: null,
  kaderwert: 0,
  budget: 0,
  spieler: [],
}

function managerLabel(m?: { firstName?: string; lastName?: string; login?: string; shortName?: string; managerName?: string }): string {
  if (!m) return ''
  const fullName = `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim()
  if (fullName && m.login) return `${fullName} (${m.login})`
  if (fullName) return fullName
  if (m.login) return m.login
  return m.shortName ?? m.managerName ?? ''
}

function groupCreatorName(group: { createdByFirstName?: string; createdByLastName?: string; createdByLogin?: string }): string {
  if (group.createdByFirstName && group.createdByLastName) {
    return `${group.createdByFirstName} ${group.createdByLastName} (${group.createdByLogin})`
  }
  return group.createdByLogin || '-'
}

function managerLogin(m: { login?: string; managerName?: string; shortName?: string }): string {
  return m.login ?? m.managerName ?? m.shortName ?? '-'
}

function managerFullName(m: { firstName?: string; lastName?: string; managerName?: string }): string {
  return [m.firstName, m.lastName].filter(Boolean).join(' ') || m.managerName || '-'
}

function HelpRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="w-7 flex items-center justify-center shrink-0">{icon}</span>
      <span className="text-foreground">{children}</span>
    </div>
  )
}

function HomeHelpContent() {
  return (
    <div className="flex flex-col gap-3 text-xs">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Spielerkacheln</p>
        <HelpRow icon={<i className="sap-icon sap-icon-accept ffl-einsatz-ok text-[14px]" />}>
          Einsatz am aktuellen Spieltag
        </HelpRow>
        <HelpRow icon={<i className="sap-icon sap-icon-less text-subtle text-[14px]" />}>
          Spiel steht noch aus
        </HelpRow>
        <HelpRow icon={<i className="sap-icon sap-icon-decline ffl-einsatz-no text-[14px]" />}>
          Kein Einsatz (Spiel beendet)
        </HelpRow>
        <HelpRow
          icon={
            <span className="inline-flex items-center justify-center h-4 px-1.5 text-[10px] font-semibold leading-none whitespace-nowrap rounded-badge bg-success/15 text-success">
              75 %
            </span>
          }
        >
          Einsatzquote ({' '}<span className="text-success">grün</span>: hoch · <span className="text-warning">gelb</span>: mittel · <span className="text-danger">rot</span>: niedrig)
        </HelpRow>
        <HelpRow
          icon={
            <span className="inline-flex items-center justify-center h-5 px-1.5 rounded-badge bg-accent text-white text-[10px] font-bold leading-none">
              42
            </span>
          }
        >
          Punkte gesamt
        </HelpRow>
        <HelpRow
          icon={
            <span
              className="inline-flex items-center justify-center h-5 px-1.5 rounded-badge text-[10px] font-bold leading-none"
              style={{ backgroundColor: 'var(--color-stat-accent)', color: 'var(--color-text-on-accent, #fafaf9)' }}
            >
              +9
            </span>
          }
        >
          Punkte am aktuellen Spieltag
        </HelpRow>
        <p className="text-muted">Karte anklicken zum Umdrehen</p>
      </div>
      <div className="border-t border-border pt-3">
        <HomeHelpOptions />
      </div>
    </div>
  )
}

function HomeHelpTable() {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Tabelle</p>
      <HelpRow
        icon={
          <span className="inline-flex items-center justify-center h-4 px-1.5 text-[10px] font-semibold leading-none whitespace-nowrap rounded-badge bg-success/15 text-success">
            75 %
          </span>
        }
      >
        Einsatzquote (<span className="text-success">grün</span>: hoch · <span className="text-warning">gelb</span>: mittel · <span className="text-danger">rot</span>: niedrig)
      </HelpRow>
      <HelpRow
        icon={
          <span className="inline-flex items-center justify-center h-5 px-1.5 rounded-badge bg-accent text-white text-[10px] font-bold leading-none">
            42
          </span>
        }
      >
        <span className="font-semibold">Punkte</span> – „Ges." = Gesamtpunkte · „Sp." = Punkte des aktuellen Spieltags
      </HelpRow>
      <HelpRow icon={<i className="sap-icon sap-icon-accept ffl-einsatz-ok text-[14px]" />}>
        <span className="font-semibold">Einsatz</span> – „Ges." = Einsätze insgesamt · „Sp." = am aktuellen Spieltag, „√" = gespielt
      </HelpRow>
    </div>
  )
}

function HomeHelpOptions({ mobile = false }: { mobile?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Optionen („…" Button)</p>
      <HelpRow icon={<i className="sap-icon sap-icon-search text-accent text-[14px]" />}>
        <span className="font-semibold">Manager suchen</span> – Über das Suchfeld einen beliebigen Manager wählen und sein Team anzeigen.
      </HelpRow>
      <HelpRow icon={<i className="sap-icon sap-icon-slim-arrow-right text-accent text-[14px]" />}>
        <span className="font-semibold">Team-Wechsler</span> – {mobile
          ? 'Durch Wischen zwischen den Favoriten wechseln; „x / y" oben zeigt die aktuelle Position.'
          : 'Mit den Pfeilen neben dem Titel zwischen den Favoriten wechseln; „x / y“ zeigt die aktuelle Position.'}
      </HelpRow>
      <HelpRow icon={<i className="sap-icon sap-icon-favorite text-accent text-[14px]" />}>
        <span className="font-semibold">Als Favorit / Aus Favoriten entfernen</span> – Manager dauerhaft ins Dashboard holen; Favoriten bleiben beim nächsten Besuch erhalten.
      </HelpRow>
      <HelpRow icon={<i className="sap-icon sap-icon-accept text-accent text-[14px]" />}>
        <span className="font-semibold">Als Standard / Standard entfernen</span> – Einen Favoriten zum Standard-Team machen: Dieses Team ist beim Öffnen des Dashboards vorausgewählt. Ist kein Standard gesetzt, sortiert sich die Reihenfolge der Favoriten nach der Gesamtpunktzahl.
      </HelpRow>
    </div>
  )
}

function GroupsHelpOptions() {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Optionen („…" Button)</p>
      <HelpRow icon={<i className="sap-icon sap-icon-slim-arrow-right text-accent text-[14px]" />}>
        <span className="font-semibold">Gruppen-Wechsler</span> – Durch Wischen zwischen den Gruppen wechseln; „x / y" oben zeigt die aktuelle Position.
      </HelpRow>
      <HelpRow icon={<i className="sap-icon sap-icon-accept text-accent text-[14px]" />}>
        <span className="font-semibold">Als Standard</span> – Die als Standard gesetzte Gruppe wird beim Öffnen des Dashboards vorausgewählt. Über den „..."-Button als Standard setzen; ist die Gruppe bereits Standard, wird dies dort angezeigt.
      </HelpRow>
    </div>
  )
}

function GroupsHelpTable() {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Tabelle</p>
      <HelpRow
        icon={
          <span className="inline-flex items-center justify-center h-5 px-1.5 rounded-badge bg-accent text-white text-[10px] font-bold leading-none">
            1.
          </span>
        }
      >
        <span className="font-semibold">POS</span> – Position in der Liga-Rangliste
      </HelpRow>
      <HelpRow
        icon={
          <span className="inline-flex items-center justify-center h-5 px-1.5 rounded-badge bg-accent text-white text-[10px] font-bold leading-none">
            42
          </span>
        }
      >
        <span className="font-semibold">Punkte</span> – „GES." = Gesamtpunkte · „Sp." = Punkte des aktuellen Spieltags
      </HelpRow>
      <HelpRow icon={<i className="sap-icon sap-icon-employee text-accent text-[14px]" />}>
        <span className="font-semibold">Manager</span> – Über den Login-Namen gelangst du zur Manager-Detailseite; die eigene Zeile ist hervorgehoben.
      </HelpRow>
    </div>
  )
}

function ManagersHelpOptions() {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Optionen</p>
      <HelpRow icon={<i className="sap-icon sap-icon-account text-accent text-[14px]" />}>
        <span className="font-semibold">Selektiere mich</span> – Sprung zur eigenen Zeile: hebt deine Zeile hervor und scrollt direkt zu ihr.
      </HelpRow>
      <HelpRow icon={<i className="sap-icon sap-icon-sort text-accent text-[14px]" />}>
        <span className="font-semibold">Sortierung</span> – Zwischen „Position" (Ranglistenplatz) und „Spieltagspunkte" wechseln.
      </HelpRow>
    </div>
  )
}

type GroupManagerSortKey = 'shortName' | 'firstName' | 'lastName' | 'positionTotal' | 'positionChange' | 'pointsTotal' | 'pointsLastRound' | 'einsatzquote'

function GroupHomeCard({ group, canNavigateToManager, isBeforeSeason, matchdayLabel, showCarouselNav, carouselPosition, onPrev, onNext }: {
  group: ManagerGroupRoundStats
  canNavigateToManager: boolean
  isBeforeSeason: boolean
  matchdayLabel: string
  showCarouselNav: boolean
  carouselPosition: string | null
  onPrev: () => void
  onNext: () => void
}) {
  const { data: logoUrl } = useGroupLogo(group.hasLogo ? group.groupId : null)
  const creatorName =
    group.createdByFirstName && group.createdByLastName
      ? `${group.createdByFirstName} ${group.createdByLastName} (${group.createdByLogin})`
      : group.createdByLogin || '-'
  const [sortKey, setSortKey] = useState<GroupManagerSortKey>('positionTotal')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: GroupManagerSortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const sortedManagers = useMemo(() => {
    if (!group.managers) return []
    return [...group.managers].sort((a, b) => {
      let comparison = 0
      switch (sortKey) {
        case 'shortName':
          comparison = (a.shortName || '').localeCompare(b.shortName || '')
          break
        case 'firstName':
          comparison = (a.firstName || '').localeCompare(b.firstName || '')
          break
        case 'lastName':
          comparison = (a.lastName || '').localeCompare(b.lastName || '')
          break
        case 'positionTotal':
          comparison = (a.positionTotal ?? 999) - (b.positionTotal ?? 999)
          break
        case 'positionChange':
          comparison = (a.positionChange ?? 0) - (b.positionChange ?? 0)
          break
        case 'pointsTotal':
          comparison = (b.pointsTotal ?? 0) - (a.pointsTotal ?? 0)
          break
        case 'pointsLastRound':
          comparison = (b.pointsLastRound ?? 0) - (a.pointsLastRound ?? 0)
          break
        case 'einsatzquote':
          comparison = (a.einsatzquote ?? 0) - (b.einsatzquote ?? 0)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [group.managers, sortKey, sortOrder])

  return (
    <div className="p-6 bg-surface border border-border rounded-card w-fit max-w-full flex-1 min-h-0 flex flex-col">
      <div className="flex items-center gap-2 flex-wrap mb-4 shrink-0">
        {showCarouselNav && (
          <button
            type="button"
            onClick={onPrev}
            aria-label="Vorherige Gruppe"
            title="Vorherige Gruppe"
            className="w-9 h-9 rounded-control border border-border-strong text-accent hover:bg-accent-muted flex items-center justify-center transition-colors"
          >
            <i className="sap-icon sap-icon-slim-arrow-left text-sm" />
          </button>
        )}
        {showCarouselNav && (
          <button
            type="button"
            onClick={onNext}
            aria-label="Nächste Gruppe"
            title="Nächste Gruppe"
            className="w-9 h-9 rounded-control border border-border-strong text-accent hover:bg-accent-muted flex items-center justify-center transition-colors"
          >
            <i className="sap-icon sap-icon-slim-arrow-right text-sm" />
          </button>
        )}
        {showCarouselNav && carouselPosition && (
          <span className="text-sm text-muted whitespace-nowrap tabular-nums min-w-[2.5rem] text-center">
            {carouselPosition}
          </span>
        )}
        <h3 className="text-xl font-semibold text-foreground min-w-0 group relative">
          <span className="truncate block">{group.groupName}</span>
          {(logoUrl || group.description || creatorName !== '-') && (
            <span className="absolute left-0 top-full mt-2 z-50 w-72 bg-surface border border-border rounded-card shadow-xl p-3 flex flex-col gap-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              {logoUrl && (
                <img src={logoUrl} alt={group.groupName} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
              )}
              {group.description && (
                <p className="text-sm text-muted">{group.description}</p>
              )}
              {creatorName !== '-' && (
                <p className="text-xs text-muted">
                  <span className="text-foreground font-medium">Ersteller:</span> {creatorName}
                </p>
              )}
            </span>
          )}
        </h3>
      </div>
        <div className="flex-1 min-h-0 overflow-auto rounded-card border border-border w-fit max-w-full">
        <table className="w-full max-w-[1100px]">
          <TableHead>
            <tr>
              {!isBeforeSeason && (
                <ThSortable align="center" onClick={() => handleSort('positionTotal')}>
                  Pos<SortIcon column="positionTotal" activeKey={sortKey} order={sortOrder} />
                </ThSortable>
              )}
              {!isBeforeSeason && (
                <ThSortable align="center" onClick={() => handleSort('positionChange')}>
                  +-<SortIcon column="positionChange" activeKey={sortKey} order={sortOrder} />
                </ThSortable>
              )}
              <ThSortable align="left" onClick={() => handleSort('shortName')}>
                Manager<SortIcon column="shortName" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
              <ThSortable align="left" onClick={() => handleSort('firstName')}>
                Vorname<SortIcon column="firstName" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
              <ThSortable align="left" onClick={() => handleSort('lastName')}>
                Nachname<SortIcon column="lastName" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
              {!isBeforeSeason && (
                <ThSortable align="center" onClick={() => handleSort('pointsTotal')}>
                  Punkte<SortIcon column="pointsTotal" activeKey={sortKey} order={sortOrder} />
                </ThSortable>
              )}
              {!isBeforeSeason && (
                <ThSortable align="center" onClick={() => handleSort('pointsLastRound')}>
                  {matchdayLabel}<SortIcon column="pointsLastRound" activeKey={sortKey} order={sortOrder} />
                </ThSortable>
              )}
              {!isBeforeSeason && (
                <ThSortable align="center" onClick={() => handleSort('einsatzquote')}>
                  Einsatzquote<SortIcon column="einsatzquote" activeKey={sortKey} order={sortOrder} />
                </ThSortable>
              )}
            </tr>
          </TableHead>
          <TableBody>
            {sortedManagers.map((m, index) => {
              const isMe = m.isCurrentUser
              return (
              <tr key={m.managerId} className={`hover:bg-card-hover border-b border-border ${isMe ? 'border-l-2 border-l-on-dark row-selected font-semibold' : ''} ${index % 2 === 1 ? 'bg-zebra' : ''}`}>
                {!isBeforeSeason && (
                  <td className="px-3 py-2 text-center font-medium text-foreground">
                    {m.positionTotal ? `${m.positionTotal}.` : '-'}
                  </td>
                )}
                {!isBeforeSeason && (
                  <td className="px-3 py-2 text-center">
                    {m.positionChange != null && m.positionChange !== 0 ? (
                      <span className={`${m.positionChange > 0 ? 'text-success' : 'text-danger'}`}>
                        {m.positionChange > 0 ? `↑${m.positionChange}` : `↓${Math.abs(m.positionChange)}`}
                      </span>
                    ) : (
                      <span className="text-subtle">-</span>
                    )}
                  </td>
                )}
                <td className="px-3 py-2 max-w-[220px]">
                  {canNavigateToManager ? (
                    <RouterLink
                      to={`/managers/${m.managerId}`}
                      className="link font-medium truncate block min-w-0"
                      title={m.shortName || m.managerName}
                    >
                      {m.shortName || '-'}
                    </RouterLink>
                  ) : (
                    <span className="font-medium text-foreground truncate block min-w-0" title={m.shortName || m.managerName}>
                      {m.shortName || '-'}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-muted">
                  {m.firstName || '-'}
                </td>
                <td className="px-3 py-2 text-muted">
                  {m.lastName || '-'}
                </td>
                {!isBeforeSeason && (
                  <td className="px-3 py-2 text-center font-bold text-foreground">
                    {m.pointsTotal ?? '-'}
                  </td>
                )}
                {!isBeforeSeason && (
                  <td className="px-3 py-2 text-center text-muted">
                    {m.pointsLastRound ?? '-'}
                  </td>
                )}
                {!isBeforeSeason && (
                  <td className="px-3 py-2 text-center text-foreground tabular-nums">
                    {m.einsatzquote != null ? `${m.einsatzquote} %` : '-'}
                  </td>
                )}
              </tr>
              )
            })}
            {sortedManagers.length === 0 && (
              <tr>
                <td colSpan={isBeforeSeason ? 3 : 8} className="text-center text-subtle py-8">
                  Keine Manager in dieser Gruppe
                </td>
              </tr>
            )}
          </TableBody>
        </table>
      </div>
    </div>
  )
}

function GroupMobileTable({ group, canNavigateToManager, headerTitle }: { group: ManagerGroupRoundStats, canNavigateToManager: boolean, headerTitle: string }) {
  const th = 'px-2 py-2 text-[12px] font-semibold uppercase tracking-wider text-muted border-b border-border whitespace-nowrap'
  const td = 'px-2 py-2 border-b border-border overflow-hidden tabular-nums'
  return (
    <div className="overflow-x-auto rounded-card w-full" style={{ touchAction: 'pan-y' }}>
      <table className="w-full border-collapse text-sm table-fixed">
        <colgroup>
          <col className="w-9" />
          <col className="w-auto" />
          <col className="w-auto" />
          <col className="w-9" />
          <col className="w-9" />
        </colgroup>
        <thead className="bg-elevated sticky top-0">
          <tr>
            <th colSpan={3} align="left" className={th}>
              {headerTitle}
            </th>
            <th colSpan={2} align="center" className={th}>
              Punkte
            </th>
          </tr>
          <tr>
            <th align="center" className={th}>POS</th>
            <th align="left" className={th}>Manager</th>
            <th align="left" className={th}>Name</th>
            <th align="center" className={th}>GES.</th>
            <th align="center" className={th}>Sp.</th>
          </tr>
        </thead>
        <tbody className="bg-surface">
          {[...group.managers]
            .sort((a, b) => (a.positionTotal ?? 999) - (b.positionTotal ?? 999))
            .map((m, index) => {
              const isMe = m.isCurrentUser
              return (
              <tr key={m.managerId} className={`hover:bg-card-hover border-b border-border ${isMe ? 'border-l-2 border-l-on-dark row-selected font-semibold' : ''} ${index % 2 === 1 ? 'bg-zebra' : ''}`}>
                <td className={`${td} text-center font-medium text-foreground`}>
                  {m.positionTotal ? `${m.positionTotal}.` : '-'}
                </td>
                <td className={`${td} min-w-0`}>
                  {canNavigateToManager ? (
                    <RouterLink
                      to={`/managers/${m.managerId}`}
                      className="link font-medium truncate block min-w-0"
                      title={m.login ?? m.managerName}
                    >
                      {managerLogin(m)}
                    </RouterLink>
                  ) : (
                    <span className="font-medium text-foreground truncate block min-w-0" title={m.login ?? m.managerName}>
                      {managerLogin(m)}
                    </span>
                  )}
                </td>
                <td className={`${td} min-w-0`}>
                  <span className="text-foreground truncate block min-w-0" title={managerLabel(m)}>
                    {managerFullName(m)}
                  </span>
                </td>
                <td className={`${td} text-center font-bold text-foreground`}>
                  {m.pointsTotal ?? '-'}
                </td>
                <td className={`${td} text-center text-muted`}>
                  {m.pointsLastRound ?? '-'}
                </td>
              </tr>
              )
            })}
          {group.managers.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center text-subtle py-8">
                Keine Manager in dieser Gruppe
              </td>
            </tr>
          )}
        </tbody>
        </table>
    </div>
  )
}

type ManagersMobileSortKey = 'positionTotal' | 'pointsLastRound'

const SORT_TITLES: Record<ManagersMobileSortKey, string> = {
  positionTotal: 'Sortierung: Position',
  pointsLastRound: 'Sortierung: Spieltagspunkte',
}

const SORT_NEXT: Record<ManagersMobileSortKey, ManagersMobileSortKey> = {
  positionTotal: 'pointsLastRound',
  pointsLastRound: 'positionTotal',
}

function ManagersMobileTable({ managers, canNavigateToManager, headerTitle, selected, myManagerId, rowRef, sortKey }: {
  managers: Manager[]
  canNavigateToManager: boolean
  headerTitle: string
  selected: boolean
  myManagerId: number | undefined
  rowRef: React.RefObject<HTMLTableRowElement | null>
  sortKey: ManagersMobileSortKey
}) {
  const th = 'px-2 py-2 text-[12px] font-semibold uppercase tracking-wider text-muted border-b border-border whitespace-nowrap'
  const td = 'px-2 py-2 border-b border-border overflow-hidden tabular-nums'
  const sorted = useMemo(() => {
    return [...(managers ?? [])].sort((a, b) => {
      if (sortKey === 'pointsLastRound') {
        const diff = (b.pointsLastRound ?? 0) - (a.pointsLastRound ?? 0)
        if (diff !== 0) return diff
        return (a.positionTotal ?? 999) - (b.positionTotal ?? 999)
      }
      return (a.positionTotal ?? 999) - (b.positionTotal ?? 999)
    })
  }, [managers, sortKey])
  return (
    <div className="overflow-x-auto rounded-card w-full" style={{ touchAction: 'pan-y' }}>
      <table className="w-full border-collapse text-sm table-fixed">
        <colgroup>
          <col className="w-9" />
          <col className="w-auto" />
          <col className="w-auto" />
          <col className="w-9" />
          <col className="w-9" />
        </colgroup>
        <thead className="bg-elevated sticky top-0">
          <tr>
            <th colSpan={3} align="left" className={th}>
              {headerTitle}
            </th>
            <th colSpan={2} align="center" className={th}>
              Punkte
            </th>
          </tr>
          <tr>
            <th align="center" className={th}>POS</th>
            <th align="left" className={th}>Manager</th>
            <th align="left" className={th}>Name</th>
            <th align="center" className={th}>GES.</th>
            <th align="center" className={th}>Sp.</th>
          </tr>
        </thead>
        <tbody className="bg-surface">
          {sorted.map((m, index) => {
            const isMe = selected && myManagerId != null && m.id === myManagerId
            return (
            <tr
              key={m.id}
              ref={isMe ? rowRef : undefined}
              className={`hover:bg-card-hover border-b border-border ${isMe ? 'border-l-2 border-l-on-dark row-selected font-semibold' : ''} ${index % 2 === 1 ? 'bg-zebra' : ''}`}
            >
              <td className={`${td} text-center font-medium text-foreground`}>
                {m.positionTotal ? `${m.positionTotal}.` : '-'}
              </td>
              <td className={`${td} min-w-0`}>
                {canNavigateToManager ? (
                  <RouterLink
                    to={`/managers/${m.id}`}
                    className="link font-medium truncate block min-w-0"
                    title={m.login ?? m.shortName ?? m.name}
                  >
                    {managerLogin(m)}
                  </RouterLink>
                ) : (
                  <span className="font-medium text-foreground truncate block min-w-0" title={m.login ?? m.shortName ?? m.name}>
                    {managerLogin(m)}
                  </span>
                )}
              </td>
              <td className={`${td} min-w-0`}>
                <span className="text-foreground truncate block min-w-0" title={managerLabel(m)}>
                  {managerFullName(m)}
                </span>
              </td>
              <td className={`${td} text-center font-bold text-foreground`}>
                {m.pointsTotal ?? '-'}
              </td>
              <td className={`${td} text-center text-muted`}>
                {m.pointsLastRound ?? '-'}
              </td>
            </tr>
            )
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center text-subtle py-8">
                Keine Manager gefunden
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function ManagersMobilePanel({ managers, canNavigateToManager, headerTitle }: {
  managers: Manager[]
  canNavigateToManager: boolean
  headerTitle: string
}) {
  const { user } = useAuth()
  const { data: currentManager } = useCurrentManager()
  const { data: season } = useCurrentSeason()
  const [searchTerm, setSearchTerm] = useState('')
  const [selected, setSelected] = useState(false)
  const [sortKey, setSortKey] = useState<ManagersMobileSortKey>('positionTotal')
  const [helpOpen, setHelpOpen] = useState(false)
  const rowRef = useRef<HTMLTableRowElement | null>(null)

  const isAdmin = user?.role === 'ADMIN'
  const fallbackManager = useMemo(() => managers?.find(m => m.shortName === season?.adminFallbackUser), [managers, season])
  const myManagerId = isAdmin ? fallbackManager?.id : currentManager?.id

  const filteredManagers = useMemo(() => {
    if (!managers) return []
    const term = searchTerm.toLowerCase()
    return managers.filter(m =>
      !term ||
      m.name?.toLowerCase().includes(term) ||
      m.shortName?.toLowerCase().includes(term) ||
      m.firstName?.toLowerCase().includes(term) ||
      m.lastName?.toLowerCase().includes(term)
    )
  }, [managers, searchTerm])

  const hasActiveFilter = searchTerm !== ''

  const handleSelectMe = () => {
    if (selected) {
      setSelected(false)
      return
    }
    if (searchTerm !== '') setSearchTerm('')
    setSelected(true)
  }

  useEffect(() => {
    if (!selected || myManagerId == null) return
    const el = rowRef.current
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [selected, myManagerId, searchTerm, filteredManagers])

  useEffect(() => {
    if (!helpOpen) return
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHelpOpen(false)
    }
    document.addEventListener('keydown', keyHandler)
    return () => document.removeEventListener('keydown', keyHandler)
  }, [helpOpen])

  return (
    <div className="flex flex-col gap-0">
      <div className="p-6 bg-surface border border-border rounded-card px-3 py-3 mb-1">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground shrink-0">Manager ({filteredManagers.length})</h3>
            <div className="relative flex-1 min-w-0">
              <i className="sap-icon sap-icon-search text-[14px] absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Manager suchen..."
                className="input-field control pl-8 pr-3 py-2 rounded-control text-sm w-full"
              />
            </div>
            {myManagerId != null && (
              <button
                type="button"
                onClick={handleSelectMe}
                aria-label="Selektiere mich"
                title="Selektiere mich"
                className="shrink-0 w-[38px] h-[38px] rounded-control border border-border-strong text-subtle hover:bg-accent-muted flex items-center justify-center transition-colors"
              >
                <i className="sap-icon sap-icon-account text-[14px]" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setSortKey(SORT_NEXT[sortKey])}
              aria-label={SORT_TITLES[sortKey]}
              title={SORT_TITLES[sortKey]}
              className="shrink-0 w-[38px] h-[38px] rounded-control border border-border-strong text-subtle hover:bg-accent-muted flex items-center justify-center transition-colors"
            >
              <i className="sap-icon sap-icon-sort text-[14px]" />
            </button>
            <Button
              onClick={() => setHelpOpen(o => !o)}
              size="input"
              variant="secondary"
              className="shrink-0 w-[38px] h-[38px] px-0"
              aria-expanded={helpOpen}
              aria-label="Hilfe"
              title="Hilfe"
            >
              <i className="sap-icon sap-icon-question-mark text-[14px]" />
            </Button>
          </div>
          {hasActiveFilter && (
            <button
              onClick={() => setSearchTerm('')}
              className="self-start flex items-center gap-1.5 p-1 rounded-control text-subtle hover:text-danger transition-colors"
              title="Filter zurücksetzen"
            >
              <i className="sap-icon sap-icon-decline text-[14px]" />
              <span className="text-sm">Filter zurücksetzen</span>
            </button>
          )}
        </div>
      </div>
      {helpOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={() => setHelpOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="bg-surface border border-border rounded-card shadow-2xl w-full max-w-sm p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col gap-3 text-xs">
              <ManagersHelpOptions />
            </div>
            <div className="border-t border-border pt-3 mt-3">
              <Button variant="ghost" size="input" className="w-full" onClick={() => setHelpOpen(false)}>
                <i className="sap-icon sap-icon-decline text-sm" />
                Fenster schließen
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="p-2 bg-surface border border-border rounded-card">
        <ManagersMobileTable
          managers={filteredManagers}
          canNavigateToManager={canNavigateToManager}
          headerTitle={headerTitle}
          selected={selected}
          myManagerId={myManagerId}
          rowRef={rowRef}
          sortKey={sortKey}
        />
      </div>
    </div>
  )
}

export default function Home() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const { data: season } = useCurrentSeason()
  const { data: currentManager } = useCurrentManager()
  const { data: managers } = useManagersBySeason(season?.id ?? 0)
  const { data: favorites } = useFavorites(season?.id ?? 0)
  const addFavorite = useAddFavorite(season?.id ?? 0)
  const removeFavorite = useRemoveFavorite(season?.id ?? 0)
  const setStandard = useSetStandard(season?.id ?? 0)

  const [activeManagerId, setActiveManagerId] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [carouselError, setCarouselError] = useState('')
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null)
  const [groupMenuOpen, setGroupMenuOpen] = useState(false)
  const [groupHelpOpen, setGroupHelpOpen] = useState(false)
  const [groupError, setGroupError] = useState('')
  const groupMenuRef = useRef<HTMLDivElement>(null)
  const spielerWrapRef = useRef<HTMLDivElement>(null)
  const spielerWrapSize = useElementSize(spielerWrapRef)
  const spielerMaxWidth = spielerWrapSize ? Math.min(spielerWrapSize.width, 1300) - 48 : undefined

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        setHelpOpen(false)
      }
      if (groupMenuRef.current && !groupMenuRef.current.contains(e.target as Node)) {
        setGroupMenuOpen(false)
        setGroupHelpOpen(false)
      }
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        setHelpOpen(false)
        setGroupMenuOpen(false)
        setGroupHelpOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [])

  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab: 'spieler' | 'gruppen' | 'manager' =
    searchParams.get('tab') === 'gruppen' ? 'gruppen' : searchParams.get('tab') === 'manager' ? 'manager' : 'spieler'
  const { data: myGroups, isLoading: groupsLoading } = useMyGroupsWithStats(activeTab === 'gruppen')
  const setStandardGroup = useSetStandardGroup()

  const handleTabChange = (key: string) => {
    if (key === 'gruppen') setSearchParams({ tab: 'gruppen' }, { replace: false })
    else if (key === 'manager') setSearchParams({ tab: 'manager' }, { replace: false })
    else setSearchParams({}, { replace: false })
  }

  useEffect(() => {
    if (!isAuthenticated) navigate('/login')
  }, [isAuthenticated, navigate])

  const isAdmin = user?.role === 'ADMIN'
  const isBeforeSeason = season?.seasonState === 'BEFORE_SEASON'
  const carouselEnabled = isAdmin || !isBeforeSeason

  const favoriteList = favorites ?? []
  const standardId = favoriteList.find(f => f.standard)?.friendManagerId ?? null
  const ownManagerId = currentManager?.id ?? null

  const sortByPoints = (ids: number[]) => {
    const points = new Map((managers ?? []).map(m => [m.id, m.pointsTotal ?? 0]))
    return [...ids].sort((a, b) => (points.get(b) ?? 0) - (points.get(a) ?? 0))
  }

  const favoriteManagerIds = useMemo(() => {
    const ids = favoriteList.map(f => f.friendManagerId)
    if (standardId != null) return ids
    return sortByPoints(ids)
  }, [favoriteList, managers, standardId])

  useEffect(() => {
    if (!carouselEnabled) {
      if (activeManagerId !== ownManagerId) setActiveManagerId(ownManagerId ?? null)
      return
    }
    if (activeManagerId != null) return
    const def = standardId ?? (favoriteManagerIds.length > 0 ? favoriteManagerIds[0] : null)
    setActiveManagerId(def)
  }, [carouselEnabled, favoriteManagerIds, ownManagerId, standardId, activeManagerId])

  const activeManager = useMemo(
    () => managers?.find(m => m.id === activeManagerId),
    [managers, activeManagerId]
  )
  const isOwnTeam = ownManagerId != null && activeManagerId === ownManagerId
  const isFavorite = favoriteManagerIds.includes(activeManagerId ?? -1)
  const isStandard = standardId != null && activeManagerId === standardId

  const aufstellungQuery = useDashboardAufstellung(activeManagerId ?? 0)

  const activeIndex = favoriteManagerIds.indexOf(activeManagerId ?? -1)
  const carouselPosition =
    activeIndex >= 0 && favoriteManagerIds.length > 1
      ? `${activeIndex + 1}/${favoriteManagerIds.length}`
      : null
  const carouselPrev = () => {
    if (favoriteManagerIds.length === 0) return
    const idx = activeIndex
    const pi = idx === -1 ? favoriteManagerIds.length - 1 : (idx - 1 + favoriteManagerIds.length) % favoriteManagerIds.length
    setActiveManagerId(favoriteManagerIds[pi])
  }
  const carouselNext = () => {
    if (favoriteManagerIds.length === 0) return
    const idx = activeIndex
    const ni = idx === -1 ? 0 : (idx + 1) % favoriteManagerIds.length
    setActiveManagerId(favoriteManagerIds[ni])
  }

  const swipe = useHorizontalSwipe(carouselNext, carouselPrev)

  const handleToggleFavorite = async () => {
    setCarouselError('')
    if (!activeManagerId) return
    try {
      if (isFavorite) {
        await removeFavorite.mutateAsync(activeManagerId)
        setActiveManagerId(null)
      } else {
        await addFavorite.mutateAsync(activeManagerId)
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: string } }
      setCarouselError(axiosErr.response?.data && typeof axiosErr.response.data === 'string'
        ? axiosErr.response.data
        : 'Favorit konnte nicht aktualisiert werden.')
    }
  }

  const handleSetStandard = async () => {
    setCarouselError('')
    if (!activeManagerId) return
    try {
      await setStandard.mutateAsync(activeManagerId)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: string } }
      setCarouselError(axiosErr.response?.data && typeof axiosErr.response.data === 'string'
        ? axiosErr.response.data
        : 'Standard-Team konnte nicht aktualisiert werden.')
    }
  }

  const handleRemoveStandard = async () => {
    setCarouselError('')
    try {
      await setStandard.mutateAsync(null)
      setActiveManagerId(sortByPoints(favoriteList.map(f => f.friendManagerId))[0] ?? null)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: string } }
      setCarouselError(axiosErr.response?.data && typeof axiosErr.response.data === 'string'
        ? axiosErr.response.data
        : 'Standard-Team konnte nicht aktualisiert werden.')
    }
  }

  const displayAufstellung: Aufstellung | null = aufstellungQuery.data ?? null
  const isVorsaison = displayAufstellung?.phase === 'VORSAISON'
  const feldModus: 'gesamt' | 'wert' = isVorsaison ? 'wert' : 'gesamt'

  const title = managerLabel(activeManager) || 'Team auswählen'
  const showCarouselNav = carouselEnabled && favoriteManagerIds.length > 1

  const canNavigateToManager = isAdmin || !isBeforeSeason
  const groupHeaderTitle = season?.seasonState === 'BEFORE_SEASON'
    ? 'Kader'
    : `${season?.currentMatchday ?? 1}. Spieltag`

  const sortedGroups = useMemo(() => {
    if (!myGroups) return []
    const stdId = myGroups.find(g => g.standard)?.groupId ?? null
    return [...myGroups].sort((a, b) => {
      const aStd = a.groupId === stdId ? 0 : 1
      const bStd = b.groupId === stdId ? 0 : 1
      if (aStd !== bStd) return aStd - bStd
      return (a.groupName || '').localeCompare(b.groupName || '')
    })
  }, [myGroups])

  const standardGroupId = sortedGroups.find(g => g.standard)?.groupId ?? null

  useEffect(() => {
    if (sortedGroups.length === 0) return
    if (activeGroupId == null || !sortedGroups.some(g => g.groupId === activeGroupId)) {
      setActiveGroupId(sortedGroups[0].groupId)
    }
  }, [sortedGroups, activeGroupId])

  const activeGroup = sortedGroups.find(g => g.groupId === activeGroupId) ?? sortedGroups[0]
  const activeGroupIndex = sortedGroups.findIndex(g => g.groupId === activeGroup?.groupId)
  const showGroupCarouselNav = sortedGroups.length > 1
  const groupCarouselPosition = showGroupCarouselNav ? `${activeGroupIndex + 1}/${sortedGroups.length}` : null

  const groupPrev = () => {
    if (sortedGroups.length === 0) return
    const pi = activeGroupIndex === -1 ? sortedGroups.length - 1 : (activeGroupIndex - 1 + sortedGroups.length) % sortedGroups.length
    setActiveGroupId(sortedGroups[pi].groupId)
  }
  const groupNext = () => {
    if (sortedGroups.length === 0) return
    const ni = activeGroupIndex === -1 ? 0 : (activeGroupIndex + 1) % sortedGroups.length
    setActiveGroupId(sortedGroups[ni].groupId)
  }
  const groupSwipe = useHorizontalSwipe(groupNext, groupPrev)

  const handleSetStandardGroup = async () => {
    setGroupError('')
    if (activeGroupId == null) return
    try {
      await setStandardGroup.mutateAsync(activeGroupId)
      setGroupMenuOpen(false)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: string } }
      setGroupError(axiosErr.response?.data && typeof axiosErr.response.data === 'string'
        ? axiosErr.response.data
        : 'Standard-Gruppe konnte nicht aktualisiert werden.')
    }
  }

  const renderGroups = () =>
    groupsLoading ? (
      <div className="p-6 bg-surface border border-border rounded-card text-center text-muted text-sm">
        Lade Gruppen…
      </div>
    ) : !sortedGroups.length ? (
      <div className="p-6 bg-info-bg border border-info/30 rounded-card">
        <div className="flex gap-3 items-start text-left">
          <i className="sap-icon sap-icon-information text-[18px] text-info shrink-0 mt-0.5" />
          <div className="text-sm text-muted">
            <p>
              Mit einer Manager‑Gruppe vergleichst du dich mit einem eigenen, kleinen Kreis
              statt mit der ganzen Liga, zum Beispiel mit Freunden oder Kollegen. Eure
              Rangliste taucht auch in der Spieltagsmail auf.
            </p>
            <p className="mt-2">
              <RouterLink className="link" to="/manager-groups">Hier</RouterLink> kannst du deine erste Gruppe anlegen.
            </p>
          </div>
        </div>
      </div>
    ) : (
      activeGroup && (
        <GroupHomeCard
          group={activeGroup}
          canNavigateToManager={canNavigateToManager}
          isBeforeSeason={isBeforeSeason}
          matchdayLabel={groupHeaderTitle}
          showCarouselNav={showGroupCarouselNav}
          carouselPosition={groupCarouselPosition}
          onPrev={groupPrev}
          onNext={groupNext}
        />
      )
    )

  const renderMobileGroups = () =>
    groupsLoading ? (
      <div className="p-6 bg-surface border border-border rounded-card text-center text-muted text-sm">
        Lade Gruppen…
      </div>
    ) : !sortedGroups.length ? (
      <div className="p-6 bg-info-bg border border-info/30 rounded-card">
        <div className="flex gap-3 items-start text-left">
          <i className="sap-icon sap-icon-information text-[18px] text-info shrink-0 mt-0.5" />
          <div className="text-sm text-muted">
            <p>
              Mit einer Manager‑Gruppe vergleichst du dich mit einem eigenen, kleinen Kreis
              statt mit der ganzen Liga, zum Beispiel mit Freunden oder Kollegen. Eure
              Rangliste taucht auch in der Spieltagsmail auf.
            </p>
            <p className="mt-2">
              <RouterLink className="link" to="/manager-groups">Hier</RouterLink> kannst du deine erste Gruppe anlegen.
            </p>
          </div>
        </div>
      </div>
    ) : (
      <div {...groupSwipe} className="flex flex-col gap-0 flex-1" style={{ touchAction: 'pan-y' }}>
        <div className="p-6 bg-surface border border-border rounded-card px-3 py-0.5 mb-1">
          <div className="relative z-20 shrink-0 mb-1">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold text-foreground truncate">
                  <span className="font-semibold text-foreground truncate">{activeGroup?.groupName ?? ''}</span>
                </div>
                {activeGroup && (
                  <div className="mt-0.5 text-xs text-muted leading-relaxed">
                    <span className="text-foreground">Ersteller:</span> {groupCreatorName(activeGroup)}
                  </div>
                )}
              </div>
              <div className="relative shrink-0">
                <div className="flex items-center gap-2">
                  {showGroupCarouselNav && groupCarouselPosition && (
                    <span className="text-sm text-muted whitespace-nowrap tabular-nums">
                      {groupCarouselPosition.replace('/', ' / ')}
                    </span>
                  )}
                  <div className="relative flex items-center gap-2" ref={groupMenuRef}>
                    {showGroupCarouselNav && (
                      <button
                        type="button"
                        onClick={() => { setGroupHelpOpen(false); setGroupMenuOpen(o => !o) }}
                        aria-label="Mehr Optionen"
                        title="Mehr Optionen"
                        className={`w-8 h-8 rounded-control border border-border-strong flex items-center justify-center transition-colors ${groupMenuOpen ? 'text-accent bg-accent-soft' : 'text-subtle hover:bg-accent-muted'}`}
                      >
                        <i className="sap-icon sap-icon-overflow text-sm" />
                      </button>
                    )}
                    {groupMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-surface border border-border rounded-card shadow-xl p-3 flex flex-col gap-3">
                        {showGroupCarouselNav && activeGroup && activeGroup.groupId === standardGroupId && (
                          <div className="text-center text-xs text-subtle">Diese Gruppe ist bereits Standard.</div>
                        )}
                        {showGroupCarouselNav && activeGroup && activeGroup.groupId !== standardGroupId && (
                          <Button variant="transparent" size="input" onClick={handleSetStandardGroup}>
                            Als Standard
                          </Button>
                        )}
                        <div className="border-t border-border pt-3">
                          <Button variant="ghost" size="input" className="w-full" onClick={() => setGroupMenuOpen(false)}>
                            <i className="sap-icon sap-icon-decline text-sm" />
                            Fenster schließen
                          </Button>
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => { setGroupMenuOpen(false); setGroupHelpOpen(o => !o) }}
                      aria-expanded={groupHelpOpen}
                      aria-label="Hilfe"
                      title="Hilfe"
                      className={`w-8 h-8 rounded-control border border-border-strong flex items-center justify-center transition-colors ${groupHelpOpen ? 'text-accent bg-accent-soft' : 'bg-secondary text-secondary-foreground hover:bg-card-hover'}`}
                    >
                      <i className="sap-icon sap-icon-question-mark text-sm" />
                    </button>
                    {groupHelpOpen && (
                      <div
                        className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
                        onClick={() => setGroupHelpOpen(false)}
                      >
                        <div
                          role="dialog"
                          aria-modal="true"
                          className="bg-surface border border-border rounded-card shadow-2xl w-full max-w-sm p-4"
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="flex flex-col gap-3 text-xs">
                            {showGroupCarouselNav && <GroupsHelpOptions />}
                            <div className={showGroupCarouselNav ? 'border-t border-border pt-3' : ''}>
                              <GroupsHelpTable />
                            </div>
                          </div>
                          <div className="border-t border-border pt-3 mt-3">
                            <Button variant="ghost" size="input" className="w-full" onClick={() => setGroupHelpOpen(false)}>
                              <i className="sap-icon sap-icon-decline text-sm" />
                              Fenster schließen
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {groupError && (
            <div className="flex items-center gap-3 p-3 bg-danger-bg border border-danger/30 rounded-card mt-2">
              <i className="sap-icon sap-icon-alert text-[18px] text-danger shrink-0" />
              <p className="text-danger text-sm">{groupError}</p>
            </div>
          )}
        </div>
        {activeGroup && (
          <div className="p-2 bg-surface border border-border rounded-card">
            <GroupMobileTable group={activeGroup} canNavigateToManager={canNavigateToManager} headerTitle={groupHeaderTitle} />
          </div>
        )}
      </div>
    )

  const card = (children: ReactNode, fill = false) => (
    <div
      className={`p-6 bg-surface border border-border rounded-card${isMobile ? ' px-3 py-0.5 mb-1' : ''}${fill ? ' h-full w-fit self-start flex flex-col min-h-0 max-w-[1300px] overflow-y-auto' : ''}`}
    >
      <div className={`relative z-20 shrink-0${isMobile ? ' mb-1' : ' mb-4'}`}>
        {isMobile ? (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold text-foreground truncate">
                {activeManager
                  ? `${activeManager.firstName ?? ''} ${activeManager.lastName ?? ''}`.trim() || activeManager.shortName || activeManager.login || 'Team auswählen'
                  : 'Team auswählen'}
                {activeManager?.login && (
                  <span className="text-sm font-normal text-muted"> ({activeManager.login})</span>
                )}
              </div>
              {!isVorsaison && (
                <div className="mt-0.5 text-xs text-muted leading-relaxed">
                  <ScoreLine
                    position={displayAufstellung?.positionGesamt ?? null}
                    positionVorher={displayAufstellung?.positionGesamtVorher ?? null}
                    punkteGesamt={displayAufstellung?.punkteGesamt ?? null}
                    punkteSpieltag={displayAufstellung?.punkteSpieltag ?? null}
                  />
                </div>
              )}
            </div>
            <div className="relative shrink-0">
              <div className="flex items-center gap-2">
                {showCarouselNav && carouselPosition && (
                  <span className="text-sm text-muted whitespace-nowrap tabular-nums">
                    {carouselPosition.replace('/', ' / ')}
                  </span>
                )}
                <div className="relative flex items-center gap-2" ref={menuRef}>
                  <button
                type="button"
                onClick={() => { setHelpOpen(false); setMenuOpen(o => !o) }}
                aria-label="Mehr Optionen"
                title="Mehr Optionen"
                className={`w-8 h-8 rounded-control border border-border-strong flex items-center justify-center transition-colors ${menuOpen ? 'text-accent bg-accent-soft' : 'text-subtle hover:bg-accent-muted'}`}
              >
                <i className="sap-icon sap-icon-overflow text-sm" />
              </button>
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); setHelpOpen(o => !o) }}
                    aria-expanded={helpOpen}
                    aria-label="Hilfe"
                    title="Hilfe"
                    className={`w-8 h-8 rounded-control border border-border-strong flex items-center justify-center transition-colors ${helpOpen ? 'text-accent bg-accent-soft' : 'bg-secondary text-secondary-foreground hover:bg-card-hover'}`}
                  >
                    <i className="sap-icon sap-icon-question-mark text-sm" />
                  </button>
                  {helpOpen && (
                    <div
                      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
                      onClick={() => setHelpOpen(false)}
                    >
                      <div
                        role="dialog"
                        aria-modal="true"
                        className="bg-surface border border-border rounded-card shadow-2xl w-full max-w-sm p-4"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex flex-col gap-3 text-xs">
                          <HomeHelpOptions mobile />
                          <div className="border-t border-border pt-3">
                            <HomeHelpTable />
                          </div>
                        </div>
                        <div className="border-t border-border pt-3 mt-3">
                          <Button variant="ghost" size="input" className="w-full" onClick={() => setHelpOpen(false)}>
                            <i className="sap-icon sap-icon-decline text-sm" />
                            Fenster schließen
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-surface border border-border rounded-card shadow-xl p-3 flex flex-col gap-3">
                  {carouselEnabled && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted">Manager suchen</span>
                      <ManagerSelect
                        managers={managers ?? []}
                        value={activeManagerId ?? null}
                        onChange={id => { setActiveManagerId(id); setMenuOpen(false) }}
                        alignRight
                      />
                    </div>
                  )}
                  {carouselEnabled && isFavorite && favoriteManagerIds.length > 1 && !isStandard && (
                    <Button variant="transparent" size="input" onClick={handleSetStandard}>
                      Als Standard
                    </Button>
                  )}
                  {carouselEnabled && isStandard && (
                    <Button variant="transparent" size="input" onClick={handleRemoveStandard}>
                      Standard entfernen
                    </Button>
                  )}
                  {carouselEnabled && activeManagerId != null && (
                    <Button variant="transparent" size="input" onClick={handleToggleFavorite}>
                      {isFavorite ? 'Aus Favoriten entfernen' : 'Als Favorit'}
                    </Button>
                  )}
                  <div className="border-t border-border pt-3">
                    <Button variant="ghost" size="input" className="w-full" onClick={() => setMenuOpen(false)}>
                      <i className="sap-icon sap-icon-decline text-sm" />
                      Fenster schließen
                    </Button>
                  </div>
                </div>
              )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            {showCarouselNav && (
              <button
                type="button"
                onClick={carouselPrev}
                aria-label="Vorheriges Team"
                title="Vorheriges Team"
                className="w-9 h-9 rounded-control border border-border-strong text-accent hover:bg-accent-muted flex items-center justify-center transition-colors"
              >
                <i className="sap-icon sap-icon-slim-arrow-left text-sm" />
              </button>
            )}
            {showCarouselNav && (
              <button
                type="button"
                onClick={carouselNext}
                aria-label="Nächstes Team"
                title="Nächstes Team"
                className="w-9 h-9 rounded-control border border-border-strong text-accent hover:bg-accent-muted flex items-center justify-center transition-colors"
              >
                <i className="sap-icon sap-icon-slim-arrow-right text-sm" />
              </button>
            )}
            {showCarouselNav && carouselPosition && (
              <span className="text-sm text-muted whitespace-nowrap tabular-nums min-w-[2.5rem] text-center">
                {carouselPosition}
              </span>
            )}
            <h2 className="text-xl font-semibold text-foreground min-w-0">{title}</h2>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative flex items-center gap-2" ref={menuRef}>
                {helpOpen && (
                  <div className="absolute right-0 top-full mt-2 z-50 w-[400px] bg-surface border border-border rounded-card shadow-xl p-4">
                    <HomeHelpContent />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => { setHelpOpen(false); setMenuOpen(o => !o) }}
                  aria-label="Mehr Optionen"
                  title="Mehr Optionen"
                  className={`w-8 h-8 rounded-control border border-border-strong flex items-center justify-center transition-colors ${menuOpen ? 'text-accent bg-accent-soft' : 'text-subtle hover:bg-accent-muted'}`}
                >
                  <i className="sap-icon sap-icon-overflow text-sm" />
                </button>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); setHelpOpen(o => !o) }}
                  aria-expanded={helpOpen}
                  aria-label="Hilfe"
                  title="Hilfe"
                  className={`w-8 h-8 rounded-control border border-border-strong flex items-center justify-center transition-colors ${helpOpen ? 'text-accent bg-accent-soft' : 'bg-secondary text-secondary-foreground hover:bg-card-hover'}`}
                >
                  <i className="sap-icon sap-icon-question-mark text-sm" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-surface border border-border rounded-card shadow-xl p-3 flex flex-col gap-3">
                    {carouselEnabled && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted">Manager suchen</span>
                        <ManagerSelect
                          managers={managers ?? []}
                          value={activeManagerId ?? null}
                          onChange={id => { setActiveManagerId(id); setMenuOpen(false) }}
                          alignRight
                        />
                      </div>
                    )}
                    {carouselEnabled && isFavorite && favoriteManagerIds.length > 1 && !isStandard && (
                      <Button variant="transparent" size="input" onClick={handleSetStandard}>
                        Als Standard
                      </Button>
                    )}
                    {carouselEnabled && activeManagerId != null && (
                      <Button variant="transparent" size="input" onClick={handleToggleFavorite}>
                        {isFavorite ? 'Aus Favoriten entfernen' : 'Als Favorit'}
                      </Button>
                    )}
                    {carouselEnabled && isStandard && (
                      <Button variant="transparent" size="input" onClick={handleRemoveStandard}>
                        Standard entfernen
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {carouselError && (
        <div className="flex items-center gap-3 p-3 bg-danger-bg border border-danger/30 rounded-card mb-4">
          <i className="sap-icon sap-icon-alert text-[18px] text-danger shrink-0" />
          <p className="text-danger text-sm">{carouselError}</p>
        </div>
      )}
      {fill ? <div className="flex-1 min-h-0">{children}</div> : children}
    </div>
  )

  if (isMobile) {
    return (
      <div className="pb-6 min-h-full flex flex-col gap-0">
        <SegmentedTabs
          items={[
            { key: 'spieler', label: 'Spieler' },
            { key: 'gruppen', label: 'Gruppen' },
            { key: 'manager', label: 'Manager' },
          ]}
          active={activeTab}
          onChange={handleTabChange}
          className="mb-1"
        />
        {activeTab === 'gruppen' ? (
          renderMobileGroups()
        ) : activeTab === 'manager' ? (
          <ManagersMobilePanel
            managers={managers ?? []}
            canNavigateToManager={canNavigateToManager}
            headerTitle={groupHeaderTitle}
          />
        ) : (
          <div
            {...swipe}
            style={{ touchAction: 'pan-y' }}
          >
            {card(
              <div>
                {!activeManagerId ? (
                  <p className="text-sm text-muted py-10 text-center">Kein Team ausgewählt.</p>
                ) : aufstellungQuery.isLoading || !aufstellungQuery.data ? (
                  <p className="text-sm text-muted py-10 text-center">Lade Daten…</p>
                ) : null}
              </div>
            )}
            {activeManagerId && aufstellungQuery.data && (
              <div className="p-2 bg-surface border border-border rounded-card">
                <AufstellungVertikal
                  aufstellung={aufstellungQuery.data}
                  modus={feldModus}
                  hinrundeFilter
                />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="pb-6 h-[103%] flex flex-col min-h-0">
      <Tabs
        items={[
          { key: 'spieler', label: 'Spieler' },
          { key: 'gruppen', label: 'Gruppen' },
          { key: 'manager', label: 'Manager' },
        ]}
        active={activeTab}
        onChange={handleTabChange}
      />
      <div ref={spielerWrapRef} className="flex-1 min-h-0 flex flex-col">
        {activeTab === 'spieler' ? (
          <div className="flex-1 min-h-0 overflow-x-auto">
            {card(
              <div className="relative z-0 isolate h-full flex flex-col min-h-0">
                {!activeManagerId ? (
                  <AufstellungsFeld aufstellung={EMPTY_AUFSTELLUNG} modus={feldModus} overlayLegend hideSum maxWidth={spielerMaxWidth} />
                ) : aufstellungQuery.isError ? (
                  <p className="text-sm text-danger py-10 text-center">Daten konnten nicht geladen werden.</p>
                ) : !displayAufstellung ? (
                  <p className="text-sm text-muted py-10 text-center">Lade Daten…</p>
                ) : (
                  <AufstellungsFeld
                    aufstellung={displayAufstellung}
                    modus={feldModus}
                    overlayLegend
                    hideSum
                    maxWidth={spielerMaxWidth}
                    manager={activeManager}
                    editable={isOwnTeam}
                  />
                )}
              </div>,
              true
            )}
          </div>
        ) : activeTab === 'manager' ? (
          <Managers fill enableCompact showEinsatzquote showFavorites showVisits />
        ) : (
          <div className="flex-1 min-h-0 flex flex-col pr-1">
            <div className="max-w-[1300px] flex flex-col gap-6 flex-1 min-h-0">
              {renderGroups()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
