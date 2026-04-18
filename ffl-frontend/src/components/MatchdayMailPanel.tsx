import { useState, useMemo, useEffect } from 'react'
import { Card, TextField, Label, Input, Button } from '@heroui/react'
import { useSystemConfig, useUpdateSystemConfig } from '../hooks/useSystemConfig'
import { useCurrentSeason } from '../hooks/useSeasons'
import { useManagersBySeason } from '../hooks/useManagers'
import type { SystemConfig } from '../types'
import MatchdayMailDialog from './MatchdayMailDialog'

export default function MatchdayMailPanel() {
  const { data: config } = useSystemConfig()
  const updateConfig = useUpdateSystemConfig()
  const { data: season } = useCurrentSeason()
  const { data: managers } = useManagersBySeason(season?.id ?? 0)

  const [llmOpen, setLlmOpen] = useState(false)
  const [llmForm, setLlmForm] = useState<Partial<SystemConfig>>({})
  const [llmMessage, setLlmMessage] = useState('')
  const [selectedMatchday, setSelectedMatchday] = useState<number | null>(null)
  const [selectedManagerIds, setSelectedManagerIds] = useState<number[]>([])
  const [sendDialogOpen, setSendDialogOpen] = useState(false)

  // Init LLM form from config
  useEffect(() => {
    if (config) {
      setLlmForm({
        openrouterApiKey: '',
        openrouterModel: config.openrouterModel || 'openai/gpt-4o-mini',
        matchdayMailPrompt:
          config.matchdayMailPrompt ||
          'Schreibe 2-3 Saetze auf Deutsch ueber den Fantasy-Football-Spieltag. Hebe den Tagessieger hervor und erwaehne eine Besonderheit. Lockerer, motivierender Ton.',
      })
    }
  }, [config])

  // Init matchday default = current matchday
  useEffect(() => {
    if (selectedMatchday === null && season?.currentMatchday) {
      setSelectedMatchday(season.currentMatchday)
    }
  }, [season, selectedMatchday])

  const matchdayOptions = useMemo(() => {
    const max = season?.currentMatchday ?? 0
    return Array.from({ length: max }, (_, i) => i + 1)
  }, [season])

  const handleLlmSave = async () => {
    try {
      await updateConfig.mutateAsync(llmForm)
      setLlmForm((prev) => ({ ...prev, openrouterApiKey: '' }))
      setLlmMessage('LLM-Einstellungen gespeichert')
      setTimeout(() => setLlmMessage(''), 3000)
    } catch {
      setLlmMessage('Fehler beim Speichern')
    }
  }

  const availableManagers = useMemo(() => managers ?? [], [managers])
  const eligibleManagers = useMemo(
    () => availableManagers.filter((m) => !!m.email),
    [availableManagers],
  )
  const allSelected =
    eligibleManagers.length > 0 && selectedManagerIds.length === eligibleManagers.length

  const toggleAll = () => {
    if (allSelected) setSelectedManagerIds([])
    else setSelectedManagerIds(eligibleManagers.map((m) => m.id))
  }

  const toggleOne = (id: number) => {
    setSelectedManagerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const canSend =
    !!season?.id && !!selectedMatchday && selectedManagerIds.length > 0

  return (
    <div className="max-w-4xl">
      {/* LLM-Einstellungen einklappbar */}
      <Card className="p-0 bg-[#1a2028] border border-[#2d3748] mb-6">
        <button
          type="button"
          onClick={() => setLlmOpen((v) => !v)}
          className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-[#242d38] transition-colors"
        >
          <span className="text-lg font-semibold text-[#c9a66b]">LLM-Einstellungen</span>
          <span className="text-[#a0aec0]">{llmOpen ? '▲' : '▼'}</span>
        </button>

        {llmOpen && (
          <div className="px-6 pb-6 pt-2 grid gap-4">
            <TextField name="openrouterApiKey">
              <Label className="text-[#a0aec0]">OpenRouter API-Key</Label>
              <Input
                type="password"
                value={llmForm.openrouterApiKey || ''}
                onChange={(e) =>
                  setLlmForm((prev) => ({ ...prev, openrouterApiKey: e.target.value }))
                }
                placeholder="Nur eingeben zum Ändern"
                className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
              />
            </TextField>

            <TextField name="openrouterModel">
              <Label className="text-[#a0aec0]">Modell</Label>
              <Input
                value={llmForm.openrouterModel || ''}
                onChange={(e) =>
                  setLlmForm((prev) => ({ ...prev, openrouterModel: e.target.value }))
                }
                placeholder="openai/gpt-4o-mini"
                className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
              />
            </TextField>

            <div>
              <label className="text-[#a0aec0] text-sm block mb-1">
                Stil-Anweisung (Prompt)
              </label>
              <textarea
                value={llmForm.matchdayMailPrompt || ''}
                onChange={(e) =>
                  setLlmForm((prev) => ({ ...prev, matchdayMailPrompt: e.target.value }))
                }
                rows={6}
                className="w-full bg-[#242d38] border border-[#3d4a5c] rounded-md text-[#f5f5f5] p-2 font-mono text-sm"
              />
              <p className="text-xs text-[#6b7280] mt-1">
                Das Backend haengt die Spieltags-Daten als JSON an diese Anweisung an.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onPress={handleLlmSave}
                isDisabled={updateConfig.isPending}
                className="bg-[#c9a66b] text-[#0f1419] font-semibold px-6 py-2 rounded hover:bg-[#d4b87a] disabled:opacity-50"
              >
                {updateConfig.isPending ? 'Speichern…' : 'LLM-Einstellungen speichern'}
              </Button>
              {llmMessage && (
                <span
                  className={
                    llmMessage.includes('Fehler') ? 'text-[#e05252]' : 'text-[#48bb78]'
                  }
                >
                  {llmMessage}
                </span>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Spieltag-Auswahl */}
      <Card className="p-6 bg-[#1a2028] border border-[#2d3748] mb-6">
        <h3 className="text-lg font-semibold text-[#c9a66b] mb-4">Spieltag</h3>
        {matchdayOptions.length === 0 ? (
          <div className="text-[#a0aec0]">Noch kein Spieltag verfügbar.</div>
        ) : (
          <select
            value={selectedMatchday ?? ''}
            onChange={(e) => setSelectedMatchday(parseInt(e.target.value))}
            className="bg-[#242d38] border border-[#3d4a5c] text-[#f5f5f5] rounded px-3 py-2"
          >
            {matchdayOptions.map((n) => (
              <option key={n} value={n}>
                Spieltag {n}
              </option>
            ))}
          </select>
        )}
      </Card>

      {/* Manager-Auswahl */}
      <Card className="p-6 bg-[#1a2028] border border-[#2d3748] mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#c9a66b]">Empfänger</h3>
          <Button
            size="sm"
            onPress={toggleAll}
            isDisabled={eligibleManagers.length === 0}
            className="bg-[#3d4a5c] text-[#f5f5f5] px-3 py-1"
          >
            {allSelected ? 'Alle abwählen' : 'Alle selektieren'}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#a0aec0] border-b border-[#2d3748]">
                <th className="py-2 w-10"></th>
                <th className="py-2">Name</th>
                <th className="py-2">E-Mail</th>
              </tr>
            </thead>
            <tbody>
              {availableManagers.map((m) => {
                const hasEmail = !!m.email
                const displayName =
                  [m.firstName, m.lastName].filter(Boolean).join(' ') || m.name
                return (
                  <tr
                    key={m.id}
                    className={`border-b border-[#2d3748] ${
                      hasEmail ? 'hover:bg-[#242d38]' : 'opacity-50'
                    }`}
                  >
                    <td className="py-2">
                      <input
                        type="checkbox"
                        disabled={!hasEmail}
                        checked={selectedManagerIds.includes(m.id)}
                        onChange={() => toggleOne(m.id)}
                        className="w-4 h-4 accent-[#c9a66b]"
                      />
                    </td>
                    <td className="py-2 text-[#f5f5f5]">{displayName}</td>
                    <td className="py-2 text-[#a0aec0]">
                      {m.email || <em>keine Mailadresse</em>}
                    </td>
                  </tr>
                )
              })}
              {availableManagers.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-[#a0aec0]">
                    Keine Manager gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex items-center gap-4">
        <Button
          onPress={() => setSendDialogOpen(true)}
          isDisabled={!canSend}
          className="bg-[#c9a66b] text-[#0f1419] font-semibold px-6 py-2 rounded hover:bg-[#d4b87a] disabled:opacity-50"
        >
          Spieltagsmail senden ({selectedManagerIds.length})
        </Button>
      </div>

      {season?.id && selectedMatchday !== null && (
        <MatchdayMailDialog
          isOpen={sendDialogOpen}
          onClose={() => setSendDialogOpen(false)}
          seasonId={season.id}
          roundNumber={selectedMatchday}
          managerIds={selectedManagerIds}
        />
      )}
    </div>
  )
}
