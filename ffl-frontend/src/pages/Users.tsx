import { useState, useMemo } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useUsers } from '../hooks/useUsers'
import PageHeader from '../components/PageHeader'
import CardContainer from '../components/CardContainer'
import SortIcon from '../components/SortIcon'
import { TableContent, TableHead, ThSortable, TableBody } from '../components/Table'

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  NORMAL: 'Normal',
  GUEST: 'Gast'
}

const roleChipClass: Record<string, string> = {
  ADMIN: 'chip-success',
  NORMAL: 'chip-warning',
  GUEST: 'chip-accent'
}

type SortKey = 'login' | 'email' | 'firstName' | 'lastName' | 'role'

export default function Users() {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('login')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const { data: users, isLoading, error } = useUsers()

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const filteredUsers = useMemo(() => {
    if (!users) return []
    
    const filtered = users.filter(user => {
      return user.login.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.firstName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.lastName?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    })

    return filtered.sort((a, b) => {
      let comparison = 0
      switch (sortKey) {
        case 'login':
          comparison = a.login.localeCompare(b.login)
          break
        case 'email':
          comparison = a.email.localeCompare(b.email)
          break
        case 'firstName':
          comparison = (a.firstName || '').localeCompare(b.firstName || '')
          break
        case 'lastName':
          comparison = (a.lastName || '').localeCompare(b.lastName || '')
          break
        case 'role':
          comparison = (a.role || '').localeCompare(b.role || '')
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [users, searchTerm, sortKey, sortOrder])

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

  const hasActiveFilter = searchTerm !== ''

  return (
    <div>
      <PageHeader icon="sap-icon-personnel-view" title="Benutzer" />

      <CardContainer>
        <div className="flex items-center gap-3 px-5 py-2.5 bg-elevated/50 border-b border-border">
          <div className="relative flex-1 min-w-[180px] max-w-[280px]">
            <i className="sap-icon sap-icon-search text-[14px] absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              type="text"
              placeholder="Benutzer suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-8 pr-3 py-1.5 text-xs w-full"
            />
          </div>
          {hasActiveFilter && (
            <button
              onClick={() => setSearchTerm('')}
              className="p-1 rounded text-subtle hover:text-danger transition-colors"
              title="Filter zurücksetzen"
            >
              <i className="sap-icon sap-icon-decline text-[14px]" />
            </button>
          )}
        </div>

        <TableContent count={filteredUsers.length} total={users?.length || 0} countLabel="Benutzern">
          <table className="w-full">
            <TableHead>
              <tr>
                <ThSortable onClick={() => handleSort('login')}>
                  Login<SortIcon column="login" activeKey={sortKey} order={sortOrder} />
                </ThSortable>
                <ThSortable onClick={() => handleSort('email')}>
                  E-Mail<SortIcon column="email" activeKey={sortKey} order={sortOrder} />
                </ThSortable>
                <ThSortable onClick={() => handleSort('firstName')}>
                  Vorname<SortIcon column="firstName" activeKey={sortKey} order={sortOrder} />
                </ThSortable>
                <ThSortable onClick={() => handleSort('lastName')}>
                  Nachname<SortIcon column="lastName" activeKey={sortKey} order={sortOrder} />
                </ThSortable>
                <ThSortable onClick={() => handleSort('role')}>
                  Rolle<SortIcon column="role" activeKey={sortKey} order={sortOrder} />
                </ThSortable>
              </tr>
            </TableHead>
            <TableBody>
              {filteredUsers && filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-card-hover">
                    <td className="px-3 py-2">
                      <RouterLink to={`/users/${user.id}`} className="hover:text-accent-hover link text-primary font-medium">
                        {user.login}
                      </RouterLink>
                    </td>
                    <td className="px-3 py-2 text-muted">{user.email}</td>
                    <td className="px-3 py-2 text-muted">{user.firstName || '-'}</td>
                    <td className="px-3 py-2 text-muted">{user.lastName || '-'}</td>
                    <td className="px-3 py-2">
                      <span className={`${roleChipClass[user.role as keyof typeof roleChipClass] || 'chip-accent'} text-xs font-medium px-2 py-0.5 rounded`}>
                        {roleLabels[user.role as keyof typeof roleLabels] || user.role}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center text-subtle py-8">
                    Keine Benutzer gefunden
                  </td>
                </tr>
              )}
            </TableBody>
          </table>
        </TableContent>
      </CardContainer>
    </div>
  )
}
