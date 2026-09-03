import { useState, useMemo, useCallback } from 'react'
import { useEmails, useCreateEmail, useBulkCreateEmails, useDeleteEmail } from '../hooks/useEmails'
import { useCurrentSeason } from '../hooks/useSeasons'
import { useManagersBySeason } from '../hooks/useManagers'
import BackButton from '../components/BackButton'
import CardContainer from '../components/CardContainer'
import SortIcon from '../components/SortIcon'
import { TableContent, TableHead, ThSortable, Th, TableBody } from '../components/Table'
import FormCard from '../components/FormCard'
import Button from '../components/Button'
import useIsMobile from '../hooks/useIsMobile'
import type { EmailAddress } from '../types'

type SortKey = 'id' | 'email' | 'participant' | 'teamCount'
type ParticipantFilter = 'all' | 'yes' | 'no'

export default function Emails() {
  const isMobile = useIsMobile()
  const [searchTerm, setSearchTerm] = useState('')
  const [participantFilter, setParticipantFilter] = useState<ParticipantFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('email')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<EmailAddress | null>(null)
  const [newEmail, setNewEmail] = useState('')
  const [importText, setImportText] = useState('')
  const [error, setError] = useState('')

  const { data: emails, isLoading, error: fetchError } = useEmails(searchTerm || undefined)
  const { data: currentSeason } = useCurrentSeason()
  const { data: seasonManagers } = useManagersBySeason(currentSeason?.id ?? 0)
  const createEmail = useCreateEmail()
  const bulkCreateEmails = useBulkCreateEmails()
  const deleteEmail = useDeleteEmail()

  const teamCountByEmail = useMemo(() => {
    const map = new Map<string, number>()
    for (const manager of seasonManagers ?? []) {
      const email = manager.email?.toLowerCase()
      if (!email) continue
      map.set(email, (map.get(email) ?? 0) + 1)
    }
    return map
  }, [seasonManagers])

  const getTeamCount = useCallback(
    (email: string) => teamCountByEmail.get(email.toLowerCase()) ?? 0,
    [teamCountByEmail],
  )

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const sortedEmails = useMemo(() => {
    if (!emails) return []
    const filtered = emails.filter((email) => {
      if (participantFilter === 'all') return true
      const isParticipant = (teamCountByEmail.get(email.email.toLowerCase()) ?? 0) > 0
      return participantFilter === 'yes' ? isParticipant : !isParticipant
    })
    return filtered.sort((a, b) => {
      let comparison = 0
      switch (sortKey) {
        case 'id':
          comparison = a.id - b.id
          break
        case 'email':
          comparison = a.email.localeCompare(b.email)
          break
        case 'participant': {
          const aCount = teamCountByEmail.get(a.email.toLowerCase()) ?? 0
          const bCount = teamCountByEmail.get(b.email.toLowerCase()) ?? 0
          comparison = (aCount > 0 ? 1 : 0) - (bCount > 0 ? 1 : 0)
          break
        }
        case 'teamCount': {
          const aCount = teamCountByEmail.get(a.email.toLowerCase()) ?? 0
          const bCount = teamCountByEmail.get(b.email.toLowerCase()) ?? 0
          comparison = aCount - bCount
          break
        }
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [emails, participantFilter, teamCountByEmail, sortKey, sortOrder])

  const totalTeams = useMemo(
    () => sortedEmails.reduce((sum, e) => sum + getTeamCount(e.email), 0),
    [sortedEmails, getTeamCount],
  )

  const handleCreate = useCallback(async () => {
    setError('')
    if (!newEmail.trim()) {
      setError('Bitte E-Mail-Adresse eingeben')
      return
    }
    try {
      await createEmail.mutateAsync(newEmail.trim())
      setNewEmail('')
      setShowCreateDialog(false)
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { status?: number } }).response
        if (response?.status === 400) {
          setError('Ungültige oder bereits vorhandene E-Mail-Adresse')
        } else {
          setError('Fehler beim Anlegen der E-Mail-Adresse')
        }
      } else {
        setError('Fehler beim Anlegen der E-Mail-Adresse')
      }
    }
  }, [newEmail, createEmail])

  const handleImport = useCallback(async () => {
    setError('')
    if (!importText.trim()) {
      setError('Bitte E-Mail-Adressen eingeben')
      return
    }
    const emailList = importText
      .split(/[,\n;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0)
    if (emailList.length === 0) {
      setError('Keine E-Mail-Adressen gefunden')
      return
    }
    try {
      await bulkCreateEmails.mutateAsync(emailList)
      setImportText('')
      setShowImportDialog(false)
    } catch {
      setError('Fehler beim Importieren der E-Mail-Adressen')
    }
  }, [importText, bulkCreateEmails])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteEmail.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
      setShowDeleteDialog(false)
    } catch {
      setError('Fehler beim Löschen der E-Mail-Adresse')
    }
  }, [deleteTarget, deleteEmail])

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (fetchError) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

  const hasActiveFilter = searchTerm !== '' || participantFilter !== 'all'

  return (
    <div className="md:h-full md:flex md:flex-col md:min-h-0">
      <BackButton to="/" className="mb-4 md:shrink-0" />

      <CardContainer className="md:flex-1 md:min-h-0">
        <div className="flex items-center gap-3 px-5 py-2.5 bg-elevated/50 border-b border-border flex-wrap md:shrink-0">
          <div className="relative flex-1 min-w-[180px] max-w-[280px]">
            <i className="sap-icon sap-icon-search text-[14px] absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              type="text"
              placeholder="E-Mail suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-8 pr-3 py-1.5 text-xs w-full"
            />
          </div>

          <label className="flex items-center gap-1.5 text-xs text-muted">
            Teilnehmer:
            <select
              value={participantFilter}
              onChange={(e) => setParticipantFilter(e.target.value as ParticipantFilter)}
              className="input-field py-1.5 pl-2 pr-6 text-xs"
            >
              <option value="all">Alle</option>
              <option value="yes">Ja</option>
              <option value="no">Nein</option>
            </select>
          </label>

          <Button
            variant="emphasized"
            size={isMobile ? 'sm' : 'input'}
            onClick={() => { setShowCreateDialog(true); setNewEmail(''); setError('') }}
          >
            + Neue E-Mail
          </Button>
          <Button
            variant="ghost"
            size={isMobile ? 'sm' : 'input'}
            onClick={() => { setShowImportDialog(true); setImportText(''); setError('') }}
          >
            + Importieren
          </Button>

          <span className="ml-auto text-xs text-muted">
            Teams gesamt: <span className="font-semibold text-foreground">{totalTeams}</span>
          </span>

          {hasActiveFilter && (
            <button
              onClick={() => { setSearchTerm(''); setParticipantFilter('all') }}
              className="p-1 rounded-badge text-subtle hover:text-danger transition-colors"
              title="Filter zurücksetzen"
            >
              <i className="sap-icon sap-icon-decline text-[14px]" />
            </button>
          )}
        </div>

        <TableContent scroll>
          <table className="w-full">
            <TableHead>
              <tr>
                <ThSortable onClick={() => handleSort('id')}>
                  #<SortIcon column="id" activeKey={sortKey} order={sortOrder} />
                </ThSortable>
                <ThSortable onClick={() => handleSort('email')}>
                  E-Mail<SortIcon column="email" activeKey={sortKey} order={sortOrder} />
                </ThSortable>
                <ThSortable onClick={() => handleSort('participant')}>
                  Teilnehmer diesjähriger Saison<SortIcon column="participant" activeKey={sortKey} order={sortOrder} />
                </ThSortable>
                <ThSortable onClick={() => handleSort('teamCount')}>
                  Anzahl Teams<SortIcon column="teamCount" activeKey={sortKey} order={sortOrder} />
                </ThSortable>
                <Th align="right">Aktionen</Th>
              </tr>
            </TableHead>
            <TableBody>
              {sortedEmails.length > 0 ? (
                sortedEmails.map((email) => {
                  const teamCount = getTeamCount(email.email)
                  const isParticipant = teamCount > 0
                  return (
                    <tr key={email.id} className="border-b border-border hover:bg-card-hover">
                      <td className="px-2 py-2 md:px-3 text-subtle">{email.id}</td>
                      <td className="px-2 py-2 md:px-3 text-foreground">{email.email}</td>
                      <td className="px-2 py-2 md:px-3">
                        {isParticipant ? (
                          <span className="text-success font-medium">Ja</span>
                        ) : (
                          <span className="text-muted">Nein</span>
                        )}
                      </td>
                      <td className={`px-3 py-2 ${teamCount > 0 ? 'text-foreground' : 'text-subtle'}`}>
                        {teamCount}
                      </td>
                      <td className="px-2 py-2 md:px-3 text-right">
                        <Button
                          variant="negative"
                          size={isMobile ? 'sm' : 'input'}
                          onClick={() => { setDeleteTarget(email); setShowDeleteDialog(true); setError('') }}
                        >
                          Löschen
                        </Button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="text-center text-subtle py-8">
                    Keine E-Mail-Adressen gefunden
                  </td>
                </tr>
              )}
            </TableBody>
          </table>
        </TableContent>
      </CardContainer>

      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <FormCard className="w-full max-w-md">
            <h2 className="text-xl font-bold text-foreground mb-4">Neue E-Mail-Adresse</h2>
            {error && <p className="text-danger mb-3 text-sm">{error}</p>}
            <input
              type="email"
              placeholder="email@beispiel.de"
              value={newEmail}
              onChange={(e) => { setNewEmail(e.target.value); setError('') }}
              className="input-field w-full px-3 py-2 rounded-badge focus:outline-none mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>
                Abbrechen
              </Button>
              <Button
                variant="emphasized"
                onClick={handleCreate}
                disabled={createEmail.isPending}
              >
                {createEmail.isPending ? 'Wird angelegt...' : 'Anlegen'}
              </Button>
            </div>
          </FormCard>
        </div>
      )}

      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <FormCard className="w-full max-w-lg">
            <h2 className="text-xl font-bold text-foreground mb-4">E-Mail-Adressen importieren</h2>
            <p className="text-muted text-sm mb-3">
              E-Mail-Adressen komma- oder zeilengetrennt eingeben. Duplikate und ungültige Adressen werden übersprungen.
            </p>
            {error && <p className="text-danger mb-3 text-sm">{error}</p>}
            <textarea
              placeholder={"email1@beispiel.de, email2@beispiel.de\nemail3@beispiel.de"}
              value={importText}
              onChange={(e) => { setImportText(e.target.value); setError('') }}
              className="w-full h-40 bg-elevated border border-border-hover rounded-card p-3 text-foreground resize-none focus:outline-none focus:border-accent"
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setShowImportDialog(false)}>
                Abbrechen
              </Button>
              <Button
                variant="emphasized"
                onClick={handleImport}
                disabled={bulkCreateEmails.isPending}
              >
                {bulkCreateEmails.isPending ? 'Wird importiert...' : 'Importieren'}
              </Button>
            </div>
          </FormCard>
        </div>
      )}

      {showDeleteDialog && deleteTarget && (
        <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4 overflow-hidden">
          <img
            src="/background2627.png"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="relative w-full max-w-md p-6 bg-surface/70 backdrop-blur-md border border-border rounded-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-foreground mb-4">E-Mail-Adresse löschen</h2>
            <p className="text-muted mb-6">
              Möchten Sie die E-Mail-Adresse <strong className="text-foreground">{deleteTarget.email}</strong> wirklich löschen?
            </p>
            {error && <p className="text-danger mb-3 text-sm">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setShowDeleteDialog(false); setDeleteTarget(null) }}>
                Abbrechen
              </Button>
              <Button
                variant="negative"
                onClick={handleDeleteConfirm}
                disabled={deleteEmail.isPending}
              >
                {deleteEmail.isPending ? 'Wird gelöscht...' : 'Löschen'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="h-10 md:hidden" />
    </div>
  )
}
