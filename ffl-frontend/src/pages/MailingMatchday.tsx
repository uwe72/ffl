import { useState, useMemo, useEffect } from 'react'
import BackButton from '../components/BackButton'
import { useCurrentSeason } from '../hooks/useSeasons'
import { useGames } from '../hooks/useGames'
import MatchdayMailSendDialog from '../components/MatchdayMailSendDialog'
import Button from '../components/Button'
import FormCard from '../components/FormCard'

export default function MailingMatchday() {
  const { data: season, isLoading: isLoadingSeason } = useCurrentSeason()
  const { data: games, isLoading: isLoadingGames } = useGames()
  const [selectedRound, setSelectedRound] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const rounds = useMemo(() => {
    if (!games) return []
    const uniqueRounds = [...new Set(games.map(g => g.roundNumber).filter(Boolean))] as number[]
    return uniqueRounds.sort((a, b) => a - b)
  }, [games])

  useEffect(() => {
    if (selectedRound !== null || rounds.length === 0) return
    if (season?.seasonState === 'BEFORE_SEASON') {
      setSelectedRound(Math.min(...rounds))
    } else if (season?.currentMatchday) {
      setSelectedRound(season.currentMatchday)
    } else {
      setSelectedRound(Math.max(...rounds))
    }
  }, [rounds, selectedRound, season?.seasonState, season?.currentMatchday])

  if (isLoadingSeason || isLoadingGames) {
    return <div className="text-muted">Laden...</div>
  }

  if (!season) {
    return <div className="text-muted">Keine Saison gefunden.</div>
  }

  return (
    <div>
      <BackButton to="/mailing" className="mb-4" />

      <div className="grid gap-6">
        <FormCard>
          <label className="block text-sm text-muted mb-2">Spieltag auswählen</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (selectedRound !== null) {
                  const currentIndex = rounds.indexOf(selectedRound)
                  if (currentIndex > 0) setSelectedRound(rounds[currentIndex - 1])
                }
              }}
              disabled={!selectedRound || rounds.indexOf(selectedRound) <= 0}
              className="p-1.5 rounded-badge bg-surface border border-border text-foreground hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border transition-colors"
              title="Vorheriger Spieltag"
            >
              <i className="sap-icon sap-icon-navigation-left-arrow text-[14px]" />
            </button>
            <select
              value={selectedRound ?? ''}
              onChange={(e) => setSelectedRound(Number(e.target.value))}
              className="input-field px-3 py-2 focus:outline-none"
            >
              {rounds.map(round => (
                <option key={round} value={round}>
                  Spieltag {round}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                if (selectedRound !== null) {
                  const currentIndex = rounds.indexOf(selectedRound)
                  if (currentIndex < rounds.length - 1) setSelectedRound(rounds[currentIndex + 1])
                }
              }}
              disabled={!selectedRound || rounds.indexOf(selectedRound) >= rounds.length - 1}
              className="p-1.5 rounded-badge bg-surface border border-border text-foreground hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border transition-colors"
              title="Nächster Spieltag"
            >
              <i className="sap-icon sap-icon-navigation-right-arrow text-[14px]" />
            </button>
          </div>
          <p className="text-xs text-muted mt-3">
            Versendet eine individuelle Zusammenfassung für den gewählten Spieltag an die ausgewählten Manager.
          </p>
        </FormCard>
      </div>

      <div className="mt-6">
        <Button
          variant="emphasized"
          onClick={() => setDialogOpen(true)}
          disabled={!selectedRound}
        >
          Spieltagsmail versenden
        </Button>
      </div>

      {selectedRound && (
        <MatchdayMailSendDialog
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
          seasonId={season.id}
          roundNumber={selectedRound}
        />
      )}
    </div>
  )
}
