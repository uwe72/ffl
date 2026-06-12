import { useState, useEffect, useRef } from 'react'

interface MatchdayMailDialogProps {
  isOpen: boolean
  onClose: () => void
  seasonId: number
  roundNumber: number
  managerIds: number[]
  comment?: string
  testMode?: boolean
}

export default function MatchdayMailDialog({
  isOpen,
  onClose,
  seasonId,
  roundNumber,
  managerIds,
  comment,
  testMode,
}: MatchdayMailDialogProps) {
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
    const params = new URLSearchParams({
      seasonId: String(seasonId),
      roundNumber: String(roundNumber),
      managerIds: managerIds.join(','),
    })
    if (token) params.set('token', token)
    if (comment && comment.trim()) params.set('comment', comment)
    if (testMode) params.set('testMode', 'true')

    const url = `/api/system/matchday-mail/stream?${params.toString()}`
    const eventSource = new EventSource(url)

    eventSource.onmessage = (event) => {
      setLogs((prev) => [...prev, event.data])
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, seasonId, roundNumber])

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="p-4 md:p-6 bg-surface border border-border w-full max-w-3xl max-h-[90vh] md:max-h-[80vh] flex flex-col">
        <h2 className="text-lg md:text-xl font-bold text-foreground mb-4">
          {isComplete
            ? error
              ? 'Fehler beim Versand'
              : 'Versand abgeschlossen'
            : 'Versende Spieltagsmails…'}
        </h2>

        <div
          ref={logContainerRef}
          className="flex-1 overflow-y-auto bg-background border border-border rounded-lg p-3 md:p-4 font-mono text-xs md:text-sm text-muted min-h-[280px] md:min-h-[390px] max-h-[400px] md:max-h-[520px]"
        >
          {logs.map((log, index) => (
            <div key={index} className="whitespace-pre-wrap">
              {log}
            </div>
          ))}
          {!isComplete && <div className="text-accent animate-pulse">Verarbeite…</div>}
          {error && <div className="text-red-400 mt-2">{error}</div>}
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
