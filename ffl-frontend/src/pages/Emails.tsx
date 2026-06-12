import { useState, useMemo, useCallback } from 'react'
import { Settings } from 'lucide-react'
import { useEmails, useCreateEmail, useBulkCreateEmails, useDeleteEmail } from '../hooks/useEmails'
import type { EmailAddress } from '../types'

type SortKey = 'id' | 'email'
type SortOrder = 'asc' | 'desc'

export default function Emails() {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('email')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<EmailAddress | null>(null)
  const [newEmail, setNewEmail] = useState('')
  const [importText, setImportText] = useState('')
  const [error, setError] = useState('')

  const { data: emails, isLoading, error: fetchError } = useEmails(searchTerm || undefined)
  const createEmail = useCreateEmail()
  const bulkCreateEmails = useBulkCreateEmails()
  const deleteEmail = useDeleteEmail()

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

  const sortedEmails = useMemo(() => {
    if (!emails) return []
    return [...emails].sort((a, b) => {
      let comparison = 0
      switch (sortKey) {
        case 'id':
          comparison = a.id - b.id
          break
        case 'email':
          comparison = a.email.localeCompare(b.email)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [emails, sortKey, sortOrder])

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

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Settings size={28} className="text-accent" />
        <h1 className="text-2xl font-bold text-accent">
          E-Mail-Adressen <span className="text-lg text-subtle">({emails?.length ?? 0})</span>
        </h1>
      </div>

      <div className="p-4 bg-surface border border-border">
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <input
            placeholder="E-Mail suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field max-w-md w-full px-3 py-2 rounded focus:outline-none bg-elevated border-border-hover text-foreground"
          />
          <button
            onClick={() => { setShowCreateDialog(true); setNewEmail(''); setError('') }}
            className="bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded hover:bg-button-primary-hover transition-colors"
          >
            + Neue E-Mail
          </button>
          <button
            onClick={() => { setShowImportDialog(true); setImportText(''); setError('') }}
            className="bg-elevated text-accent border border-border-hover text-xs font-medium px-2 py-1 rounded hover:bg-default transition-colors"
          >
            + Importieren
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th
                  className="px-4 py-2 text-left cursor-pointer hover:text-accent text-muted"
                  onClick={() => handleSort('id')}
                >
                  # <SortIcon column="id" />
                </th>
                <th
                  className="px-4 py-2 text-left cursor-pointer hover:text-accent text-muted"
                  onClick={() => handleSort('email')}
                >
                  E-Mail <SortIcon column="email" />
                </th>
                <th className="px-4 py-2 text-right text-muted">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {sortedEmails.length > 0 ? (
                sortedEmails.map((email) => (
                  <tr key={email.id} className="hover:bg-elevated border-b border-border">
                    <td className="px-4 py-2 text-subtle">{email.id}</td>
                    <td className="px-4 py-2 text-foreground">{email.email}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        className="text-danger border border-danger px-3 py-1 text-sm rounded hover:bg-danger/10 transition-colors"
                        onClick={() => { setDeleteTarget(email); setShowDeleteDialog(true); setError('') }}
                      >
                        Löschen
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center text-subtle py-8">
                    Keine E-Mail-Adressen gefunden
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {sortedEmails.length > 0 && (
          <div className="mt-4 text-sm text-subtle">
            {sortedEmails.length} E-Mail-Adress{sortedEmails.length === 1 ? 'e' : 'en'}
          </div>
        )}
      </div>

      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="p-6 bg-surface border border-border w-full max-w-md">
            <h2 className="text-xl font-bold text-foreground mb-4">Neue E-Mail-Adresse</h2>
            {error && <p className="text-danger mb-3 text-sm">{error}</p>}
            <input
              type="email"
              placeholder="email@beispiel.de"
              value={newEmail}
              onChange={(e) => { setNewEmail(e.target.value); setError('') }}
              className="input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated border-border-hover text-foreground mb-4"
            />
            <div className="flex justify-end gap-2">
              <button className="button-secondary px-4 py-2 rounded transition-colors text-muted" onClick={() => setShowCreateDialog(false)}>
                Abbrechen
              </button>
              <button
                onClick={handleCreate}
                disabled={createEmail.isPending}
                className="bg-primary text-background font-medium px-4 py-2 rounded hover:bg-button-primary-hover transition-colors disabled:opacity-50"
              >
                {createEmail.isPending ? 'Wird angelegt...' : 'Anlegen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="p-6 bg-surface border border-border w-full max-w-lg">
            <h2 className="text-xl font-bold text-foreground mb-4">E-Mail-Adressen importieren</h2>
            <p className="text-muted text-sm mb-3">
              E-Mail-Adressen komma- oder zeilengetrennt eingeben. Duplikate und ungültige Adressen werden übersprungen.
            </p>
            {error && <p className="text-danger mb-3 text-sm">{error}</p>}
            <textarea
              placeholder={"email1@beispiel.de, email2@beispiel.de\nemail3@beispiel.de"}
              value={importText}
              onChange={(e) => { setImportText(e.target.value); setError('') }}
              className="w-full h-40 bg-elevated border border-border-hover rounded-lg p-3 text-foreground resize-none focus:outline-none focus:border-accent"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button className="button-secondary px-4 py-2 rounded transition-colors text-muted" onClick={() => setShowImportDialog(false)}>
                Abbrechen
              </button>
              <button
                onClick={handleImport}
                disabled={bulkCreateEmails.isPending}
                className="bg-primary text-background font-medium px-4 py-2 rounded hover:bg-button-primary-hover transition-colors disabled:opacity-50"
              >
                {bulkCreateEmails.isPending ? 'Wird importiert...' : 'Importieren'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteDialog && deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="p-6 bg-surface border border-border w-full max-w-md">
            <h2 className="text-xl font-bold text-foreground mb-4">E-Mail-Adresse löschen</h2>
            <p className="text-muted mb-6">
              Möchten Sie die E-Mail-Adresse <strong className="text-foreground">{deleteTarget.email}</strong> wirklich löschen?
            </p>
            {error && <p className="text-danger mb-3 text-sm">{error}</p>}
            <div className="flex justify-end gap-2">
              <button className="button-secondary px-4 py-2 rounded transition-colors text-muted" onClick={() => { setShowDeleteDialog(false); setDeleteTarget(null) }}>
                Abbrechen
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteEmail.isPending}
                className="bg-danger text-foreground px-4 py-2 rounded hover:bg-danger/80 transition-colors disabled:opacity-50"
              >
                {deleteEmail.isPending ? 'Wird gelöscht...' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
