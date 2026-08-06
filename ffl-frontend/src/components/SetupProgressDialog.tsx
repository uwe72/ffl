import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Button from './Button'

interface SetupProgressDialogProps {
  isOpen: boolean
  onClose: () => void
  sourceUrl: string
  seasonName: string
}

export default function SetupProgressDialog({ isOpen, onClose, sourceUrl, seasonName }: SetupProgressDialogProps) {
  const [logs, setLogs] = useState<string[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const logContainerRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isOpen) {
      setLogs([])
      setIsComplete(false)
      setError(null)
      return
    }

    const token = localStorage.getItem('token')
    const url = `/api/seasons/setup/stream-sse?sourceUrl=${encodeURIComponent(sourceUrl)}&seasonName=${encodeURIComponent(seasonName)}${token ? `&token=${token}` : ''}`
    const eventSource = new EventSource(url)

    eventSource.onmessage = (event) => {
      setLogs(prev => [...prev, event.data])
    }

    eventSource.addEventListener('complete', () => {
      setIsComplete(true)
      queryClient.invalidateQueries({ queryKey: ['seasons'] })
      eventSource.close()
    })

    eventSource.addEventListener('failure', (event) => {
      if (event instanceof MessageEvent && event.data) {
        setError(event.data)
      } else {
        setError('Setup fehlgeschlagen')
      }
      setIsComplete(true)
      queryClient.invalidateQueries({ queryKey: ['seasons'] })
      eventSource.close()
    })

    eventSource.addEventListener('error', () => {
      if (!isComplete) {
        setError('Verbindung zum Server verloren')
        setIsComplete(true)
      }
      eventSource.close()
    })

    eventSource.onerror = () => {
      if (!isComplete) {
        setError('Verbindung zum Server verloren')
        setIsComplete(true)
      }
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [isOpen, sourceUrl, seasonName])

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="p-6 bg-surface border border-border w-full max-w-3xl max-h-[80vh] flex flex-col">
        <h2 className="text-xl font-bold text-foreground mb-4">
          {isComplete ? (error ? 'Fehler beim Setup' : 'Setup abgeschlossen') : 'Neue Saison wird erstellt...'}
        </h2>

        <div
          ref={logContainerRef}
          className="flex-1 overflow-y-auto log-console border border-border rounded-card p-4 font-mono text-sm min-h-[390px] max-h-[520px]"
        >
          {logs.map((log, index) => (
            <div key={index} className="whitespace-pre-wrap">
              {log}
            </div>
          ))}
          {!isComplete && (
            <div className="text-primary animate-pulse">Verarbeite...</div>
          )}
          {error && (
            <div className="text-danger mt-2">{error}</div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            onClick={onClose}
            disabled={!isComplete}
            variant={isComplete ? 'emphasized' : 'ghost'}
          >
            Schließen
          </Button>
        </div>
      </div>
    </div>
  )
}