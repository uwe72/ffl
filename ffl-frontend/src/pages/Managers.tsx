import { useState, useMemo } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Table, Input, Chip, Card } from '@heroui/react'
import { useManagers } from '../hooks/useManagers'

const paymentStateLabels = {
  PAID: 'Bezahlt',
  NOT_PAID: 'Nicht bezahlt'
}

type SortKey = 'shortName' | 'firstName' | 'lastName' | 'teamValue' | 'positionTotal' | 'pointsTotal' | 'pointsLastRound'
type SortOrder = 'asc' | 'desc'

export default function Managers() {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('positionTotal')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const { data: managers, isLoading, error } = useManagers()

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

  const filteredManagers = useMemo(() => {
    if (!managers) return []
    
    const filtered = managers.filter(manager => {
      return manager.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manager.shortName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manager.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manager.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
    })

    return filtered.sort((a, b) => {
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
        case 'teamValue':
          comparison = (a.teamValue || 0) - (b.teamValue || 0)
          break
        case 'positionTotal':
          comparison = (a.positionTotal || 999) - (b.positionTotal || 999)
          break
        case 'pointsTotal':
          comparison = (b.pointsTotal || 0) - (a.pointsTotal || 0)
          break
        case 'pointsLastRound':
          comparison = (b.pointsLastRound || 0) - (a.pointsLastRound || 0)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [managers, searchTerm, sortKey, sortOrder])

  if (isLoading) return <div className="text-center py-8 text-[#a0aec0]">Laden...</div>
  if (error) return <div className="text-center py-8 text-[#e05252]">Fehler beim Laden</div>

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#f5f5f5] mb-6">Manager</h1>

      <Card className="p-4 bg-[#1a2028] border border-[#2d3748]">
        <div className="mb-4">
          <Input
            placeholder="Manager suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
          />
        </div>

        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Manager-Tabelle">
              <Table.Header>
                <Table.Column className="text-[#a0aec0] text-center cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('positionTotal')}>
                  Pos<SortIcon column="positionTotal" />
                </Table.Column>
                <Table.Column className="text-[#c9a66b] cursor-pointer hover:text-[#f5f5f5]" onClick={() => handleSort('shortName')}>
                  Manager<SortIcon column="shortName" />
                </Table.Column>
                <Table.Column className="text-[#a0aec0] text-center cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('pointsTotal')}>
                  Pkt<SortIcon column="pointsTotal" />
                </Table.Column>
                <Table.Column className="text-[#a0aec0] text-center cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('pointsLastRound')}>
                  Letzte Rd<SortIcon column="pointsLastRound" />
                </Table.Column>
                <Table.Column className="text-[#a0aec0] cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('firstName')}>
                  Vorname<SortIcon column="firstName" />
                </Table.Column>
                <Table.Column className="text-[#a0aec0] cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('lastName')}>
                  Nachname<SortIcon column="lastName" />
                </Table.Column>
                <Table.Column className="text-[#a0aec0]">Status</Table.Column>
                <Table.Column className="text-[#a0aec0] text-right cursor-pointer hover:text-[#c9a66b]" onClick={() => handleSort('teamValue')}>
                  Teamwert<SortIcon column="teamValue" />
                </Table.Column>
              </Table.Header>
              <Table.Body>
                {filteredManagers && filteredManagers.length > 0 ? (
                  filteredManagers.map((manager) => (
                    <Table.Row key={manager.id} className="hover:bg-[#242d38]">
                      <Table.Cell className="text-center font-medium text-[#f5f5f5]">
                        {manager.positionTotal ? `${manager.positionTotal}.` : '-'}
                      </Table.Cell>
                      <Table.Cell className="text-[#c9a66b]">
                        <RouterLink to={`/managers/${manager.id}`} className="hover:text-[#f5f5f5] link font-medium">
                          {manager.shortName || '-'}
                        </RouterLink>
                      </Table.Cell>
                      <Table.Cell className="text-center font-medium text-[#f5f5f5]">
                        {manager.pointsTotal ?? '-'}
                      </Table.Cell>
                      <Table.Cell className="text-center text-[#a0aec0]">
                        {manager.pointsLastRound ?? '-'}
                      </Table.Cell>
                      <Table.Cell className="text-[#a0aec0]">
                        {manager.firstName || '-'}
                      </Table.Cell>
                      <Table.Cell className="text-[#a0aec0]">
                        {manager.lastName || '-'}
                      </Table.Cell>
                      <Table.Cell>
                        <Chip
                          size="sm"
                          color={manager.paymentState === 'PAID' ? 'success' : 'danger'}
                          variant="soft"
                        >
                          {paymentStateLabels[manager.paymentState as keyof typeof paymentStateLabels] || manager.paymentState}
                        </Chip>
                      </Table.Cell>
                      <Table.Cell className="text-right font-medium text-[#f5f5f5]">
                        {manager.teamValue ? (manager.teamValue / 1000000).toFixed(2) : '0.00'} Mio.
                      </Table.Cell>
                    </Table.Row>
                  ))
                ) : (
                  <Table.Row>
                    <Table.Cell colSpan={8} className="text-center text-[#6b7280] py-8">
                      Keine Manager gefunden
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>

        {filteredManagers && (
          <div className="mt-4 text-sm text-[#6b7280]">
            {filteredManagers.length} von {managers?.length || 0} Managern
          </div>
        )}
      </Card>
    </div>
  )
}