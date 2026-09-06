import { useState, useEffect, useRef } from 'react'
import Button from './Button'

interface MatchdayMailDialogProps {
  isOpen: boolean
  onClose: () => void
  seasonId: number
  roundNumber: number
  managerIds: number[]
  comment?: string
  commentHeading?: string
  testMode?: boolean
}

export default function MatchdayMailDialog({
  isOpen,
  onClose,
  seasonId,
  roundNumber,
  managerIds,
  comment,
  commentHeading,
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
    const controller = new AbortController()

    async function run() {
      const body = {
        seasonId,
        roundNumber,
        managerIds,
        comment: comment && comment.trim() ? comment : undefined,
        commentHeading: commentHeading && commentHeading.trim() ? commentHeading.trim() : undefined,
        testMode: testMode ?? false,
      }

      try {
        const response = await fetch('/api/system/matchday-mail/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        })

        if (!response.ok || !response.body) {
          setError(`Serverfehler (${response.status})`)
          setIsComplete(true)
          return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let eventName = 'message'
        let eventData: string[] = []

        const flushEvent = () => {
          if (eventName === 'message') {
            const text = eventData.join('\n')
            if (text) setLogs((prev) => [...prev, text])
          } else if (eventName === 'complete') {
            setIsComplete(true)
          } else if (eventName === 'error') {
            setError(eventData.join('\n'))
            setIsComplete(true)
          }
          eventName = 'message'
          eventData = []
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          let newlineIndex: number
          while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            const rawLine = buffer.slice(0, newlineIndex)
            buffer = buffer.slice(newlineIndex + 1)
            const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine

            if (line === '') {
              flushEvent()
            } else if (line.startsWith(':')) {
              // keep-alive comment
            } else if (line.startsWith('event:')) {
              eventName = line.slice(6).trim()
            } else if (line.startsWith('data:')) {
              eventData.push(line.slice(5).trimStart())
            }
          }
        }
        flushEvent()
        setIsComplete(true)
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
        setError('Verbindung zum Server verloren')
        setIsComplete(true)
      }
    }

    run()

    return () => {
      controller.abort()
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
          className="flex-1 overflow-y-auto log-console border border-border rounded-card p-3 md:p-4 font-mono text-xs md:text-sm min-h-[280px] md:min-h-[390px] max-h-[400px] md:max-h-[520px]"
        >
          {logs.map((log, index) => (
            <div key={index} className="whitespace-pre-wrap">
              {log}
            </div>
          ))}
          {!isComplete && <div className="text-primary animate-pulse">Verarbeite…</div>}
          {error && <div className="text-danger mt-2">{error}</div>}
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
