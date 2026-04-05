import { useState, useMemo } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Table, Input, Chip, Card } from '@heroui/react'
import { useUsers } from '../hooks/useUsers'

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  NORMAL: 'Normal',
  GUEST: 'Gast'
}

const roleColors: Record<string, 'success' | 'warning' | 'default'> = {
  ADMIN: 'success',
  NORMAL: 'warning',
  GUEST: 'default'
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
    if (sortKey !== column) return <span className="text-[#6b7280] ml-1">⇅</span>
    return <span className="text-[#c9a66b] ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
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

  if (isLoading) return <div className="text-center py-8 text-[#a0aec0]">Laden...</div>
  if (error) return <div className="text-center py-8 text-[#e05252]">Fehler beim Laden</div>

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#f5f5f5] mb-6">Benutzer</h1>

      <Card className="p-4 bg-[#1a2028] border border-[#2d3748]">
        <div className="mb-4">
          <Input
            placeholder="Benutzer suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
          />
        </div>

        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Benutzer-Tabelle">
              <Table.Header>
                <Table.Column className="text-[#c9a66b] cursor-pointer hover:text-[#f5f5f5]" onClick={() => handleSort('login')}>
                  Login<SortIcon column="login" />
                </Table.Column>
                <Table.Column className="text-[#a0aec0] cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('email')}>
                  E-Mail<SortIcon column="email" />
                </Table.Column>
                <Table.Column className="text-[#a0aec0] cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('firstName')}>
                  Vorname<SortIcon column="firstName" />
                </Table.Column>
                <Table.Column className="text-[#a0aec0] cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('lastName')}>
                  Nachname<SortIcon column="lastName" />
                </Table.Column>
                <Table.Column className="text-[#a0aec0] cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('role')}>
                  Rolle<SortIcon column="role" />
                </Table.Column>
              </Table.Header>
              <Table.Body>
                {filteredUsers && filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <Table.Row key={user.id} className="hover:bg-[#242d38]">
                      <Table.Cell className="text-[#c9a66b]">
                        <RouterLink to={`/users/${user.id}`} className="hover:text-[#f5f5f5] link font-medium">
                          {user.login}
                        </RouterLink>
                      </Table.Cell>
                      <Table.Cell className="text-[#a0aec0]">
                        {user.email}
                      </Table.Cell>
                      <Table.Cell className="text-[#a0aec0]">
                        {user.firstName || '-'}
                      </Table.Cell>
                      <Table.Cell className="text-[#a0aec0]">
                        {user.lastName || '-'}
                      </Table.Cell>
                      <Table.Cell>
                        <Chip
                          size="sm"
                          color={roleColors[user.role as keyof typeof roleColors] || 'default'}
                          variant="soft"
                        >
                          {roleLabels[user.role as keyof typeof roleLabels] || user.role}
                        </Chip>
                      </Table.Cell>
                    </Table.Row>
                  ))
                ) : (
                  <Table.Row>
                    <Table.Cell colSpan={5} className="text-center text-[#6b7280] py-8">
                      Keine Benutzer gefunden
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>

        {filteredUsers && (
          <div className="mt-4 text-sm text-[#6b7280]">
            {filteredUsers.length} von {users?.length || 0} Benutzern
          </div>
        )}
      </Card>
    </div>
  )
}
