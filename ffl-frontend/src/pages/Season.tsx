import { useState, useEffect } from 'react'
import { Card, TextField, Label, Input, Button } from '@heroui/react'
import { useCurrentSeason, useUpdateSeason } from '../hooks/useSeasons'
import CalculationDialog from '../components/CalculationDialog'
import type { Season, SeasonState } from '../types'

const seasonStateOptions: { value: SeasonState; label: string }[] = [
  { value: 'BEFORE_SEASON', label: 'Vor Saison' },
  { value: 'RUNNING_HINRUNDE', label: 'Hinrunde' },
  { value: 'RUNNING_RUECKRUNDE', label: 'Rückrunde' }
]

export default function Season() {
  const { data: season, isLoading, error } = useCurrentSeason()
  const updateSeason = useUpdateSeason()
  
  const [formData, setFormData] = useState<Partial<Season>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [showCalcDialog, setShowCalcDialog] = useState(false)

  useEffect(() => {
    if (season) {
      setFormData({
        name: season.name,
        budget: season.budget,
        seasonState: season.seasonState,
        startRoundRueckrunde: season.startRoundRueckrunde
      })
      setHasChanges(false)
    }
  }, [season])

  const handleChange = (field: keyof Season, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!season || !hasChanges) return
    await updateSeason.mutateAsync({ id: season.id, data: formData })
    setHasChanges(false)
  }

  const handleCalculate = () => {
    setShowCalcDialog(true)
  }

  if (isLoading) return <div className="text-center py-8 text-[#a0aec0]">Laden...</div>
  if (error) return <div className="text-center py-8 text-[#e05252]">Fehler beim Laden</div>
  if (!season) return <div className="text-center py-8 text-[#6b7280]">Keine aktuelle Saison gefunden</div>

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#f5f5f5] mb-6">Saison</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
          <TextField name="name" isRequired>
            <Label className="text-[#a0aec0]">Name</Label>
            <Input
              value={formData.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
            />
          </TextField>
        </Card>

        <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
          <TextField name="budget" isRequired>
            <Label className="text-[#a0aec0]">Budget (€)</Label>
            <Input
              value={formData.budget ? formData.budget.toLocaleString('de-DE') : ''}
              onChange={(e) => {
                const value = e.target.value.replace(/\./g, '')
                handleChange('budget', parseInt(value) || 0)
              }}
              className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
            />
          </TextField>
        </Card>

        <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
          <TextField name="startRoundRueckrunde" isRequired>
            <Label className="text-[#a0aec0]">Start Spieltag Rückrunde</Label>
            <Input
              type="number"
              value={formData.startRoundRueckrunde || ''}
              onChange={(e) => handleChange('startRoundRueckrunde', parseInt(e.target.value) || 16)}
              className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
            />
          </TextField>
        </Card>

        <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
          <TextField name="currentMatchday" isReadOnly>
            <Label className="text-[#a0aec0]">Aktueller Spieltag</Label>
            <Input
              value={season.currentMatchday?.toString() ?? '-'}
              readOnly
              className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5] opacity-70"
            />
          </TextField>
        </Card>

        <Card className="p-6 bg-[#1a2028] border border-[#2d3748] md:col-span-2">
          <Label className="text-[#a0aec0] block mb-3">Saisonphase</Label>
          <div className="flex gap-4">
            {seasonStateOptions.map((option) => (
              <label
                key={option.value}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
                  formData.seasonState === option.value
                    ? 'bg-[#c9a66b] text-[#0f1419]'
                    : 'bg-[#242d38] text-[#a0aec0] hover:bg-[#3d4a5c]'
                }`}
              >
                <input
                  type="radio"
                  name="seasonState"
                  value={option.value}
                  checked={formData.seasonState === option.value}
                  onChange={(e) => handleChange('seasonState', e.target.value)}
                  className="hidden"
                />
                {option.label}
              </label>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 flex gap-4">
        {hasChanges && (
          <>
            <Button
              variant="primary"
              onPress={handleSave}
              isDisabled={updateSeason.isPending}
              className="bg-[#c9a66b] text-[#0f1419] font-medium"
            >
              {updateSeason.isPending ? 'Wird gespeichert...' : 'Speichern'}
            </Button>
            <Button
              variant="secondary"
              onPress={() => {
                setFormData({
                  name: season.name,
                  budget: season.budget,
                  seasonState: season.seasonState,
                  startRoundRueckrunde: season.startRoundRueckrunde
                })
                setHasChanges(false)
              }}
            >
              Abbrechen
            </Button>
          </>
        )}
        
        <Button
          variant="primary"
          onPress={handleCalculate}
          className="bg-[#c9a66b] text-[#0f1419] font-medium"
        >
          Punkte neu berechnen
        </Button>
      </div>

      {season && (
        <CalculationDialog
          isOpen={showCalcDialog}
          onClose={() => setShowCalcDialog(false)}
          seasonId={season.id}
        />
      )}
    </div>
  )
}
