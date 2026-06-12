import { useState, useEffect, useRef } from 'react'

interface CalculationDialogProps {
  isOpen: boolean
  onClose: () => void
  seasonId: number
}

export default function CalculationDialog({ isOpen, onClose, seasonId }: CalculationDialogProps) {
  const [logs, setLogs] = useState<string[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const logContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) {
      setLogs([])
      setIsComplete(false)
      setError(null)
      return
    }

    const token = localStorage.getItem('token')
    const url = `/api/seasons/${seasonId}/calculate-stream${token ? `?token=${token}` : ''}`
    const eventSource = new EventSource(url)

    eventSource.onmessage = (event) => {
      setLogs(prev => [...prev, event.data])
    }

    eventSource.addEventListener('complete', () => {
      setIsComplete(true)
      eventSource.close()
    })

    eventSource.addEventListener('error', (event) => {
      if (event instanceof MessageEvent) {
        setError(event.data)
      } else {
        setError('Verbindung zum Server verloren')
      }
      setIsComplete(true)
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
  }, [isOpen, seasonId])

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
          {isComplete ? (error ? 'Fehler bei der Berechnung' : 'Berechnung abgeschlossen') : 'Berechnung läuft...'}
        </h2>
        
        <div
          ref={logContainerRef}
          className="flex-1 overflow-y-auto bg-background border border-border rounded-lg p-4 font-mono text-sm text-muted min-h-[390px] max-h-[520px]"
        >
          {logs.map((log, index) => (
            <div key={index} className="whitespace-pre-wrap">
              {log}
            </div>
          ))}
          {!isComplete && (
            <div className="text-accent animate-pulse">Verarbeite...</div>
          )}
          {error && (
            <div className="text-red-400 mt-2">{error}</div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            disabled={!isComplete}
            className={`font-medium px-4 py-2 rounded ${isComplete ? 'bg-primary text-background' : 'bg-border-hover text-subtle'}`}
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  )
}
