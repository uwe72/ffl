import { useState, useRef } from 'react'
import { Button } from '@heroui/react'

interface ImportResult {
  success: boolean
  dryRun: boolean
  message: string
  usersImported: number
  teamsImported: number
  seasonsImported: number
  playersImported: number
  managersImported: number
  roundsImported: number
  gamesImported: number
  managerGroupsImported: number
  managerPlayersImported: number
  managerGroupMembersImported: number
  seasonTeamsImported: number
  errors: string[]
}

export default function System() {
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [dryRun, setDryRun] = useState(true)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    setExporting(true)
    setResult(null)
    try {
      const response = await fetch('/api/admin/system/export', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const contentDisposition = response.headers.get('content-disposition')
      let filename = 'ffl-export.zip'
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, '')
        }
      }

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
      alert('Export fehlgeschlagen')
    } finally {
      setExporting(false)
    }
  }

  const handleSelectFile = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setResult(null)
    }
  }

  const handleImportClick = () => {
    if (!selectedFile) return
    setShowConfirm(true)
  }

  const handleImport = async () => {
    if (!selectedFile) return

    setShowConfirm(false)
    setImporting(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch(`/api/admin/system/import?dryRun=${dryRun}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      })

      const data: ImportResult = await response.json()
      setResult(data)
      if (data.success && !data.dryRun) {
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    } catch (error) {
      console.error('Import error:', error)
      alert('Import fehlgeschlagen')
    } finally {
      setImporting(false)
    }
  }

  const handleCancelSelection = () => {
    setSelectedFile(null)
    setResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[#f5f5f5]">System</h1>

      <div className="bg-[#1a2028] rounded-lg shadow p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-[#f5f5f5] mb-4">Daten-Export</h2>
          <p className="text-[#a0aec0] mb-4">
            Exportiert alle Daten (ohne PlayerRank und ManagerRank) als ZIP-Datei.
          </p>
          <Button
            onPress={handleExport}
            isDisabled={exporting}
            className="bg-[#c9a66b] hover:bg-[#d4b77a] text-[#0f1419]"
          >
            {exporting ? 'Exportiere...' : 'Exportieren'}
          </Button>
        </div>

        <hr className="border-[#2d3748]" />

        <div>
          <h2 className="text-xl font-semibold text-[#f5f5f5] mb-4">Daten-Import</h2>
          <p className="text-[#a0aec0] mb-4">
            Importiert Daten aus einer ZIP-Datei. Alle vorhandenen Daten werden überschrieben.
          </p>

          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2 text-[#a0aec0]">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="w-4 h-4"
              />
              Dry-Run (nur Validierung, keine Änderungen)
            </label>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleFileChange}
            className="hidden"
            disabled={importing}
          />

          <div className="flex items-center gap-4">
            {!selectedFile ? (
              <Button
                onPress={handleSelectFile}
                className="bg-[#c9a66b] hover:bg-[#d4b77a] text-[#0f1419]"
              >
                Datei auswählen
              </Button>
            ) : (
              <>
                <div className="flex items-center gap-2 text-[#f5f5f5] bg-[#2d3748] px-4 py-2 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#c9a66b]" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 4.586L15.414 8A2 2 0 0116 9.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                  <span>{selectedFile.name}</span>
                </div>
                <Button
                  onPress={handleImportClick}
                  isDisabled={importing}
                  className="bg-[#c9a66b] hover:bg-[#d4b77a] text-[#0f1419]"
                >
                  {importing ? 'Importiere...' : 'Import starten'}
                </Button>
                <Button
                  onPress={handleCancelSelection}
                  isDisabled={importing}
                  className="bg-[#4a5568] hover:bg-[#5a6578] text-[#f5f5f5]"
                >
                  Abbrechen
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1a2028] rounded-lg p-6 max-w-md">
            <h3 className="text-xl font-semibold text-[#f5f5f5] mb-4">Import bestätigen</h3>
            <p className="text-[#a0aec0] mb-6">
              {dryRun 
                ? 'Möchten Sie die Daten validieren (Dry-Run)?'
                : 'Achtung: Alle vorhandenen Daten werden überschrieben! Diese Aktion kann nicht rückgängig gemacht werden.'}
            </p>
            <div className="flex justify-end gap-4">
              <Button
                onPress={() => setShowConfirm(false)}
                className="bg-[#4a5568] hover:bg-[#5a6578] text-[#f5f5f5]"
              >
                Abbrechen
              </Button>
              <Button
                onPress={handleImport}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {dryRun ? 'Validieren' : 'Importieren'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className={`bg-[#1a2028] rounded-lg shadow p-6 ${result.success ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'}`}>
          <h2 className="text-xl font-semibold text-[#f5f5f5] mb-4">
            {result.success ? 'Erfolg' : 'Fehler'}
          </h2>
          <p className="text-[#a0aec0] mb-4">{result.message}</p>

          {result.success && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-[#a0aec0]">Users:</span> <span className="text-[#f5f5f5]">{result.usersImported}</span></div>
              <div><span className="text-[#a0aec0]">Teams:</span> <span className="text-[#f5f5f5]">{result.teamsImported}</span></div>
              <div><span className="text-[#a0aec0]">Seasons:</span> <span className="text-[#f5f5f5]">{result.seasonsImported}</span></div>
              <div><span className="text-[#a0aec0]">Players:</span> <span className="text-[#f5f5f5]">{result.playersImported}</span></div>
              <div><span className="text-[#a0aec0]">Managers:</span> <span className="text-[#f5f5f5]">{result.managersImported}</span></div>
              <div><span className="text-[#a0aec0]">Rounds:</span> <span className="text-[#f5f5f5]">{result.roundsImported}</span></div>
              <div><span className="text-[#a0aec0]">Games:</span> <span className="text-[#f5f5f5]">{result.gamesImported}</span></div>
              <div><span className="text-[#a0aec0]">Groups:</span> <span className="text-[#f5f5f5]">{result.managerGroupsImported}</span></div>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="mt-4">
              <h3 className="text-[#a0aec0] mb-2">Fehler:</h3>
              <ul className="list-disc list-inside text-red-400">
                {result.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
