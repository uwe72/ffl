import { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import ReactQuill, { Quill } from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import { trackEvent } from '../hooks/useMatomo'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Size = Quill.import('formats/size') as any
Size.whitelist = ['8px', '9px', '10px', '11px', '12px', '13px', '14px', '15px', '16px', '17px', '18px', '20px', '22px', '24px', '28px', '32px']
Quill.register(Size, true)
import { useCurrentSeason, useUpdateSeason, usePrizeDistribution, useCalculatePrizeDistribution, usePrizeDistributionLog, useUpdatePrizePayout, usePrizeDistributionMailPreview } from '../hooks/useSeasons'
import CalculationDialog from '../components/CalculationDialog'
import PrizeDistributionMailSendDialog from '../components/PrizeDistributionMailSendDialog'
import Badge from '../components/Badge'
import { Settings } from 'lucide-react'
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
        <div className="bg-surface border border-border rounded-lg p-3 shadow-lg">
          <p className="text-foreground font-semibold">{data.position}</p>
          <p className="text-accent font-medium">{formatPrizeLabel(data.prize)}</p>
        </div>
      )
    }
    return null
  }

  if (chartData.length === 0) {
    return null
  }

  return (
    <div className="bg-surface border border-border p-6">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4e" horizontal={true} vertical={false} />
          <XAxis 
            dataKey="position" 
            stroke="#bfccd8" 
            tick={{ fill: '#bfccd8', fontSize: 12 }}
            label={{ value: 'Platz', position: 'bottom', fill: '#bfccd8', offset: -5 }}
          />
          <YAxis 
            stroke="#bfccd8" 
            tick={{ fill: '#bfccd8', fontSize: 12 }}
            label={{ value: 'Preisgeld (€)', angle: -90, position: 'insideLeft', fill: '#bfccd8' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="prize" radius={[4, 4, 0, 0]}>
            <LabelList 
              dataKey="prizeLabel" 
              position="top" 
              fill="#bfccd8" 
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
          <span className="text-muted text-sm">Erster Platz</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded" style={{ backgroundColor: COLOR_NORMAL }} />
          <span className="text-muted text-sm">Normal (Degression)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded" style={{ backgroundColor: COLOR_LAST }} />
          <span className="text-muted text-sm">Letzter Platz</span>
        </div>
      </div>
    </div>
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
    trackEvent('season', 'save', activeTab)
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

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>
  if (!season) return <div className="text-center py-8 text-subtle">Keine aktuelle Saison gefunden</div>

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Settings size={28} className="text-accent" />
          <h1 className="text-sm font-medium text-accent">Saison</h1>
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <Badge>
            {seasonStateOptions.find(o => o.value === season.seasonState)?.label || season.seasonState}
          </Badge>
          {season.currentMatchday && (
            <span className="text-sm text-muted">
              {season.currentMatchday}. Spieltag
            </span>
          )}
        </div>
      </div>

      <div className="border-b border-border mb-6">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('saisondaten')}
            className={`pb-3 px-1 text-lg font-medium transition-colors ${
              activeTab === 'saisondaten'
                ? 'text-accent border-b-2 border-accent'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Saisondaten
          </button>
          <button
            onClick={() => setActiveTab('gewinnausschuettung')}
            className={`pb-3 px-1 text-lg font-medium transition-colors ${
              activeTab === 'gewinnausschuettung'
                ? 'text-accent border-b-2 border-accent'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Gewinnausschüttung
          </button>
          <button
            onClick={() => setActiveTab('saisonabschlussmail')}
            className={`pb-3 px-1 text-lg font-medium transition-colors ${
              activeTab === 'saisonabschlussmail'
                ? 'text-accent border-b-2 border-accent'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Saisonabschlussmail
          </button>
        </div>
      </div>

      {activeTab === 'saisondaten' && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="p-6 bg-surface border border-border">
              <label className="block text-sm text-muted mb-1">Name</label>
              <input
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                className="input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated border-border-hover text-foreground"
              />
            </div>

            <div className="p-6 bg-surface border border-border">
              <label className="block text-sm text-muted mb-1">Budget (€)</label>
              <input
                value={formData.budget ? formData.budget.toLocaleString('de-DE') : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/\./g, '')
                  handleChange('budget', parseInt(value) || 0)
                }}
                className="input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated border-border-hover text-foreground"
              />
            </div>

            <div className="p-6 bg-surface border border-border">
              <label className="block text-sm text-muted mb-1">Start Spieltag Rückrunde</label>
              <input
                type="number"
                value={formData.startRoundRueckrunde || ''}
                onChange={(e) => handleChange('startRoundRueckrunde', parseInt(e.target.value) || 16)}
                className="input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated border-border-hover text-foreground"
              />
            </div>

            <div className="p-6 bg-surface border border-border">
              <label className="block text-sm text-muted mb-1">Aktueller Spieltag</label>
              <input
                value={season.currentMatchday?.toString() ?? '-'}
                readOnly
                className="input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated border-border-hover text-foreground opacity-70"
              />
            </div>

            <div className="p-6 bg-surface border border-border md:col-span-2">
              <label className="block text-sm text-muted mb-3">Saisonphase</label>
              <div className="flex gap-4">
                {seasonStateOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
                      formData.seasonState === option.value
                        ? 'bg-primary text-background'
                        : 'bg-elevated text-muted hover:bg-border-hover'
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
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            {hasChanges && (
              <>
                <button
                  onClick={handleSave}
                  disabled={updateSeason.isPending}
                  className="bg-primary text-background font-medium px-4 py-2 rounded hover:bg-button-primary-hover transition-colors disabled:opacity-50"
                >
                  {updateSeason.isPending ? 'Wird gespeichert...' : 'Speichern'}
                </button>
                <button
                  className="button-secondary px-4 py-2 rounded transition-colors"
                  onClick={resetFormData}
                >
                  Abbrechen
                </button>
              </>
            )}
            
            <button
              onClick={handleCalculate}
              className="bg-primary text-background font-medium px-4 py-2 rounded hover:bg-button-primary-hover transition-colors"
            >
              Punkte neu berechnen
            </button>
          </div>
        </>
      )}

      {activeTab === 'gewinnausschuettung' && (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            <div className={`p-6 bg-surface border ${validationErrors.spieleinsatzEuro ? 'border-danger' : 'border-border'}`}>
              <label className="block text-sm text-muted mb-1">Spieleinsatz (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.spieleinsatzEuro ?? ''}
                onChange={(e) => handleChange('spieleinsatzEuro', parseFloat(e.target.value) || 0)}
                className={`input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated text-foreground ${validationErrors.spieleinsatzEuro ? 'border-danger' : 'border-border-hover'}`}
              />
              {validationErrors.spieleinsatzEuro && <p className="text-danger text-sm mt-1">{validationErrors.spieleinsatzEuro}</p>}
            </div>

            <div className={`p-6 bg-surface border ${validationErrors.serverkostenEuro ? 'border-danger' : 'border-border'}`}>
              <label className="block text-sm text-muted mb-1">Serverkosten (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.serverkostenEuro ?? ''}
                onChange={(e) => handleChange('serverkostenEuro', parseFloat(e.target.value) || 0)}
                className={`input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated text-foreground ${validationErrors.serverkostenEuro ? 'border-danger' : 'border-border-hover'}`}
              />
              {validationErrors.serverkostenEuro && <p className="text-danger text-sm mt-1">{validationErrors.serverkostenEuro}</p>}
            </div>

            <div className={`p-6 bg-surface border ${validationErrors.anzahlSpielleiter ? 'border-danger' : 'border-border'}`}>
              <label className="block text-sm text-muted mb-1">Anzahl Spielleiter</label>
              <input
                type="number"
                value={formData.anzahlSpielleiter ?? ''}
                onChange={(e) => handleChange('anzahlSpielleiter', parseInt(e.target.value) || 0)}
                className={`input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated text-foreground ${validationErrors.anzahlSpielleiter ? 'border-danger' : 'border-border-hover'}`}
              />
              {validationErrors.anzahlSpielleiter && <p className="text-danger text-sm mt-1">{validationErrors.anzahlSpielleiter}</p>}
            </div>

            <div className={`p-6 bg-surface border ${validationErrors.gewinnErsterPlatzProzent ? 'border-danger' : 'border-border'}`}>
              <label className="block text-sm text-muted mb-1">Gewinn 1. Platz (%)</label>
              <input
                type="number"
                value={formData.gewinnErsterPlatzProzent ?? ''}
                onChange={(e) => handleChange('gewinnErsterPlatzProzent', parseInt(e.target.value) || 0)}
                className={`input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated text-foreground ${validationErrors.gewinnErsterPlatzProzent ? 'border-danger' : 'border-border-hover'}`}
              />
              {validationErrors.gewinnErsterPlatzProzent && <p className="text-danger text-sm mt-1">{validationErrors.gewinnErsterPlatzProzent}</p>}
            </div>

            <div className={`p-6 bg-surface border ${validationErrors.gewinnLetzterPlatzEuro ? 'border-danger' : 'border-border'}`}>
              <label className="block text-sm text-muted mb-1">Gewinn letzter Platz (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.gewinnLetzterPlatzEuro ?? ''}
                onChange={(e) => handleChange('gewinnLetzterPlatzEuro', parseFloat(e.target.value) || 0)}
                className={`input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated text-foreground ${validationErrors.gewinnLetzterPlatzEuro ? 'border-danger' : 'border-border-hover'}`}
              />
              {validationErrors.gewinnLetzterPlatzEuro && <p className="text-danger text-sm mt-1">{validationErrors.gewinnLetzterPlatzEuro}</p>}
            </div>
          </div>

          {hasChanges && (
            <div className="mt-6 flex gap-4">
              <button
                onClick={handleSave}
                disabled={updateSeason.isPending}
                className="bg-primary text-background font-medium px-4 py-2 rounded hover:bg-button-primary-hover transition-colors disabled:opacity-50"
              >
                {updateSeason.isPending ? 'Wird gespeichert...' : 'Speichern'}
              </button>
              <button
                className="button-secondary px-4 py-2 rounded transition-colors"
                onClick={resetFormData}
              >
                Abbrechen
              </button>
            </div>
          )}

          <div className="mt-6 border-t border-border pt-6">
            {hasChanges && (
              <p className="text-muted mb-4 text-sm">Bitte speichern Sie zuerst Ihre Änderungen, bevor Sie die Gewinnverteilung berechnen.</p>
            )}
            {errorMessage && (
              <div className="bg-[#3d1f1f] border border-[#8b3a3a] p-4 mb-4">
                <p className="text-[#f87171] text-sm">{errorMessage}</p>
              </div>
            )}
            <div className="flex gap-4 justify-end mt-6">
              <button
                onClick={() => setShowConfirmDialog(true)}
                disabled={hasChanges || calculatePrize.isPending}
                className="bg-primary text-background font-medium px-4 py-2 rounded hover:bg-button-primary-hover transition-colors disabled:opacity-50"
              >
                {calculatePrize.isPending ? 'Wird berechnet...' : 'Gewinnverteilung berechnen'}
              </button>
            </div>
          </div>

          {isLoadingPrize && (
            <div className="mt-6 text-center py-8 text-muted">Lade Gewinnverteilung...</div>
          )}

          {prizeDistributionLog && (
            <div className="mt-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Berechnungsstatistik</h2>
              <div className="bg-surface border border-border p-6">
                <div dangerouslySetInnerHTML={{ __html: prizeDistributionLog.statisticsHtml }} />
              </div>
            </div>
          )}

          {prizeDistribution && prizeDistribution.length > 0 && (
            <div className="mt-6">
              {prizeDistributionLog && prizeDistributionLog.basePrizes && (
                <div className="mt-6">
                  <h2 className="text-xl font-bold text-foreground mb-4">Gewinnverteilung (Basis-Kurve)</h2>
                  <PrizeDistributionChart prizeDistributionLog={prizeDistributionLog} />
                </div>
              )}
              
              <h2 className="text-xl font-bold text-foreground mb-4 mt-6">
                Gewinnverteilung
              </h2>
              <div className="bg-surface border border-border p-3 mb-4">
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted">Gesamt:</span>
                    <span className="text-foreground font-medium">
                      {prizeDistribution.reduce((sum, p) => sum + p.prizeAmount, 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted">Ausbezahlt:</span>
                    <span className="text-success font-medium">
                      {prizeDistribution.filter(p => p.payoutStatus === 'PAID').reduce((sum, p) => sum + p.prizeAmount, 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                    <span className="text-muted">({prizeDistribution.filter(p => p.payoutStatus === 'PAID').length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted">Offen:</span>
                    <span className="text-danger font-medium">
                      {prizeDistribution.filter(p => p.payoutStatus !== 'PAID').reduce((sum, p) => sum + p.prizeAmount, 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                    <span className="text-muted">({prizeDistribution.filter(p => p.payoutStatus !== 'PAID').length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-default rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success"
                        style={{ width: `${prizeDistribution.reduce((sum, p) => sum + p.prizeAmount, 0) > 0 ? (prizeDistribution.filter(p => p.payoutStatus === 'PAID').reduce((sum, p) => sum + p.prizeAmount, 0) / prizeDistribution.reduce((sum, p) => sum + p.prizeAmount, 0)) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-foreground font-medium">
                      {prizeDistribution.reduce((sum, p) => sum + p.prizeAmount, 0) > 0 ? Math.round((prizeDistribution.filter(p => p.payoutStatus === 'PAID').reduce((sum, p) => sum + p.prizeAmount, 0) / prizeDistribution.reduce((sum, p) => sum + p.prizeAmount, 0)) * 100) : 0}% (Auszahlungsbeträge)
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-surface border border-border overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-muted font-medium whitespace-nowrap">Platz</th>
                      <th className="text-left py-3 px-4 text-muted font-medium whitespace-nowrap">Manager</th>
                      <th className="text-left py-3 px-4 text-muted font-medium whitespace-nowrap">Vorname</th>
                      <th className="text-left py-3 px-4 text-muted font-medium whitespace-nowrap">Nachname</th>
                      <th className="text-left py-3 px-4 text-muted font-medium whitespace-nowrap">E-Mail</th>
                      <th className="text-right py-3 px-4 text-muted font-medium whitespace-nowrap">Punkte</th>
                      <th className="text-right py-3 px-4 text-muted font-medium whitespace-nowrap">Gewinn (€)</th>
                      <th className="text-center py-3 px-4 text-muted font-medium whitespace-nowrap">Status</th>
                      <th className="text-center py-3 px-4 text-muted font-medium whitespace-nowrap">Kommentar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prizeDistribution.map((payout) => (
                      <tr 
                        key={payout.managerId} 
                        className="border-b border-border last:border-b-0 hover:bg-elevated"
                        style={{ borderLeftWidth: '4px', borderLeftColor: payout.payoutStatus === 'PAID' ? '#4ade80' : '#2a3a4e' }}
                      >
                        <td className="py-3 px-4 text-foreground font-medium">{payout.position}</td>
                        <td className="py-3 px-4 text-foreground">{payout.managerName}</td>
                        <td className="py-3 px-4 text-foreground">{payout.managerFirstName || '-'}</td>
                        <td className="py-3 px-4 text-foreground">{payout.managerLastName || '-'}</td>
                        <td className="py-3 px-4 text-foreground">{payout.managerEmail || '-'}</td>
                        <td className="py-3 px-4 text-right text-foreground">{payout.pointsTotal}</td>
                        <td className="py-3 px-4 text-right text-accent font-medium">
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
                                ? 'bg-success text-background'
                                : 'bg-default text-foreground'
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
                                ? 'bg-success hover:bg-success'
                                : 'bg-default hover:bg-[#8899aa]'
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
               </div>
             </div>
           )}
         </>
       )}

      {activeTab === 'saisonabschlussmail' && (
         <>
            <div className="grid gap-6">
               <div className="p-6 bg-surface border border-border overflow visible">
                 <label className="block text-sm text-muted mb-2">Saisonabschlussmail</label>
                 <div className="quill-mail">
                   <ReactQuill
                     theme="snow"
                     value={formData.mailText ?? ''}
                     onChange={(value) => handleChange('mailText', value)}
                     placeholder="Einleitung, Organisatorisches, Ausblick..."
                       modules={{
                         toolbar: [
                            [{ 'size': ['8px', '9px', '10px', '11px', '12px', '13px', '14px', '15px', '16px', '17px', '18px', '20px', '22px', '24px', '28px', '32px'] }],
                           ['bold', 'italic', 'underline'],
                           [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                           ['link'],
                           ['clean']
                         ]
                       }}
                   />
                 </div>
               </div>
            </div>

          <div className="mt-6 flex gap-4">
            {hasChanges && (
              <>
                <button
                  onClick={handleSave}
                  disabled={updateSeason.isPending}
                  className="bg-primary text-background font-medium px-4 py-2 rounded hover:bg-button-primary-hover transition-colors disabled:opacity-50"
                >
                  {updateSeason.isPending ? 'Wird gespeichert...' : 'Speichern'}
                </button>
                <button
                  className="button-secondary px-4 py-2 rounded transition-colors"
                  onClick={resetFormData}
                >
                  Abbrechen
                </button>
              </>
            )}
            <button
              onClick={async () => {
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
              disabled={isFetchingPreview}
              className="bg-default text-foreground font-medium px-4 py-2 rounded transition-colors disabled:opacity-50"
            >
              {isFetchingPreview ? 'Lade Vorschau...' : 'Vorschau'}
            </button>
          </div>

          <div className="mt-6">
            <button
              onClick={() => setShowMailSendDialog(true)}
              className="bg-primary text-background font-medium px-4 py-2 rounded hover:bg-button-primary-hover transition-colors"
            >
              An alle Manager senden
            </button>
          </div>
        </>
      )}

      {showPreviewModal && previewHtml && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-foreground">E-Mail Vorschau</h3>
              <button
                className="button-secondary h-7 px-3 text-xs rounded transition-colors"
                onClick={() => {
                  setShowPreviewModal(false)
                  setPreviewHtml(null)
                }}
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto rounded-lg border border-border-hover">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-[60vh] bg-white"
                title="E-Mail Vorschau"
              />
            </div>
            <div className="flex justify-end mt-4">
              <button
                className="button-secondary px-4 py-2 rounded transition-colors"
                onClick={() => {
                  setShowPreviewModal(false)
                  setPreviewHtml(null)
                }}
              >
                Schließen
              </button>
            </div>
          </div>
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
          <div className="bg-surface border border-border p-6 max-w-md">
            <h3 className="text-xl font-bold text-foreground mb-4">Gewinnverteilung berechnen</h3>
            <p className="text-muted mb-6">
              Die bisherige Gewinnverteilung wird überschrieben. Möchten Sie fortfahren?
            </p>
            <div className="flex gap-4 justify-end">
              <button
                className="button-secondary px-4 py-2 rounded transition-colors"
                onClick={() => setShowConfirmDialog(false)}
              >
                Abbrechen
              </button>
              <button
                onClick={async () => {
                  setShowConfirmDialog(false)
                  setErrorMessage(null)
                  try {
                    await calculatePrize.mutateAsync(season.id)
                    trackEvent('gewinnverteilung', 'berechnen', 'success')
                  } catch (error: any) {
                    trackEvent('gewinnverteilung', 'berechnen', 'failure')
                    const message = error?.response?.data?.message || error?.message || 'Ein unbekannter Fehler ist aufgetreten.'
                    setErrorMessage(message)
                  }
                }}
                className="bg-primary text-background font-medium px-4 py-2 rounded hover:bg-button-primary-hover transition-colors"
              >
                Berechnen
              </button>
            </div>
          </div>
        </div>
      )}

      {commentDialogManager && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border p-6 w-full max-w-5xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-foreground">Kommentar</h3>
                <p className="text-sm text-muted">{commentDialogManager.managerName} - {commentDialogManager.prizeAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
              </div>
              <button
                className="button-secondary h-7 px-3 text-xs rounded transition-colors"
                onClick={() => setCommentDialogManager(null)}
              >
                ✕
              </button>
            </div>
            <textarea
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              rows={24}
              placeholder="Kommentar eingeben..."
              className="w-full bg-elevated border border-border-hover rounded-md text-foreground p-3 text-sm resize-y"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                className="button-secondary px-4 py-2 rounded transition-colors"
                onClick={() => setCommentDialogManager(null)}
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  updatePrizePayout.mutate({
                    managerId: commentDialogManager.managerId,
                    data: { comment: commentDraft }
                  })
                  setCommentDialogManager(null)
                }}
                className="bg-primary text-background font-medium px-4 py-2 rounded hover:bg-button-primary-hover transition-colors"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
