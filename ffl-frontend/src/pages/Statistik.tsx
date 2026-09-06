import { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useLoginStats } from '../hooks/useLoginStats'
import { useInstallStats } from '../hooks/useInstallStats'
import { useDownloadStats } from '../hooks/useDownloadStats'
import type { LoginStatMonth, InstallStatMonth, DownloadStatMonth } from '../types'
import BackButton from '../components/BackButton'
import CardContainer from '../components/CardContainer'
import Tabs from '../components/Tabs'
import SortIcon from '../components/SortIcon'
import { TableContent, TableHead, ThSortable, TableBody, Td } from '../components/Table'
import { getChartColors } from '../utils/chartColors'

const rangeOptions = [3, 6, 12, 24]

function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function monthKey(year: number, month: number): string {
  return `${year}-${month}`
}

function monthLabel(year: number, month: number): string {
  return `${String(month).padStart(2, '0')}/${year}`
}

type SortKey = 'month' | 'count'
type SubSortKey = 'login' | 'count'
type DocSubSortKey = 'document' | 'count'

interface StatUser {
  login: string
  firstName?: string
  lastName?: string
  count: number
}

interface StatDocument {
  name: string
  count: number
}

interface StatMonth {
  year: number
  month: number
  total: number
  users: StatUser[]
  documents?: StatDocument[]
}

type UseStats<T> = (from: string, to: string) => {
  data: { months: T[] } | undefined
  isLoading: boolean
  error: unknown
}

const alphanumericCompare = (a: string, b: string): number =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })

const userLabel = (user: StatUser): string => {
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
  if (fullName && user.login) return `${fullName} (${user.login})`
  return user.login
}

interface MonthlyStatPanelProps<T> {
  useStats: UseStats<T>
  toStatMonths: (months: T[]) => StatMonth[]
  title: string
  subtitle: string
  countLabel: string
  tooltipLabel: string
  emptyText: string
}

export default function Statistik() {
  const [activeTab, setActiveTab] = useState<'logins' | 'install' | 'downloads'>('logins')

  return (
    <div>
      <BackButton to="/" className="mb-4" />
      <Tabs
        items={[
          { key: 'logins', label: 'Einloggen' },
          { key: 'install', label: 'Installieren' },
          { key: 'downloads', label: 'Downloads' },
        ]}
        active={activeTab}
        onChange={(key) => setActiveTab(key as 'logins' | 'install' | 'downloads')}
      />
      {activeTab === 'logins' && <LoginStatsPanel />}
      {activeTab === 'install' && <InstallStatsPanel />}
      {activeTab === 'downloads' && <DownloadStatsPanel />}
      <div className="h-10" />
    </div>
  )
}

function LoginStatsPanel() {
  return (
    <MonthlyStatPanel
      useStats={useLoginStats}
      toStatMonths={(months: LoginStatMonth[]) =>
        months.map(m => ({
          year: m.year,
          month: m.month,
          total: m.totalLogins,
          users: m.users.map(({ logins, ...rest }) => ({ ...rest, count: logins })),
        }))
      }
      title="Login-Statistik"
      subtitle="Anzahl erfolgreicher Logins pro Monat (nur NORMAL-Benutzer)"
      countLabel="Logins"
      tooltipLabel="Logins"
      emptyText="Keine Logins in diesem Monat"
    />
  )
}

function InstallStatsPanel() {
  return (
    <MonthlyStatPanel
      useStats={useInstallStats}
      toStatMonths={(months: InstallStatMonth[]) =>
        months.map(m => ({
          year: m.year,
          month: m.month,
          total: m.totalClicks,
          users: m.users.map(({ clicks, ...rest }) => ({ ...rest, count: clicks })),
        }))
      }
      title="Install-Statistik"
      subtitle="Anzahl der Klicks auf den „Installieren“-Button pro Monat"
      countLabel="Klicks"
      tooltipLabel="Install-Klicks"
      emptyText="Keine Klicks in diesem Monat"
    />
  )
}

function DownloadStatsPanel() {
  return (
    <MonthlyStatPanel
      useStats={useDownloadStats}
      toStatMonths={(months: DownloadStatMonth[]) =>
        months.map(m => ({
          year: m.year,
          month: m.month,
          total: m.totalDownloads,
          users: m.users.map(({ downloads, ...rest }) => ({ ...rest, count: downloads })),
          documents: m.documents.map(({ documentName, downloads }) => ({ name: documentName, count: downloads })),
        }))
      }
      title="Download-Statistik"
      subtitle="Anzahl Dokument-Abrufe pro Monat (inkl. geteilter Links)"
      countLabel="Downloads"
      tooltipLabel="Downloads"
      emptyText="Keine Downloads in diesem Monat"
    />
  )
}

function MonthlyStatPanel<T>({ useStats, toStatMonths, title, subtitle, countLabel, tooltipLabel, emptyText }: MonthlyStatPanelProps<T>) {
  const [rangeMonths, setRangeMonths] = useState(12)
  const [sortKey, setSortKey] = useState<SortKey>('month')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [subSort, setSubSort] = useState<Record<string, { key: SubSortKey; order: 'asc' | 'desc' }>>({})
  const [docSubSort, setDocSubSort] = useState<Record<string, { key: DocSubSortKey; order: 'asc' | 'desc' }>>({})

  const now = new Date()
  const from = formatDate(new Date(now.getFullYear(), now.getMonth() - (rangeMonths - 1), 1))
  const to = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 1))

  const { data, isLoading, error } = useStats(from, to)

  const chartColors = useMemo(() => getChartColors(), [])

  const statMonths = useMemo(() => (data ? toStatMonths(data.months) : undefined), [data, toStatMonths])

  const chartData = useMemo(() => {
    if (!statMonths) return []
    return statMonths.map(m => ({ label: monthLabel(m.year, m.month), count: m.total }))
  }, [statMonths])

  const sortedMonths = useMemo(() => {
    if (!statMonths) return []
    const arr = [...statMonths]
    arr.sort((a, b) => {
      const dateA = a.year * 100 + a.month
      const dateB = b.year * 100 + b.month
      const cmp = sortKey === 'month' ? dateA - dateB : a.total - b.total
      return sortOrder === 'asc' ? cmp : -cmp
    })
    return arr
  }, [statMonths, sortKey, sortOrder])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const toggleExpanded = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleSubSort = (key: string, col: SubSortKey) => {
    setSubSort(prev => {
      const current = prev[key] ?? { key: 'count' as SubSortKey, order: 'desc' as const }
      const next = current.key === col
        ? { key: col, order: current.order === 'asc' ? 'desc' as const : 'asc' as const }
        : { key: col, order: 'asc' as const }
      return { ...prev, [key]: next }
    })
  }

  const handleDocSubSort = (key: string, col: DocSubSortKey) => {
    setDocSubSort(prev => {
      const current = prev[key] ?? { key: 'count' as DocSubSortKey, order: 'desc' as const }
      const next = current.key === col
        ? { key: col, order: current.order === 'asc' ? 'desc' as const : 'asc' as const }
        : { key: col, order: 'asc' as const }
      return { ...prev, [key]: next }
    })
  }

  const sortedUsers = (month: StatMonth): StatUser[] => {
    const sort = subSort[monthKey(month.year, month.month)] ?? { key: 'count' as SubSortKey, order: 'desc' as const }
    const arr = [...month.users]
    arr.sort((a, b) => {
      if (sort.key === 'login') {
        const cmp = alphanumericCompare(userLabel(a), userLabel(b))
        return sort.order === 'asc' ? cmp : -cmp
      }
      const countCmp = a.count - b.count
      if (countCmp !== 0) return sort.order === 'asc' ? countCmp : -countCmp
      return alphanumericCompare(userLabel(a), userLabel(b))
    })
    return arr
  }

  const sortedDocuments = (month: StatMonth): StatDocument[] => {
    const sort = docSubSort[monthKey(month.year, month.month)] ?? { key: 'count' as DocSubSortKey, order: 'desc' as const }
    const arr = [...(month.documents ?? [])]
    arr.sort((a, b) => {
      if (sort.key === 'document') {
        const cmp = alphanumericCompare(a.name, b.name)
        return sort.order === 'asc' ? cmp : -cmp
      }
      const countCmp = a.count - b.count
      if (countCmp !== 0) return sort.order === 'asc' ? countCmp : -countCmp
      return alphanumericCompare(a.name, b.name)
    })
    return arr
  }

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

  return (
    <CardContainer
      title={title}
      subtitle={subtitle}
      headerRight={
        <label className="flex items-center gap-1.5 text-xs text-muted">
          Zeitraum:
          <select
            value={rangeMonths}
            onChange={(e) => setRangeMonths(Number(e.target.value))}
            className="input-field py-1.5 pl-2 pr-6 text-xs"
          >
            {rangeOptions.map(months => (
              <option key={months} value={months}>
                {months} Monate
              </option>
            ))}
          </select>
        </label>
      }
    >
      {chartData.length > 0 && (
        <div className="px-6 pt-6">
          <div className="bg-card p-4 rounded-card border border-border">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis dataKey="label" stroke={chartColors.axis} />
                <YAxis stroke={chartColors.axis} domain={[0, 'auto']} tickCount={10} allowDecimals={false} />
                <Tooltip
                  cursor={false}
                  wrapperStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-surface border border-border rounded-card p-3 shadow-lg">
                          <p className="text-foreground font-semibold">{label}</p>
                          <p className="text-primary">{tooltipLabel}: {payload[0].value}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Line type="monotone" dataKey="count" stroke={chartColors.accent} strokeWidth={2} dot={{ fill: chartColors.accent, strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <TableContent>
        <table className="w-full">
          <TableHead>
            <tr>
              <ThSortable onClick={() => handleSort('month')}>
                Monat<SortIcon column="month" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
              <ThSortable numeric onClick={() => handleSort('count')}>
                {countLabel}<SortIcon column="count" activeKey={sortKey} order={sortOrder} />
              </ThSortable>
            </tr>
          </TableHead>
          <TableBody>
            {sortedMonths.length > 0 ? (
              sortedMonths.map(month => {
                const key = monthKey(month.year, month.month)
                const isExpanded = expanded.has(key)
                return (
                  <MonthRows
                    key={key}
                    month={month}
                    isExpanded={isExpanded}
                    onToggle={() => toggleExpanded(key)}
                    subSort={subSort[key]}
                    onSubSort={(col) => handleSubSort(key, col)}
                    sortedUsers={sortedUsers(month)}
                    docSubSort={docSubSort[key]}
                    onDocSubSort={(col) => handleDocSubSort(key, col)}
                    sortedDocuments={sortedDocuments(month)}
                    countLabel={countLabel}
                    emptyText={emptyText}
                  />
                )
              })
            ) : (
              <tr>
                <td colSpan={2} className="text-center text-subtle py-8">
                  Keine Daten vorhanden
                </td>
              </tr>
            )}
          </TableBody>
        </table>
      </TableContent>
    </CardContainer>
  )
}

interface MonthRowsProps {
  month: StatMonth
  isExpanded: boolean
  onToggle: () => void
  subSort?: { key: SubSortKey; order: 'asc' | 'desc' }
  onSubSort: (col: SubSortKey) => void
  sortedUsers: StatUser[]
  docSubSort?: { key: DocSubSortKey; order: 'asc' | 'desc' }
  onDocSubSort: (col: DocSubSortKey) => void
  sortedDocuments: StatDocument[]
  countLabel: string
  emptyText: string
}

function MonthRows({ month, isExpanded, onToggle, subSort, onSubSort, sortedUsers, docSubSort, onDocSubSort, sortedDocuments, countLabel, emptyText }: MonthRowsProps) {
  const activeSubSort = subSort ?? { key: 'count' as SubSortKey, order: 'desc' as const }
  const activeDocSubSort = docSubSort ?? { key: 'count' as DocSubSortKey, order: 'desc' as const }
  const hasDocuments = sortedDocuments.length > 0
  return (
    <>
      <tr
        className="border-b border-border hover:bg-card-hover cursor-pointer"
        onClick={onToggle}
      >
        <Td>
          <span className="inline-flex items-center gap-2">
            <i
              className={`sap-icon ${isExpanded ? 'sap-icon-navigation-down-arrow' : 'sap-icon-navigation-right-arrow'} text-[14px] text-subtle`}
            />
            {monthLabel(month.year, month.month)}
          </span>
        </Td>
        <Td numeric>{month.total}</Td>
      </tr>
      {isExpanded && (
        <tr className="bg-elevated/50">
          <td colSpan={2} className="px-2 py-2 pl-10 md:px-3">
            {sortedUsers.length > 0 ? (
              <table className="w-full max-w-md">
                <thead>
                  <tr className="text-[12px] font-semibold uppercase tracking-wide text-muted">
                    <th
                      className="px-2 py-2 h-[40px] text-left cursor-pointer hover:text-accent select-none md:px-3"
                      onClick={() => onSubSort('login')}
                    >
                      Benutzer<SortIcon column="login" activeKey={activeSubSort.key} order={activeSubSort.order} />
                    </th>
                    <th
                      className="px-2 py-2 h-[40px] text-right cursor-pointer hover:text-accent select-none tabular-nums md:px-3"
                      onClick={() => onSubSort('count')}
                    >
                      {countLabel}<SortIcon column="count" activeKey={activeSubSort.key} order={activeSubSort.order} />
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  {sortedUsers.map(user => (
                    <tr key={user.login} className="border-t border-border">
                      <Td className="pl-3">{userLabel(user)}</Td>
                      <Td numeric>{user.count}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-subtle py-2">{emptyText}</p>
            )}
            {hasDocuments && (
              <table className="w-full max-w-md mt-4">
                <thead>
                  <tr className="text-[12px] font-semibold uppercase tracking-wide text-muted">
                    <th
                      className="px-2 py-2 h-[40px] text-left cursor-pointer hover:text-accent select-none md:px-3"
                      onClick={() => onDocSubSort('document')}
                    >
                      Dokument<SortIcon column="document" activeKey={activeDocSubSort.key} order={activeDocSubSort.order} />
                    </th>
                    <th
                      className="px-2 py-2 h-[40px] text-right cursor-pointer hover:text-accent select-none tabular-nums md:px-3"
                      onClick={() => onDocSubSort('count')}
                    >
                      {countLabel}<SortIcon column="count" activeKey={activeDocSubSort.key} order={activeDocSubSort.order} />
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  {sortedDocuments.map(doc => (
                    <tr key={doc.name} className="border-t border-border">
                      <Td className="pl-3 break-all">{doc.name}</Td>
                      <Td numeric>{doc.count}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
