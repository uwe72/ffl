import { useState, useMemo, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useDocuments, useUploadDocument, useDeleteDocument } from '../hooks/useDocuments'
import type { Document } from '../types'
import Button from '../components/Button'
import SortIcon from '../components/SortIcon'
import { TableHead, ThSortable, Th, TableBody } from '../components/Table'
import useIsMobile from '../hooks/useIsMobile'

type SortKey = 'filename' | 'contentType' | 'fileSize' | 'uploadedAt' | 'uploadedBy'
type SortOrder = 'asc' | 'desc'

const ACCEPTED_TYPES = '.pdf,.txt,.png,.jpg,.jpeg,application/pdf,text/plain,image/png,image/jpeg'

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
    default: return ct
  }
}

function contentTypeIcon(ct: string): string {
  switch (ct) {
    case 'application/pdf': return 'sap-icon-pdf-attachment'
    case 'text/plain': return 'sap-icon-document-text'
    case 'image/png':
    case 'image/jpeg': return 'sap-icon-photo'
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

function DocumentCard({ doc, isAdmin, onDelete }: { doc: Document; isAdmin: boolean; onDelete: (id: number) => void }) {
  return (
    <div className="card p-4 bg-surface border border-border">
      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          <a
            href={`/api/documents/${doc.id}/content`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold link truncate block"
          >
            {doc.filename}
          </a>
          <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
            <div>
              <span className="text-subtle">Typ: </span>
              <span className="font-medium text-foreground">{formatContentType(doc.contentType)}</span>
            </div>
            <div>
              <span className="text-subtle">Größe: </span>
              <span className="text-foreground">{formatFileSize(doc.fileSize)}</span>
            </div>
            <div>
              <span className="text-subtle">Datum: </span>
              <span className="text-muted">{formatDate(doc.uploadedAt)}</span>
            </div>
            <div>
              <span className="text-subtle">Von: </span>
              <span className="text-muted">{doc.uploadedBy}</span>
            </div>
          </div>
        </div>
        {isAdmin && (
          <Button
            variant="negative"
            size="sm"
            onClick={() => onDelete(doc.id)}
          >
            Löschen
          </Button>
        )}
      </div>
    </div>
  )
}

export default function Documents() {
  const isMobile = useIsMobile()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('uploadedAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: documents, isLoading, error } = useDocuments()
  const uploadMutation = useUploadDocument()
  const deleteMutation = useDeleteDocument()

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const filteredDocs = useMemo(() => {
    if (!documents) return []

    const filtered = documents.filter(doc => {
      return doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.uploadedBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatContentType(doc.contentType).toLowerCase().includes(searchTerm.toLowerCase())
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
        case 'uploadedBy':
          comparison = (a.uploadedBy || '').localeCompare(b.uploadedBy || '')
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [documents, searchTerm, sortKey, sortOrder])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await uploadMutation.mutateAsync(file)
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Upload fehlgeschlagen: ' + (err instanceof Error ? err.message : 'Unbekannter Fehler'))
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Möchten Sie dieses Dokument wirklich löschen?')) {
      try {
        await deleteMutation.mutateAsync(id)
      } catch (err) {
        alert('Löschen fehlgeschlagen: ' + (err instanceof Error ? err.message : 'Unbekannter Fehler'))
      }
    }
  }

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

  return (
    <div>
      <div className="p-6 bg-surface border border-border rounded-card mb-6 w-fit max-w-full">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold text-foreground">Dokumente ({filteredDocs.length})</h2>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <i className="sap-icon sap-icon-search text-[14px] absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Dokument suchen..."
                className="input-field control pl-8 pr-3 py-2 rounded-control text-sm w-full"
              />
            </div>
            {isAdmin && (
              <Button
                onClick={() => fileInputRef.current?.click()}
                size="compact"
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? 'Lade hoch...' : '+ Hochladen'}
              </Button>
            )}
          </div>
        </div>

        {searchTerm !== '' && (
          <div className="flex items-center gap-3 flex-wrap mb-4">
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
            <div className="overflow-x-auto rounded-card border border-border w-fit max-w-full">
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
                    <ThSortable onClick={() => handleSort('uploadedAt')}>
                      Datum<SortIcon column="uploadedAt" activeKey={sortKey} order={sortOrder} />
                    </ThSortable>
                    <ThSortable onClick={() => handleSort('uploadedBy')}>
                      Hochgeladen von<SortIcon column="uploadedBy" activeKey={sortKey} order={sortOrder} />
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
                          <a
                            href={`/api/documents/${doc.id}/content`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link font-medium inline-flex items-center gap-2"
                          >
                            <i className={`sap-icon ${contentTypeIcon(doc.contentType)} text-[16px] shrink-0`} />
                            {doc.filename}
                          </a>
                        </td>
                        <td className="px-3 py-2 text-muted">
                          {formatContentType(doc.contentType)}
                        </td>
                        <td className="px-3 py-2 text-right text-foreground tabular-nums">
                          {formatFileSize(doc.fileSize)}
                        </td>
                        <td className="px-3 py-2 text-muted">
                          {formatDate(doc.uploadedAt)}
                        </td>
                        <td className="px-3 py-2 text-muted">
                          {doc.uploadedBy}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <a
                              href={`/api/documents/${doc.id}/content`}
                              download={doc.filename}
                              className="p-1.5 rounded-control text-muted hover:text-primary hover:bg-accent-muted transition-colors"
                              title="Herunterladen"
                            >
                              <i className="sap-icon sap-icon-download text-[16px]" />
                            </a>
                            {isAdmin && (
                              <Button
                                variant="negative"
                                size="sm"
                                onClick={() => handleDelete(doc.id)}
                                disabled={deleteMutation.isPending}
                              >
                                Löschen
                              </Button>
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
            <div className="mt-4 text-sm text-subtle">
              {filteredDocs.length} von {documents?.length || 0} Dokumenten
            </div>
          </>
        )}

        {isMobile && (
          <div>
            <div className="grid gap-4">
              {filteredDocs.length > 0 ? (
                filteredDocs.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} isAdmin={isAdmin} onDelete={handleDelete} />
                ))
              ) : (
                <div className="text-center text-subtle py-8">
                  Keine Dokumente gefunden
                </div>
              )}
            </div>
            <div className="mt-4 text-sm text-subtle">
              {filteredDocs.length} von {documents?.length || 0} Dokumenten
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
    </div>
  )
}
