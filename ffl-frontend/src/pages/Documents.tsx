import { useState, useMemo, useRef } from 'react'
import { Navigate, Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useDocuments, useUploadDocument, useDeleteDocument, useUpdateDocumentDescription } from '../hooks/useDocuments'
import { documentApi } from '../api/documents'
import { usePublicCurrentSeason } from '../hooks/useSeasons'
import type { Document } from '../types'
import Button from '../components/Button'
import BackButton from '../components/BackButton'
import SortIcon from '../components/SortIcon'
import DocumentDescriptionDialog from '../components/DocumentDescriptionDialog'
import { TableHead, ThSortable, Th, TableBody } from '../components/Table'
import useIsMobile from '../hooks/useIsMobile'
import { getApiErrorMessage } from '../utils/apiError'

type SortKey = 'filename' | 'contentType' | 'fileSize' | 'uploadedAt' | 'description'
type SortOrder = 'asc' | 'desc'

const ACCEPTED_TYPES = '.pdf,.txt,.png,.jpg,.jpeg,.mp4,application/pdf,text/plain,image/png,image/jpeg,video/mp4'
const MAX_FILE_SIZE_MB = 100
const ALLOWED_EXTENSIONS = ['pdf', 'txt', 'png', 'jpg', 'jpeg', 'mp4']

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatContentType(ct: string): string {
  switch (ct) {
    case 'application/pdf': return 'PDF'
    case 'text/plain': return 'TXT'
    case 'image/png': return 'PNG'
    case 'image/jpeg': return 'JPG'
    case 'video/mp4': return 'MP4'
    default: return ct
  }
}

function contentTypeIcon(ct: string): string {
  switch (ct) {
    case 'application/pdf': return 'sap-icon-pdf-attachment'
    case 'text/plain': return 'sap-icon-document-text'
    case 'image/png':
    case 'image/jpeg': return 'sap-icon-attachment-photo'
    case 'video/mp4': return 'sap-icon-video'
    default: return 'sap-icon-document'
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return iso
  }
}

function docShareUrl(doc: Document): string {
  return `${window.location.origin}/api/public/documents/${doc.shareToken}`
}

type DocRequestMode = 'open' | 'download'

function DocumentCard({ doc, isAnyLoading, isLoadingThis, onRequest }: {
  doc: Document
  isAnyLoading: boolean
  isLoadingThis: boolean
  onRequest: (doc: Document, mode: DocRequestMode) => void
}) {
  return (
    <div className="card p-4 bg-surface border border-border">
      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          {isLoadingThis ? (
            <span className="inline-flex items-center gap-2 text-muted text-sm">
              <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
              Dokument wird geladen...
            </span>
          ) : (
            <button
              onClick={() => onRequest(doc, 'open')}
              disabled={isAnyLoading}
              className="font-semibold link truncate block w-full text-left disabled:cursor-not-allowed"
            >
              {doc.filename}
            </button>
          )}
          {doc.description && (
            <p className="text-sm text-muted mt-2 line-clamp-2">{doc.description}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Documents() {
  const isMobile = useIsMobile()
  const { user, isAuthenticated } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('uploadedAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [loadingDocId, setLoadingDocId] = useState<number | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [editingDoc, setEditingDoc] = useState<Document | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: publicSeason, isLoading: isLoadingSeason } = usePublicCurrentSeason()
  const guestAccessAllowed = publicSeason?.seasonState === 'BEFORE_SEASON'
  const accessAllowed = isAuthenticated || guestAccessAllowed

  const { data: documents, isLoading, error } = useDocuments(accessAllowed)
  const uploadMutation = useUploadDocument()
  const deleteMutation = useDeleteDocument()
  const updateDescriptionMutation = useUpdateDocumentDescription()

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const handleDocRequest = (doc: Document, mode: DocRequestMode) => {
    if (loadingDocId !== null) return
    if (!isAuthenticated) {
      window.open(docShareUrl(doc), '_blank')
      return
    }
    setLoadingDocId(doc.id)
    documentApi.download(doc.id)
      .then(res => {
        const url = URL.createObjectURL(res.data)
        const a = document.createElement('a')
        a.href = url
        if (mode === 'download') {
          a.download = doc.filename
        } else {
          a.target = '_blank'
          a.rel = 'noopener'
        }
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 30000)
      })
      .catch(() => {
        if (mode === 'open') {
          window.open(docShareUrl(doc), '_blank')
        } else {
          alert('Download fehlgeschlagen')
        }
      })
      .finally(() => setLoadingDocId(null))
  }

  const filteredDocs = useMemo(() => {
    if (!documents) return []

    const term = searchTerm.toLowerCase()
    const filtered = documents.filter(doc => {
      return doc.filename.toLowerCase().includes(term) ||
        formatContentType(doc.contentType).toLowerCase().includes(term) ||
        (doc.description ?? '').toLowerCase().includes(term)
    })

    return filtered.sort((a, b) => {
      let comparison = 0
      switch (sortKey) {
        case 'filename':
          comparison = a.filename.localeCompare(b.filename)
          break
        case 'contentType':
          comparison = a.contentType.localeCompare(b.contentType)
          break
        case 'fileSize':
          comparison = a.fileSize - b.fileSize
          break
        case 'uploadedAt':
          comparison = a.uploadedAt.localeCompare(b.uploadedAt)
          break
        case 'description':
          comparison = (a.description ?? '').localeCompare(b.description ?? '')
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [documents, searchTerm, sortKey, sortOrder])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      alert('Nur PDF, TXT, PNG, JPG und MP4 Dateien sind erlaubt')
      return
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      alert('Datei darf maximal 100 MB groß sein')
      return
    }
    setPendingFile(file)
  }

  const handleUploadConfirm = async (description: string) => {
    if (!pendingFile) return
    try {
      await uploadMutation.mutateAsync({ file: pendingFile, description })
      setPendingFile(null)
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Upload fehlgeschlagen: ' + getApiErrorMessage(err, 'Unbekannter Fehler'))
    }
  }

  const handleEditConfirm = async (description: string) => {
    if (!editingDoc) return
    try {
      await updateDescriptionMutation.mutateAsync({ id: editingDoc.id, description })
      setEditingDoc(null)
    } catch (err) {
      alert('Speichern fehlgeschlagen: ' + getApiErrorMessage(err, 'Unbekannter Fehler'))
    }
  }

  const handleCopyLink = async (id: number) => {
    const doc = documents?.find(d => d.id === id)
    if (!doc) return
    try {
      await navigator.clipboard.writeText(docShareUrl(doc))
      setCopiedId(id)
      setTimeout(() => setCopiedId(prev => (prev === id ? null : prev)), 2000)
    } catch {
      alert('Link kopieren fehlgeschlagen')
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Möchten Sie dieses Dokument wirklich löschen?')) {
      try {
        await deleteMutation.mutateAsync(id)
      } catch (err) {
        alert('Löschen fehlgeschlagen: ' + getApiErrorMessage(err, 'Unbekannter Fehler'))
      }
    }
  }

  if (!isAuthenticated && isLoadingSeason) {
    return <div className="text-center py-8 text-muted">Laden...</div>
  }

  if (!isAuthenticated && !guestAccessAllowed) {
    return <Navigate to="/login" replace />
  }

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

  return (
    <div className="md:h-full md:flex md:flex-col md:min-h-0">
      <BackButton to="/" className="mb-4 md:shrink-0" />
      {!isAuthenticated && (
        <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-border md:shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <i className="sap-icon sap-icon-documents text-[28px] text-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-lg font-bold text-foreground leading-tight">FFL &ndash; Dokumente</p>
              <p className="text-sm text-muted">Fantasy Football League{publicSeason?.name ? ` \u2013 ${publicSeason.name}` : ''}</p>
            </div>
          </div>
          <RouterLink to="/login" className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover hover:underline font-semibold shrink-0">
            <i className="sap-icon sap-icon-log text-base" />
            Zum Login
          </RouterLink>
        </div>
      )}
      <div className="px-3 py-4 md:p-6 bg-surface border border-border rounded-card mb-6 md:mb-0 w-full md:w-fit max-w-full md:flex-1 md:min-h-0 md:flex md:flex-col">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 md:shrink-0">
          {!isMobile && (
            <h2 className="text-xl font-semibold text-foreground">Dokumente ({filteredDocs.length})</h2>
          )}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <i className="sap-icon sap-icon-search text-[14px] absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Dokument suchen..."
                className="input-field control pl-8 pr-3 py-2 rounded-control text-sm w-full"
              />
            </div>
            {!isMobile && isAdmin && (
              <Button
                onClick={() => fileInputRef.current?.click()}
                size={isMobile ? 'sm' : 'input'}
                disabled={uploadMutation.isPending}
                className="w-full md:w-auto"
              >
                {uploadMutation.isPending ? 'Lade hoch...' : '+ Hochladen'}
              </Button>
            )}
          </div>
        </div>

        {searchTerm !== '' && (
          <div className="flex items-center gap-3 flex-wrap mb-4 md:shrink-0">
            <button
              onClick={() => setSearchTerm('')}
              className="p-1 rounded-control text-subtle hover:text-danger transition-colors"
              title="Filter zurücksetzen"
            >
              <i className="sap-icon sap-icon-decline text-[14px]" />
            </button>
          </div>
        )}

        {!isMobile && (
          <>
            <div className="flex-1 min-h-0 overflow-auto rounded-card border border-border w-fit max-w-full">
              <table>
                <TableHead>
                  <tr>
                    <ThSortable onClick={() => handleSort('filename')}>
                      Dateiname<SortIcon column="filename" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    <ThSortable onClick={() => handleSort('contentType')}>
                      Typ<SortIcon column="contentType" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    <ThSortable align="right" numeric onClick={() => handleSort('fileSize')}>
                      Größe<SortIcon column="fileSize" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    <ThSortable onClick={() => handleSort('description')}>
                      Beschreibung<SortIcon column="description" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    <ThSortable onClick={() => handleSort('uploadedAt')}>
                      Datum<SortIcon column="uploadedAt" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    <Th align="right">
                      Aktionen
                    </Th>
                  </tr>
                </TableHead>
                <TableBody>
                  {filteredDocs.length > 0 ? (
                    filteredDocs.map((doc, index) => (
                      <tr key={doc.id} className={`hover:bg-card-hover border-b border-border ${index % 2 === 1 ? 'bg-zebra' : ''}`}>
                        <td className="px-3 py-2">
                          {loadingDocId === doc.id ? (
                            <span className="inline-flex items-center gap-2 text-muted text-sm">
                              <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                              Dokument wird geladen...
                            </span>
                          ) : (
                            <button
                              onClick={() => handleDocRequest(doc, 'open')}
                              disabled={loadingDocId !== null}
                              className="link font-medium inline-flex items-center gap-2 disabled:cursor-not-allowed"
                            >
                              <i className={`sap-icon ${contentTypeIcon(doc.contentType)} text-[16px] shrink-0`} />
                              {doc.filename}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted">
                          {formatContentType(doc.contentType)}
                        </td>
                        <td className="px-3 py-2 text-right text-foreground tabular-nums">
                          {formatFileSize(doc.fileSize)}
                        </td>
                        <td className="px-3 py-2 text-muted max-w-[320px]">
                          {doc.description ? (
                            <span className="line-clamp-2">{doc.description}</span>
                          ) : (
                            <span className="text-subtle">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted">
                          {formatDate(doc.uploadedAt)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleCopyLink(doc.id)}
                              className="p-1.5 rounded-control text-muted hover:text-primary hover:bg-accent-muted transition-colors"
                              title="Link kopieren"
                            >
                              <i className={`sap-icon ${copiedId === doc.id ? 'sap-icon-status-completed' : 'sap-icon-chain-link'} text-[16px]`} />
                            </button>
                            <button
                              onClick={() => handleDocRequest(doc, 'download')}
                              disabled={loadingDocId !== null}
                              className="p-1.5 rounded-control text-muted hover:text-primary hover:bg-accent-muted transition-colors disabled:cursor-not-allowed"
                              title={loadingDocId === doc.id ? 'Dokument wird geladen...' : 'Herunterladen'}
                            >
                              {loadingDocId === doc.id ? (
                                <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin block" />
                              ) : (
                                <i className="sap-icon sap-icon-download text-[16px]" />
                              )}
                            </button>
                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => setEditingDoc(doc)}
                                  className="p-1.5 rounded-control text-muted hover:text-primary hover:bg-accent-muted transition-colors"
                                  title="Beschreibung bearbeiten"
                                >
                                  <i className="sap-icon sap-icon-edit text-[16px]" />
                                </button>
                                <Button
                                  variant="negative"
                                  size={isMobile ? 'sm' : 'input'}
                                  onClick={() => handleDelete(doc.id)}
                                  disabled={deleteMutation.isPending}
                                >
                                  Löschen
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center text-subtle py-8">
                        Keine Dokumente gefunden
                      </td>
                    </tr>
                  )}
                </TableBody>
              </table>
            </div>
          </>
        )}

        {isMobile && (
          <div>
            <div className="grid gap-4">
              {filteredDocs.length > 0 ? (
                filteredDocs.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    isAnyLoading={loadingDocId !== null}
                    isLoadingThis={loadingDocId === doc.id}
                    onRequest={handleDocRequest}
                  />
                ))
              ) : (
                <div className="text-center text-subtle py-8">
                  Keine Dokumente gefunden
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {isAdmin && (
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={handleFileSelect}
        />
      )}

      <DocumentDescriptionDialog
        isOpen={pendingFile !== null}
        onClose={() => setPendingFile(null)}
        title={pendingFile ? `Dokument hochladen: ${pendingFile.name}` : 'Dokument hochladen'}
        submitLabel="Hochladen"
        initialDescription=""
        isSaving={uploadMutation.isPending}
        onConfirm={handleUploadConfirm}
      />

      <DocumentDescriptionDialog
        isOpen={editingDoc !== null}
        onClose={() => setEditingDoc(null)}
        title="Beschreibung bearbeiten"
        submitLabel="Speichern"
        initialDescription={editingDoc?.description ?? ''}
        isSaving={updateDescriptionMutation.isPending}
        onConfirm={handleEditConfirm}
      />

      <div className="h-10 md:hidden" />
    </div>
  )
}
