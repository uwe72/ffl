import { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useLoginStats } from '../hooks/useLoginStats'
import type { LoginStatMonth, LoginStatUser } from '../types'
import BackButton from '../components/BackButton'
import CardContainer from '../components/CardContainer'
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

type SortKey = 'month' | 'logins'
type SubSortKey = 'login' | 'logins'

export default function Statistik() {
  const [rangeMonths, setRangeMonths] = useState(12)
  const [sortKey, setSortKey] = useState<SortKey>('month')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [subSort, setSubSort] = useState<Record<string, { key: SubSortKey; order: 'asc' | 'desc' }>>({})

  const now = new Date()
  const from = formatDate(new Date(now.getFullYear(), now.getMonth() - (rangeMonths - 1), 1))
  const to = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 1))

  const { data, isLoading, error } = useLoginStats(from, to)

  const chartColors = useMemo(() => getChartColors(), [])

  const chartData = useMemo(() => {
    if (!data) return []
    return data.months.map(m => ({ label: monthLabel(m.year, m.month), logins: m.totalLogins }))
  }, [data])

  const sortedMonths = useMemo(() => {
    if (!data) return []
    const arr = [...data.months]
    arr.sort((a, b) => {
      const dateA = a.year * 100 + a.month
      const dateB = b.year * 100 + b.month
      const cmp = sortKey === 'month' ? dateA - dateB : a.totalLogins - b.totalLogins
      return sortOrder === 'asc' ? cmp : -cmp
    })
    return arr
  }, [data, sortKey, sortOrder])

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
      const current = prev[key] ?? { key: 'logins' as SubSortKey, order: 'desc' as const }
      const next = current.key === col
        ? { key: col, order: current.order === 'asc' ? 'desc' as const : 'asc' as const }
        : { key: col, order: 'asc' as const }
      return { ...prev, [key]: next }
    })
  }

  const sortedUsers = (month: LoginStatMonth): LoginStatUser[] => {
    const sort = subSort[monthKey(month.year, month.month)] ?? { key: 'logins' as SubSortKey, order: 'desc' as const }
    const arr = [...month.users]
    arr.sort((a, b) => {
      const cmp = sort.key === 'login' ? a.login.localeCompare(b.login) : a.logins - b.logins
      return sort.order === 'asc' ? cmp : -cmp
    })
    return arr
  }

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

  return (
    <div>
      <BackButton to="/" className="mb-4" />
      <CardContainer
        title="Login-Statistik"
        subtitle="Anzahl erfolgreicher Logins pro Monat (nur NORMAL-Benutzer)"
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
                            <p className="text-primary">Logins: {payload[0].value}</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Line type="monotone" dataKey="logins" stroke={chartColors.accent} strokeWidth={2} dot={{ fill: chartColors.accent, strokeWidth: 2 }} />
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
                <ThSortable numeric onClick={() => handleSort('logins')}>
                  Logins<SortIcon column="logins" activeKey={sortKey} order={sortOrder} />
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

      <div className="h-10" />
    </div>
  )
}

interface MonthRowsProps {
  month: LoginStatMonth
  isExpanded: boolean
  onToggle: () => void
  subSort?: { key: SubSortKey; order: 'asc' | 'desc' }
  onSubSort: (col: SubSortKey) => void
  sortedUsers: LoginStatUser[]
}

function MonthRows({ month, isExpanded, onToggle, subSort, onSubSort, sortedUsers }: MonthRowsProps) {
  const activeSubSort = subSort ?? { key: 'logins' as SubSortKey, order: 'desc' as const }
  const userLabel = (user: LoginStatUser): string => {
    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
    if (fullName && user.login) return `${fullName} (${user.login})`
    return user.login
  }
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
        <Td numeric>{month.totalLogins}</Td>
      </tr>
      {isExpanded && (
        <tr className="bg-elevated/50">
          <td colSpan={2} className="px-3 py-2 pl-10">
            {sortedUsers.length > 0 ? (
              <table className="w-full max-w-md">
                <thead>
                  <tr className="text-[12px] font-semibold uppercase tracking-wide text-muted">
                    <th
                      className="px-3 py-2 h-[40px] text-left cursor-pointer hover:text-accent select-none"
                      onClick={() => onSubSort('login')}
                    >
                      Benutzer<SortIcon column="login" activeKey={activeSubSort.key} order={activeSubSort.order} />
                    </th>
                    <th
                      className="px-3 py-2 h-[40px] text-right cursor-pointer hover:text-accent select-none tabular-nums"
                      onClick={() => onSubSort('logins')}
                    >
                      Logins<SortIcon column="logins" activeKey={activeSubSort.key} order={activeSubSort.order} />
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  {sortedUsers.map(user => (
                    <tr key={user.login} className="border-t border-border">
                      <Td className="pl-3">{userLabel(user)}</Td>
                      <Td numeric>{user.logins}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-subtle py-2">Keine Logins in diesem Monat</p>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
