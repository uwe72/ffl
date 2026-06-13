import { useState, useMemo } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useUsers } from '../hooks/useUsers'

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
type SortOrder = 'asc' | 'desc'

export default function Users() {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('login')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const { data: users, isLoading, error } = useUsers()

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <span className="text-subtle ml-1">⇅</span>
    return <span className="text-accent ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
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

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <i className="sap-icon sap-icon-settings text-[28px] text-primary" />
        <h1 className="text-sm font-medium text-primary">Benutzer</h1>
      </div>

      <div className="p-4 bg-surface border border-border">
        <div className="mb-4">
          <input
            placeholder="Benutzer suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field max-w-md w-full px-3 py-2 rounded focus:outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-primary cursor-pointer hover:text-foreground" onClick={() => handleSort('login')}>
                  Login<SortIcon column="login" />
                </th>
                <th className="text-left py-3 px-4 text-muted cursor-pointer hover:text-primary" onClick={() => handleSort('email')}>
                  E-Mail<SortIcon column="email" />
                </th>
                <th className="text-left py-3 px-4 text-muted cursor-pointer hover:text-primary" onClick={() => handleSort('firstName')}>
                  Vorname<SortIcon column="firstName" />
                </th>
                <th className="text-left py-3 px-4 text-muted cursor-pointer hover:text-primary" onClick={() => handleSort('lastName')}>
                  Nachname<SortIcon column="lastName" />
                </th>
                <th className="text-left py-3 px-4 text-muted cursor-pointer hover:text-primary" onClick={() => handleSort('role')}>
                  Rolle<SortIcon column="role" />
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers && filteredUsers.length > 0 ? (
                filteredUsers.map((user, index) => (
                  <tr key={user.id} className={`border-b border-border hover:bg-card-hover ${index % 2 === 1 ? 'bg-zebra' : ''}`}>
                    <td className="py-3 px-4 text-primary">
                      <RouterLink to={`/users/${user.id}`} className="hover:text-foreground link font-medium">
                        {user.login}
                      </RouterLink>
                    </td>
                    <td className="py-3 px-4 text-muted">
                      {user.email}
                    </td>
                    <td className="py-3 px-4 text-muted">
                      {user.firstName || '-'}
                    </td>
                    <td className="py-3 px-4 text-muted">
                      {user.lastName || '-'}
                    </td>
                    <td className="py-3 px-4">
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
            </tbody>
          </table>
        </div>

        {filteredUsers && (
          <div className="mt-4 text-sm text-subtle">
            {filteredUsers.length} von {users?.length || 0} Benutzern
          </div>
        )}
      </div>
    </div>
  )
}
