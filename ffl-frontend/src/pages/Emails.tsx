import { useState, useMemo, useCallback } from 'react'
import { Card, Button, Input } from '@heroui/react'
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
    if (sortKey !== column) return <span className="text-[#6b7280] ml-1">⇅</span>
    return <span className="text-[#c9a66b] ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
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

  if (isLoading) return <div className="text-center py-8 text-[#a0aec0]">Laden...</div>
  if (fetchError) return <div className="text-center py-8 text-[#e05252]">Fehler beim Laden</div>

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#f5f5f5] mb-6">
        E-Mail-Adressen <span className="text-lg text-[#6b7280]">({emails?.length ?? 0})</span>
      </h1>

      <Card className="p-4 bg-[#1a2028] border border-[#2d3748]">
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <Input
            placeholder="E-Mail suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
          />
          <Button
            onPress={() => { setShowCreateDialog(true); setNewEmail(''); setError('') }}
            className="bg-[#c9a66b] text-[#0f1419] font-medium"
          >
            Neue E-Mail
          </Button>
          <Button
            onPress={() => { setShowImportDialog(true); setImportText(''); setError('') }}
            className="bg-[#242d38] text-[#c9a66b] border border-[#3d4a5c]"
          >
            Importieren
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2d3748]">
                <th
                  className="px-4 py-2 text-left cursor-pointer hover:text-[#c9a66b] text-[#a0aec0]"
                  onClick={() => handleSort('id')}
                >
                  # <SortIcon column="id" />
                </th>
                <th
                  className="px-4 py-2 text-left cursor-pointer hover:text-[#c9a66b] text-[#a0aec0]"
                  onClick={() => handleSort('email')}
                >
                  E-Mail <SortIcon column="email" />
                </th>
                <th className="px-4 py-2 text-right text-[#a0aec0]">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {sortedEmails.length > 0 ? (
                sortedEmails.map((email) => (
                  <tr key={email.id} className="hover:bg-[#242d38] border-b border-[#2d3748]">
                    <td className="px-4 py-2 text-[#6b7280]">{email.id}</td>
                    <td className="px-4 py-2 text-[#f5f5f5]">{email.email}</td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[#e05252] border-[#e05252]"
                        onPress={() => { setDeleteTarget(email); setShowDeleteDialog(true); setError('') }}
                      >
                        Löschen
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center text-[#6b7280] py-8">
                    Keine E-Mail-Adressen gefunden
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {sortedEmails.length > 0 && (
          <div className="mt-4 text-sm text-[#6b7280]">
            {sortedEmails.length} E-Mail-Adress{sortedEmails.length === 1 ? 'e' : 'en'}
          </div>
        )}
      </Card>

      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 bg-[#1a2028] border border-[#2d3748] w-full max-w-md">
            <h2 className="text-xl font-bold text-[#f5f5f5] mb-4">Neue E-Mail-Adresse</h2>
            {error && <p className="text-[#e05252] mb-3 text-sm">{error}</p>}
            <Input
              type="email"
              placeholder="email@beispiel.de"
              value={newEmail}
              onChange={(e) => { setNewEmail(e.target.value); setError('') }}
              className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5] mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onPress={() => setShowCreateDialog(false)} className="text-[#a0aec0]">
                Abbrechen
              </Button>
              <Button
                onPress={handleCreate}
                isDisabled={createEmail.isPending}
                className="bg-[#c9a66b] text-[#0f1419] font-medium"
              >
                {createEmail.isPending ? 'Wird angelegt...' : 'Anlegen'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 bg-[#1a2028] border border-[#2d3748] w-full max-w-lg">
            <h2 className="text-xl font-bold text-[#f5f5f5] mb-4">E-Mail-Adressen importieren</h2>
            <p className="text-[#a0aec0] text-sm mb-3">
              E-Mail-Adressen komma- oder zeilengetrennt eingeben. Duplikate und ungültige Adressen werden übersprungen.
            </p>
            {error && <p className="text-[#e05252] mb-3 text-sm">{error}</p>}
            <textarea
              placeholder={"email1@beispiel.de, email2@beispiel.de\nemail3@beispiel.de"}
              value={importText}
              onChange={(e) => { setImportText(e.target.value); setError('') }}
              className="w-full h-40 bg-[#242d38] border border-[#3d4a5c] rounded-lg p-3 text-[#f5f5f5] resize-none focus:outline-none focus:border-[#c9a66b]"
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onPress={() => setShowImportDialog(false)} className="text-[#a0aec0]">
                Abbrechen
              </Button>
              <Button
                onPress={handleImport}
                isDisabled={bulkCreateEmails.isPending}
                className="bg-[#c9a66b] text-[#0f1419] font-medium"
              >
                {bulkCreateEmails.isPending ? 'Wird importiert...' : 'Importieren'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {showDeleteDialog && deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 bg-[#1a2028] border border-[#2d3748] w-full max-w-md">
            <h2 className="text-xl font-bold text-[#f5f5f5] mb-4">E-Mail-Adresse löschen</h2>
            <p className="text-[#a0aec0] mb-6">
              Möchten Sie die E-Mail-Adresse <strong className="text-[#f5f5f5]">{deleteTarget.email}</strong> wirklich löschen?
            </p>
            {error && <p className="text-[#e05252] mb-3 text-sm">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onPress={() => { setShowDeleteDialog(false); setDeleteTarget(null) }} className="text-[#a0aec0]">
                Abbrechen
              </Button>
              <Button
                onPress={handleDeleteConfirm}
                isDisabled={deleteEmail.isPending}
                className="bg-[#e05252] text-[#f5f5f5]"
              >
                {deleteEmail.isPending ? 'Wird gelöscht...' : 'Löschen'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}