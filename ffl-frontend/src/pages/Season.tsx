import { useState, useEffect, useMemo } from 'react'
import { Card, TextField, Label, Input, Button } from '@heroui/react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import { useCurrentSeason, useUpdateSeason, usePrizeDistribution, useCalculatePrizeDistribution, usePrizeDistributionLog, useUpdatePrizePayout, usePrizeDistributionMailPreview } from '../hooks/useSeasons'
import CalculationDialog from '../components/CalculationDialog'
import PrizeDistributionMailSendDialog from '../components/PrizeDistributionMailSendDialog'
import type { Season, SeasonState, PrizeDistributionLog, PrizePayout, PayoutStatus } from '../types'

const seasonStateOptions: { value: SeasonState; label: string }[] = [
  { value: 'BEFORE_SEASON', label: 'Vor Saison' },
  { value: 'RUNNING_HINRUNDE', label: 'Hinrunde' },
  { value: 'RUNNING_RUECKRUNDE', label: 'Rückrunde' }
]

const COLOR_FIRST = '#90EE90'
const COLOR_NORMAL = '#87CEFA'
const COLOR_LAST = '#FFA500'

function formatPrizeLabel(value: number): string {
  if (value % 1 === 0) {
    return `${Math.round(value)}€`
  }
  return `${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`
}

function PrizeDistributionChart({ prizeDistributionLog }: { prizeDistributionLog: PrizeDistributionLog }) {
  const chartData = useMemo(() => {
    if (!prizeDistributionLog.basePrizes || prizeDistributionLog.basePrizes.length === 0) {
      return []
    }
    
    return prizeDistributionLog.basePrizes.map((prize, index) => ({
      position: `${index + 1}.`,
      positionNumber: index + 1,
      prize: prize,
      prizeLabel: formatPrizeLabel(prize)
    }))
  }, [prizeDistributionLog])

  const lastPosition = chartData.length

  const getBarColor = (positionNumber: number) => {
    if (positionNumber === 1) return COLOR_FIRST
    if (positionNumber === lastPosition) return COLOR_LAST
    return COLOR_NORMAL
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { position: string; prize: number } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-[#1a2028] border border-[#2d3748] rounded-lg p-3 shadow-lg">
          <p className="text-[#f5f5f5] font-semibold">{data.position}</p>
          <p className="text-[#c9a66b] font-medium">{formatPrizeLabel(data.prize)}</p>
        </div>
      )
    }
    return null
  }

  if (chartData.length === 0) {
    return null
  }

  return (
    <Card className="bg-[#1a2028] border border-[#2d3748] p-6">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" horizontal={true} vertical={false} />
          <XAxis 
            dataKey="position" 
            stroke="#a0aec0" 
            tick={{ fill: '#a0aec0', fontSize: 12 }}
            label={{ value: 'Platz', position: 'bottom', fill: '#a0aec0', offset: -5 }}
          />
          <YAxis 
            stroke="#a0aec0" 
            tick={{ fill: '#a0aec0', fontSize: 12 }}
            label={{ value: 'Preisgeld (€)', angle: -90, position: 'insideLeft', fill: '#a0aec0' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="prize" radius={[4, 4, 0, 0]}>
            <LabelList 
              dataKey="prizeLabel" 
              position="top" 
              fill="#a0aec0" 
              fontSize={11}
              style={{ whiteSpace: 'nowrap' }}
            />
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.positionNumber)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded" style={{ backgroundColor: COLOR_FIRST }} />
          <span className="text-[#a0aec0] text-sm">Erster Platz</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded" style={{ backgroundColor: COLOR_NORMAL }} />
          <span className="text-[#a0aec0] text-sm">Normal (Degression)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded" style={{ backgroundColor: COLOR_LAST }} />
          <span className="text-[#a0aec0] text-sm">Letzter Platz</span>
        </div>
      </div>
    </Card>
  )
}

export default function Season() {
  const { data: season, isLoading, error } = useCurrentSeason()
  const updateSeason = useUpdateSeason()
  const { data: prizeDistribution, isLoading: isLoadingPrize } = usePrizeDistribution(season?.id ?? 0)
  const { data: prizeDistributionLog } = usePrizeDistributionLog(season?.id ?? 0)
  const calculatePrize = useCalculatePrizeDistribution()
  const updatePrizePayout = useUpdatePrizePayout(season?.id ?? 0)
  const { refetch: fetchPreview, isFetching: isFetchingPreview } = usePrizeDistributionMailPreview(season?.id ?? 0)
  
  const [activeTab, setActiveTab] = useState<'saisondaten' | 'gewinnausschuettung' | 'saisonabschlussmail'>('saisondaten')
  const [formData, setFormData] = useState<Partial<Season>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [showCalcDialog, setShowCalcDialog] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [commentDialogManager, setCommentDialogManager] = useState<PrizePayout | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [showMailSendDialog, setShowMailSendDialog] = useState(false)

  useEffect(() => {
    if (season) {
      setFormData({
        name: season.name,
        budget: season.budget,
        seasonState: season.seasonState,
        startRoundRueckrunde: season.startRoundRueckrunde,
        spieleinsatzEuro: season.spieleinsatzEuro ?? 10,
        serverkostenEuro: season.serverkostenEuro ?? 60,
        anzahlSpielleiter: season.anzahlSpielleiter ?? 2,
        gewinnErsterPlatzProzent: season.gewinnErsterPlatzProzent ?? 10,
        gewinnLetzterPlatzEuro: season.gewinnLetzterPlatzEuro ?? 15,
        mailText: season.mailText ?? ''
      })
      setHasChanges(false)
    }
  }, [season])

  const handleChange = (field: keyof Season, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const validateGewinnFields = (): boolean => {
    const errors: Record<string, string> = {}
    const requiredFields = [
      { key: 'spieleinsatzEuro', label: 'Spieleinsatz' },
      { key: 'serverkostenEuro', label: 'Serverkosten' },
      { key: 'anzahlSpielleiter', label: 'Anzahl Spielleiter' },
      { key: 'gewinnErsterPlatzProzent', label: 'Gewinn 1. Platz' },
      { key: 'gewinnLetzterPlatzEuro', label: 'Gewinn letzter Platz' }
    ]
    
    for (const field of requiredFields) {
      const value = formData[field.key as keyof Season]
      if (value === undefined || value === null || value === '' || (typeof value === 'number' && isNaN(value))) {
        errors[field.key] = `${field.label} ist ein Pflichtfeld`
      }
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!season || !hasChanges) return
    if (activeTab === 'gewinnausschuettung' && !validateGewinnFields()) return
    await updateSeason.mutateAsync({ id: season.id, data: formData })
    setHasChanges(false)
  }

  const handleCalculate = () => {
    setShowCalcDialog(true)
  }

  const resetFormData = () => {
    if (!season) return
    setFormData({
      name: season.name,
      budget: season.budget,
      seasonState: season.seasonState,
      startRoundRueckrunde: season.startRoundRueckrunde,
      spieleinsatzEuro: season.spieleinsatzEuro ?? 10,
      serverkostenEuro: season.serverkostenEuro ?? 60,
      anzahlSpielleiter: season.anzahlSpielleiter ?? 2,
      gewinnErsterPlatzProzent: season.gewinnErsterPlatzProzent ?? 10,
      gewinnLetzterPlatzEuro: season.gewinnLetzterPlatzEuro ?? 15,
      mailText: season.mailText ?? ''
    })
    setHasChanges(false)
  }

  if (isLoading) return <div className="text-center py-8 text-[#a0aec0]">Laden...</div>
  if (error) return <div className="text-center py-8 text-[#e05252]">Fehler beim Laden</div>
  if (!season) return <div className="text-center py-8 text-[#6b7280]">Keine aktuelle Saison gefunden</div>

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#f5f5f5] mb-6">Saison</h1>

      <div className="border-b border-[#2d3748] mb-6">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('saisondaten')}
            className={`pb-3 px-1 text-lg font-medium transition-colors ${
              activeTab === 'saisondaten'
                ? 'text-[#c9a66b] border-b-2 border-[#c9a66b]'
                : 'text-[#a0aec0] hover:text-[#f5f5f5]'
            }`}
          >
            Saisondaten
          </button>
          <button
            onClick={() => setActiveTab('gewinnausschuettung')}
            className={`pb-3 px-1 text-lg font-medium transition-colors ${
              activeTab === 'gewinnausschuettung'
                ? 'text-[#c9a66b] border-b-2 border-[#c9a66b]'
                : 'text-[#a0aec0] hover:text-[#f5f5f5]'
            }`}
          >
            Gewinnausschüttung
          </button>
          <button
            onClick={() => setActiveTab('saisonabschlussmail')}
            className={`pb-3 px-1 text-lg font-medium transition-colors ${
              activeTab === 'saisonabschlussmail'
                ? 'text-[#c9a66b] border-b-2 border-[#c9a66b]'
                : 'text-[#a0aec0] hover:text-[#f5f5f5]'
            }`}
          >
            Saisonabschlussmail
          </button>
        </div>
      </div>

      {activeTab === 'saisondaten' && (
        <>
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
                  onPress={resetFormData}
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
        </>
      )}

      {activeTab === 'gewinnausschuettung' && (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className={`p-6 bg-[#1a2028] border ${validationErrors.spieleinsatzEuro ? 'border-[#e05252]' : 'border-[#2d3748]'}`}>
              <TextField name="spieleinsatzEuro" isRequired>
                <Label className="text-[#a0aec0]">Spieleinsatz (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.spieleinsatzEuro ?? ''}
                  onChange={(e) => handleChange('spieleinsatzEuro', parseFloat(e.target.value) || 0)}
                  className={`bg-[#242d38] text-[#f5f5f5] ${validationErrors.spieleinsatzEuro ? 'border-[#e05252]' : 'border-[#3d4a5c]'}`}
                />
              </TextField>
              {validationErrors.spieleinsatzEuro && <p className="text-[#e05252] text-sm mt-1">{validationErrors.spieleinsatzEuro}</p>}
            </Card>

            <Card className={`p-6 bg-[#1a2028] border ${validationErrors.serverkostenEuro ? 'border-[#e05252]' : 'border-[#2d3748]'}`}>
              <TextField name="serverkostenEuro" isRequired>
                <Label className="text-[#a0aec0]">Serverkosten (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.serverkostenEuro ?? ''}
                  onChange={(e) => handleChange('serverkostenEuro', parseFloat(e.target.value) || 0)}
                  className={`bg-[#242d38] text-[#f5f5f5] ${validationErrors.serverkostenEuro ? 'border-[#e05252]' : 'border-[#3d4a5c]'}`}
                />
              </TextField>
              {validationErrors.serverkostenEuro && <p className="text-[#e05252] text-sm mt-1">{validationErrors.serverkostenEuro}</p>}
            </Card>

            <Card className={`p-6 bg-[#1a2028] border ${validationErrors.anzahlSpielleiter ? 'border-[#e05252]' : 'border-[#2d3748]'}`}>
              <TextField name="anzahlSpielleiter" isRequired>
                <Label className="text-[#a0aec0]">Anzahl Spielleiter</Label>
                <Input
                  type="number"
                  value={formData.anzahlSpielleiter ?? ''}
                  onChange={(e) => handleChange('anzahlSpielleiter', parseInt(e.target.value) || 0)}
                  className={`bg-[#242d38] text-[#f5f5f5] ${validationErrors.anzahlSpielleiter ? 'border-[#e05252]' : 'border-[#3d4a5c]'}`}
                />
              </TextField>
              {validationErrors.anzahlSpielleiter && <p className="text-[#e05252] text-sm mt-1">{validationErrors.anzahlSpielleiter}</p>}
            </Card>

            <Card className={`p-6 bg-[#1a2028] border ${validationErrors.gewinnErsterPlatzProzent ? 'border-[#e05252]' : 'border-[#2d3748]'}`}>
              <TextField name="gewinnErsterPlatzProzent" isRequired>
                <Label className="text-[#a0aec0]">Gewinn 1. Platz (%)</Label>
                <Input
                  type="number"
                  value={formData.gewinnErsterPlatzProzent ?? ''}
                  onChange={(e) => handleChange('gewinnErsterPlatzProzent', parseInt(e.target.value) || 0)}
                  className={`bg-[#242d38] text-[#f5f5f5] ${validationErrors.gewinnErsterPlatzProzent ? 'border-[#e05252]' : 'border-[#3d4a5c]'}`}
                />
              </TextField>
              {validationErrors.gewinnErsterPlatzProzent && <p className="text-[#e05252] text-sm mt-1">{validationErrors.gewinnErsterPlatzProzent}</p>}
            </Card>

            <Card className={`p-6 bg-[#1a2028] border ${validationErrors.gewinnLetzterPlatzEuro ? 'border-[#e05252]' : 'border-[#2d3748]'}`}>
              <TextField name="gewinnLetzterPlatzEuro" isRequired>
                <Label className="text-[#a0aec0]">Gewinn letzter Platz (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.gewinnLetzterPlatzEuro ?? ''}
                  onChange={(e) => handleChange('gewinnLetzterPlatzEuro', parseFloat(e.target.value) || 0)}
                  className={`bg-[#242d38] text-[#f5f5f5] ${validationErrors.gewinnLetzterPlatzEuro ? 'border-[#e05252]' : 'border-[#3d4a5c]'}`}
                />
              </TextField>
              {validationErrors.gewinnLetzterPlatzEuro && <p className="text-[#e05252] text-sm mt-1">{validationErrors.gewinnLetzterPlatzEuro}</p>}
            </Card>
          </div>

          {hasChanges && (
            <div className="mt-6 flex gap-4">
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
                onPress={resetFormData}
              >
                Abbrechen
              </Button>
            </div>
          )}

          <div className="mt-6 border-t border-[#2d3748] pt-6">
            {hasChanges && (
              <p className="text-[#a0aec0] mb-4 text-sm">Bitte speichern Sie zuerst Ihre Änderungen, bevor Sie die Gewinnverteilung berechnen.</p>
            )}
            {errorMessage && (
              <Card className="bg-[#3d1f1f] border border-[#8b3a3a] p-4 mb-4">
                <p className="text-[#ffb4b4] text-sm">{errorMessage}</p>
              </Card>
            )}
            <div className="flex gap-4 justify-end mt-6">
              <Button
                variant="primary"
                onPress={() => setShowConfirmDialog(true)}
                isDisabled={hasChanges || calculatePrize.isPending}
                className="bg-[#c9a66b] text-[#0f1419] font-medium"
              >
                {calculatePrize.isPending ? 'Wird berechnet...' : 'Gewinnverteilung berechnen'}
              </Button>
            </div>
          </div>

          {isLoadingPrize && (
            <div className="mt-6 text-center py-8 text-[#a0aec0]">Lade Gewinnverteilung...</div>
          )}

          {prizeDistributionLog && (
            <div className="mt-6">
              <h2 className="text-xl font-bold text-[#f5f5f5] mb-4">Berechnungsstatistik</h2>
              <Card className="bg-[#1a2028] border border-[#2d3748] p-6">
                <div dangerouslySetInnerHTML={{ __html: prizeDistributionLog.statisticsHtml }} />
              </Card>
            </div>
          )}

          {prizeDistribution && prizeDistribution.length > 0 && (
            <div className="mt-6">
              {prizeDistributionLog && prizeDistributionLog.basePrizes && (
                <div className="mt-6">
                  <h2 className="text-xl font-bold text-[#f5f5f5] mb-4">Gewinnverteilung (Basis-Kurve)</h2>
                  <PrizeDistributionChart prizeDistributionLog={prizeDistributionLog} />
                </div>
              )}
              
              <h2 className="text-xl font-bold text-[#f5f5f5] mb-4 mt-6">
                Gewinnverteilung
              </h2>
              <Card className="bg-[#1a2028] border border-[#2d3748] p-3 mb-4">
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-[#a0aec0]">Gesamt:</span>
                    <span className="text-[#f5f5f5] font-medium">
                      {prizeDistribution.reduce((sum, p) => sum + p.prizeAmount, 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#a0aec0]">Ausbezahlt:</span>
                    <span className="text-[#48bb78] font-medium">
                      {prizeDistribution.filter(p => p.payoutStatus === 'PAID').reduce((sum, p) => sum + p.prizeAmount, 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                    <span className="text-[#a0aec0]">({prizeDistribution.filter(p => p.payoutStatus === 'PAID').length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#a0aec0]">Offen:</span>
                    <span className="text-[#e05252] font-medium">
                      {prizeDistribution.filter(p => p.payoutStatus !== 'PAID').reduce((sum, p) => sum + p.prizeAmount, 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                    <span className="text-[#a0aec0]">({prizeDistribution.filter(p => p.payoutStatus !== 'PAID').length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-[#2d3748] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#48bb78]"
                        style={{ width: `${prizeDistribution.length > 0 ? (prizeDistribution.filter(p => p.payoutStatus === 'PAID').length / prizeDistribution.length) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-[#f5f5f5] font-medium">
                      {prizeDistribution.length > 0 ? Math.round((prizeDistribution.filter(p => p.payoutStatus === 'PAID').length / prizeDistribution.length) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </Card>
              <Card className="bg-[#1a2028] border border-[#2d3748] overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-[#2d3748]">
                      <th className="text-left py-3 px-4 text-[#a0aec0] font-medium whitespace-nowrap">Platz</th>
                      <th className="text-left py-3 px-4 text-[#a0aec0] font-medium whitespace-nowrap">Manager</th>
                      <th className="text-left py-3 px-4 text-[#a0aec0] font-medium whitespace-nowrap">Vorname</th>
                      <th className="text-left py-3 px-4 text-[#a0aec0] font-medium whitespace-nowrap">Nachname</th>
                      <th className="text-left py-3 px-4 text-[#a0aec0] font-medium whitespace-nowrap">E-Mail</th>
                      <th className="text-right py-3 px-4 text-[#a0aec0] font-medium whitespace-nowrap">Punkte</th>
                      <th className="text-right py-3 px-4 text-[#a0aec0] font-medium whitespace-nowrap">Gewinn (€)</th>
                      <th className="text-center py-3 px-4 text-[#a0aec0] font-medium whitespace-nowrap">Status</th>
                      <th className="text-center py-3 px-4 text-[#a0aec0] font-medium whitespace-nowrap">Kommentar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prizeDistribution.map((payout) => (
                      <tr 
                        key={payout.managerId} 
                        className="border-b border-[#2d3748] last:border-b-0 hover:bg-[#242d38]"
                        style={{ borderLeftWidth: '4px', borderLeftColor: payout.payoutStatus === 'PAID' ? '#48bb78' : '#4a5568' }}
                      >
                        <td className="py-3 px-4 text-[#f5f5f5] font-medium">{payout.position}</td>
                        <td className="py-3 px-4 text-[#f5f5f5]">{payout.managerName}</td>
                        <td className="py-3 px-4 text-[#f5f5f5]">{payout.managerFirstName || '-'}</td>
                        <td className="py-3 px-4 text-[#f5f5f5]">{payout.managerLastName || '-'}</td>
                        <td className="py-3 px-4 text-[#f5f5f5]">{payout.managerEmail || '-'}</td>
                        <td className="py-3 px-4 text-right text-[#f5f5f5]">{payout.pointsTotal}</td>
                        <td className="py-3 px-4 text-right text-[#c9a66b] font-medium">
                          {payout.prizeAmount % 1 === 0
                            ? Math.round(payout.prizeAmount)
                            : payout.prizeAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <select
                            value={payout.payoutStatus || 'UNPAID'}
                            onChange={(e) => {
                              updatePrizePayout.mutate({
                                managerId: payout.managerId,
                                data: { payoutStatus: e.target.value as PayoutStatus }
                              })
                            }}
                            className={`px-3 py-1.5 rounded text-sm font-medium cursor-pointer ${
                              payout.payoutStatus === 'PAID'
                                ? 'bg-[#48bb78] text-[#0f1419]'
                                : 'bg-[#4a5568] text-[#f5f5f5]'
                            }`}
                          >
                            <option value="UNPAID">Nicht ausbezahlt</option>
                            <option value="PAID">Ausbezahlt</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setCommentDialogManager(payout)
                              setCommentDraft(payout.comment || '')
                            }}
                            className={`text-lg p-1 rounded transition-colors ${
                              payout.comment
                                ? 'bg-[#48bb78] hover:bg-[#68d391]'
                                : 'bg-[#4a5568] hover:bg-[#6b7280]'
                            }`}
                            title={payout.comment || 'Kommentar hinzufügen'}
                          >
                            📝
                          </button>
                        </td>
                      </tr>
                    ))}
                   </tbody>
                 </table>
               </Card>
             </div>
           )}
         </>
       )}

      {activeTab === 'saisonabschlussmail' && (
         <>
            <div className="grid gap-6">
               <Card className="p-6 bg-[#1a2028] border border-[#2d3748] overflow-visible">
                 <Label className="text-[#a0aec0] block mb-2">Saisonabschlussmail</Label>
                 <div className="quill-mail">
                   <ReactQuill
                     theme="snow"
                     value={formData.mailText ?? ''}
                     onChange={(value) => handleChange('mailText', value)}
                     placeholder="Einleitung, Organisatorisches, Ausblick..."
                      modules={{
                        toolbar: [
                          [{ 'size': ['small', false, 'large', 'huge'] }],
                          ['bold', 'italic', 'underline'],
                          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                          ['link'],
                          ['clean']
                        ]
                      }}
                   />
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
                  onPress={resetFormData}
                >
                  Abbrechen
                </Button>
              </>
            )}
            <Button
              variant="primary"
              onPress={async () => {
                if (hasChanges) {
                  await updateSeason.mutateAsync({ id: season!.id, data: formData })
                  setHasChanges(false)
                }
                const result = await fetchPreview()
                if (result.data) {
                  setPreviewHtml(result.data.html)
                  setShowPreviewModal(true)
                }
              }}
              isDisabled={isFetchingPreview}
              className="bg-[#4a5568] text-[#f5f5f5] font-medium"
            >
              {isFetchingPreview ? 'Lade Vorschau...' : 'Vorschau'}
            </Button>
          </div>

          <div className="mt-6">
            <Button
              variant="primary"
              onPress={() => setShowMailSendDialog(true)}
              className="bg-[#c9a66b] text-[#0f1419] font-medium"
            >
              An alle Manager senden
            </Button>
          </div>
        </>
      )}

      {showPreviewModal && previewHtml && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#1a2028] border border-[#2d3748] p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[#f5f5f5]">E-Mail Vorschau</h3>
              <Button
                size="sm"
                variant="secondary"
                onPress={() => {
                  setShowPreviewModal(false)
                  setPreviewHtml(null)
                }}
                className="h-7 px-3 text-xs"
              >
                ✕
              </Button>
            </div>
            <div className="flex-1 overflow-auto rounded-lg border border-[#3d4a5c]">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-[60vh] bg-white"
                title="E-Mail Vorschau"
              />
            </div>
            <div className="flex justify-end mt-4">
              <Button
                variant="secondary"
                onPress={() => {
                  setShowPreviewModal(false)
                  setPreviewHtml(null)
                }}
              >
                Schließen
              </Button>
            </div>
          </Card>
        </div>
      )}

      {season && (
        <PrizeDistributionMailSendDialog
          isOpen={showMailSendDialog}
          onClose={() => setShowMailSendDialog(false)}
          seasonId={season.id}
          seasonName={season.name}
        />
      )}

       {season && (
        <CalculationDialog
          isOpen={showCalcDialog}
          onClose={() => setShowCalcDialog(false)}
          seasonId={season.id}
        />
      )}

      {showConfirmDialog && season && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="bg-[#1a2028] border border-[#2d3748] p-6 max-w-md">
            <h3 className="text-xl font-bold text-[#f5f5f5] mb-4">Gewinnverteilung berechnen</h3>
            <p className="text-[#a0aec0] mb-6">
              Die bisherige Gewinnverteilung wird überschrieben. Möchten Sie fortfahren?
            </p>
            <div className="flex gap-4 justify-end">
              <Button
                variant="secondary"
                onPress={() => setShowConfirmDialog(false)}
              >
                Abbrechen
              </Button>
              <Button
                variant="primary"
                onPress={async () => {
                  setShowConfirmDialog(false)
                  setErrorMessage(null)
                  try {
                    await calculatePrize.mutateAsync(season.id)
                  } catch (error: any) {
                    const message = error?.response?.data?.message || error?.message || 'Ein unbekannter Fehler ist aufgetreten.'
                    setErrorMessage(message)
                  }
                }}
                className="bg-[#c9a66b] text-[#0f1419] font-medium"
              >
                Berechnen
              </Button>
            </div>
          </Card>
        </div>
      )}

      {commentDialogManager && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#1a2028] border border-[#2d3748] p-6 w-full max-w-5xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-[#f5f5f5]">Kommentar</h3>
                <p className="text-sm text-[#a0aec0]">{commentDialogManager.managerName} - {commentDialogManager.prizeAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onPress={() => setCommentDialogManager(null)}
                className="h-7 px-3 text-xs"
              >
                ✕
              </Button>
            </div>
            <textarea
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              rows={24}
              placeholder="Kommentar eingeben..."
              className="w-full bg-[#242d38] border border-[#3d4a5c] rounded-md text-[#f5f5f5] p-3 text-sm resize-y"
            />
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="secondary"
                onPress={() => setCommentDialogManager(null)}
              >
                Abbrechen
              </Button>
              <Button
                variant="primary"
                onPress={() => {
                  updatePrizePayout.mutate({
                    managerId: commentDialogManager.managerId,
                    data: { comment: commentDraft }
                  })
                  setCommentDialogManager(null)
                }}
                className="bg-[#c9a66b] text-[#0f1419] font-medium"
              >
                Speichern
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
