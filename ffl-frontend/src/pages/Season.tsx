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
import Button from '../components/Button'
import PageHeader from '../components/PageHeader'
import Tabs from '../components/Tabs'
import FormCard from '../components/FormCard'
import { TableHead, Th, TableBody } from '../components/Table'
import type { Season, SeasonState, PrizeDistributionLog, PrizePayout, PayoutStatus } from '../types'

const seasonStateOptions: { value: SeasonState; label: string }[] = [
  { value: 'BEFORE_SEASON', label: 'Vor Saison' },
  { value: 'RUNNING_HINRUNDE', label: 'Hinrunde' },
  { value: 'RUNNING_RUECKRUNDE', label: 'Rückrunde' }
]

const COLOR_FIRST = '#90EE90'
const COLOR_NORMAL = '#87CEFA'
const COLOR_LAST = '#FFA500'

const tabItems = [
  { key: 'saisondaten', label: 'Saisondaten' },
  { key: 'gewinnausschuettung', label: 'Gewinnausschüttung' },
  { key: 'saisonabschlussmail', label: 'Saisonabschlussmail' }
]

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
          <p className="text-primary font-medium">{formatPrizeLabel(data.prize)}</p>
        </div>
      )
    }
    return null
  }

  if (chartData.length === 0) {
    return null
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4e" horizontal={true} vertical={false} />
          <XAxis 
            dataKey="position" 
            stroke="#c5c5c5" 
            tick={{ fill: '#c5c5c5', fontSize: 12 }}
            label={{ value: 'Platz', position: 'bottom', fill: '#c5c5c5', offset: -5 }}
          />
          <YAxis 
            stroke="#c5c5c5" 
            tick={{ fill: '#c5c5c5', fontSize: 12 }}
            label={{ value: 'Preisgeld (€)', angle: -90, position: 'insideLeft', fill: '#c5c5c5' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} wrapperStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }} />
          <Bar dataKey="prize" radius={[4, 4, 0, 0]}>
            <LabelList 
              dataKey="prizeLabel" 
              position="top" 
              fill="#c5c5c5" 
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
      <PageHeader icon="sap-icon-settings" title="Saison">
        <Badge>
          {seasonStateOptions.find(o => o.value === season.seasonState)?.label || season.seasonState}
        </Badge>
        {season.currentMatchday && (
          <span className="text-sm text-muted">
            {season.currentMatchday}. Spieltag
          </span>
        )}
      </PageHeader>

      <Tabs
        items={tabItems}
        active={activeTab}
        onChange={(key) => setActiveTab(key as 'saisondaten' | 'gewinnausschuettung' | 'saisonabschlussmail')}
      />

      {activeTab === 'saisondaten' && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <FormCard>
              <label className="block text-sm text-muted mb-1">Name</label>
              <input
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                className="input-field w-full px-3 py-2 rounded focus:outline-none"
              />
            </FormCard>

            <FormCard>
              <label className="block text-sm text-muted mb-1">Budget (€)</label>
              <input
                value={formData.budget ? formData.budget.toLocaleString('de-DE') : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/\./g, '')
                  handleChange('budget', parseInt(value) || 0)
                }}
                className="input-field w-full px-3 py-2 rounded focus:outline-none"
              />
            </FormCard>

            <FormCard>
              <label className="block text-sm text-muted mb-1">Start Spieltag Rückrunde</label>
              <input
                type="number"
                value={formData.startRoundRueckrunde || ''}
                onChange={(e) => handleChange('startRoundRueckrunde', parseInt(e.target.value) || 16)}
                className="input-field w-full px-3 py-2 rounded focus:outline-none"
              />
            </FormCard>

            <FormCard>
              <label className="block text-sm text-muted mb-1">Aktueller Spieltag</label>
              <input
                value={season.currentMatchday?.toString() ?? '-'}
                readOnly
                className="input-field w-full px-3 py-2 rounded focus:outline-none opacity-70"
              />
            </FormCard>

            <FormCard className="md:col-span-2">
              <label className="block text-sm text-muted mb-3">Saisonphase</label>
              <div className="flex gap-4">
                {seasonStateOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
                      formData.seasonState === option.value
                        ? 'bg-primary text-primary-foreground'
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
            </FormCard>
          </div>

          <div className="mt-6 flex gap-4">
            {hasChanges && (
              <>
                <Button
                  variant="emphasized"
                  onClick={handleSave}
                  disabled={updateSeason.isPending}
                >
                  {updateSeason.isPending ? 'Wird gespeichert...' : 'Speichern'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={resetFormData}
                >
                  Abbrechen
                </Button>
              </>
            )}
            
            <Button
              variant="emphasized"
              onClick={handleCalculate}
            >
              Punkte neu berechnen
            </Button>
          </div>
        </>
      )}

      {activeTab === 'gewinnausschuettung' && (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            <FormCard className={validationErrors.spieleinsatzEuro ? 'border-danger' : ''}>
              <label className="block text-sm text-muted mb-1">Spieleinsatz (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.spieleinsatzEuro ?? ''}
                onChange={(e) => handleChange('spieleinsatzEuro', parseFloat(e.target.value) || 0)}
                className={`input-field w-full px-3 py-2 rounded focus:outline-none ${validationErrors.spieleinsatzEuro ? 'border-danger' : ''}`}
              />
              {validationErrors.spieleinsatzEuro && <p className="text-danger text-sm mt-1">{validationErrors.spieleinsatzEuro}</p>}
            </FormCard>

            <FormCard className={validationErrors.serverkostenEuro ? 'border-danger' : ''}>
              <label className="block text-sm text-muted mb-1">Serverkosten (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.serverkostenEuro ?? ''}
                onChange={(e) => handleChange('serverkostenEuro', parseFloat(e.target.value) || 0)}
                className={`input-field w-full px-3 py-2 rounded focus:outline-none ${validationErrors.serverkostenEuro ? 'border-danger' : ''}`}
              />
              {validationErrors.serverkostenEuro && <p className="text-danger text-sm mt-1">{validationErrors.serverkostenEuro}</p>}
            </FormCard>

            <FormCard className={validationErrors.anzahlSpielleiter ? 'border-danger' : ''}>
              <label className="block text-sm text-muted mb-1">Anzahl Spielleiter</label>
              <input
                type="number"
                value={formData.anzahlSpielleiter ?? ''}
                onChange={(e) => handleChange('anzahlSpielleiter', parseInt(e.target.value) || 0)}
                className={`input-field w-full px-3 py-2 rounded focus:outline-none ${validationErrors.anzahlSpielleiter ? 'border-danger' : ''}`}
              />
              {validationErrors.anzahlSpielleiter && <p className="text-danger text-sm mt-1">{validationErrors.anzahlSpielleiter}</p>}
            </FormCard>

            <FormCard className={validationErrors.gewinnErsterPlatzProzent ? 'border-danger' : ''}>
              <label className="block text-sm text-muted mb-1">Gewinn 1. Platz (%)</label>
              <input
                type="number"
                value={formData.gewinnErsterPlatzProzent ?? ''}
                onChange={(e) => handleChange('gewinnErsterPlatzProzent', parseInt(e.target.value) || 0)}
                className={`input-field w-full px-3 py-2 rounded focus:outline-none ${validationErrors.gewinnErsterPlatzProzent ? 'border-danger' : ''}`}
              />
              {validationErrors.gewinnErsterPlatzProzent && <p className="text-danger text-sm mt-1">{validationErrors.gewinnErsterPlatzProzent}</p>}
            </FormCard>

            <FormCard className={validationErrors.gewinnLetzterPlatzEuro ? 'border-danger' : ''}>
              <label className="block text-sm text-muted mb-1">Gewinn letzter Platz (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.gewinnLetzterPlatzEuro ?? ''}
                onChange={(e) => handleChange('gewinnLetzterPlatzEuro', parseFloat(e.target.value) || 0)}
                className={`input-field w-full px-3 py-2 rounded focus:outline-none ${validationErrors.gewinnLetzterPlatzEuro ? 'border-danger' : ''}`}
              />
              {validationErrors.gewinnLetzterPlatzEuro && <p className="text-danger text-sm mt-1">{validationErrors.gewinnLetzterPlatzEuro}</p>}
            </FormCard>
          </div>

          {hasChanges && (
            <div className="mt-6 flex gap-4">
              <Button
                variant="emphasized"
                onClick={handleSave}
                disabled={updateSeason.isPending}
              >
                {updateSeason.isPending ? 'Wird gespeichert...' : 'Speichern'}
              </Button>
              <Button
                variant="ghost"
                onClick={resetFormData}
              >
                Abbrechen
              </Button>
            </div>
          )}

          <div className="mt-6 border-t border-border pt-6">
            {hasChanges && (
              <p className="text-muted mb-4 text-sm">Bitte speichern Sie zuerst Ihre Änderungen, bevor Sie die Gewinnverteilung berechnen.</p>
            )}
            {errorMessage && (
              <div className="bg-danger-bg border border-danger p-4 mb-4">
                <p className="text-danger text-sm">{errorMessage}</p>
              </div>
            )}
            <div className="flex gap-4 justify-end mt-6">
              <Button
                variant="emphasized"
                onClick={() => setShowConfirmDialog(true)}
                disabled={hasChanges || calculatePrize.isPending}
              >
                {calculatePrize.isPending ? 'Wird berechnet...' : 'Gewinnverteilung berechnen'}
              </Button>
            </div>
          </div>

          {isLoadingPrize && (
            <div className="mt-6 text-center py-8 text-muted">Lade Gewinnverteilung...</div>
          )}

          {prizeDistributionLog && (
            <div className="mt-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Berechnungsstatistik</h2>
              <FormCard>
                <div dangerouslySetInnerHTML={{ __html: prizeDistributionLog.statisticsHtml }} />
              </FormCard>
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
              <div className="bg-surface border border-border rounded-lg p-3 mb-4">
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
              <div className="rounded-lg border border-border overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <TableHead>
                    <tr>
                      <Th className="whitespace-nowrap">Platz</Th>
                      <Th className="whitespace-nowrap">Manager</Th>
                      <Th className="whitespace-nowrap">Vorname</Th>
                      <Th className="whitespace-nowrap">Nachname</Th>
                      <Th className="whitespace-nowrap">E-Mail</Th>
                      <Th align="right" className="whitespace-nowrap">Punkte</Th>
                      <Th align="right" className="whitespace-nowrap">Gewinn (€)</Th>
                      <Th align="center" className="whitespace-nowrap">Status</Th>
                      <Th align="center" className="whitespace-nowrap">Kommentar</Th>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {prizeDistribution.map((payout) => (
                      <tr 
                        key={payout.managerId} 
                        className="border-b border-border last:border-b-0 hover:bg-card-hover"
                        style={{ borderLeftWidth: '4px', borderLeftColor: payout.payoutStatus === 'PAID' ? '#36b37e' : '#2a3a4e' }}
                      >
                        <td className="px-3 py-2 text-foreground font-medium">{payout.position}</td>
                        <td className="px-3 py-2 text-foreground">{payout.managerName}</td>
                        <td className="px-3 py-2 text-muted">{payout.managerFirstName || '-'}</td>
                        <td className="px-3 py-2 text-muted">{payout.managerLastName || '-'}</td>
                        <td className="px-3 py-2 text-muted">{payout.managerEmail || '-'}</td>
                        <td className="px-3 py-2 text-right text-foreground">{payout.pointsTotal}</td>
                        <td className="px-3 py-2 text-right text-primary font-medium">
                          {payout.prizeAmount % 1 === 0
                            ? Math.round(payout.prizeAmount)
                            : payout.prizeAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-center">
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
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => {
                              setCommentDialogManager(payout)
                              setCommentDraft(payout.comment || '')
                            }}
                            className={`text-lg p-1 rounded transition-colors ${
                              payout.comment
                                ? 'bg-success hover:bg-success'
                                : 'bg-default hover:bg-elevated'
                            }`}
                            title={payout.comment || 'Kommentar hinzufügen'}
                          >
                            📝
                          </button>
                        </td>
                      </tr>
                    ))}
                   </TableBody>
                 </table>
               </div>
             </div>
           )}
         </>
       )}

      {activeTab === 'saisonabschlussmail' && (
         <>
            <div className="grid gap-6">
               <FormCard className="overflow-visible">
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
               </FormCard>
            </div>

          <div className="mt-6 flex gap-4">
            {hasChanges && (
              <>
                <Button
                  variant="emphasized"
                  onClick={handleSave}
                  disabled={updateSeason.isPending}
                >
                  {updateSeason.isPending ? 'Wird gespeichert...' : 'Speichern'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={resetFormData}
                >
                  Abbrechen
                </Button>
              </>
            )}
            <Button
              variant="transparent"
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
            >
              {isFetchingPreview ? 'Lade Vorschau...' : 'Vorschau'}
            </Button>
          </div>

          <div className="mt-6">
            <Button
              variant="emphasized"
              onClick={() => setShowMailSendDialog(true)}
            >
              An alle Manager senden
            </Button>
          </div>
        </>
      )}

      {showPreviewModal && previewHtml && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <FormCard className="w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-foreground">E-Mail Vorschau</h3>
              <Button
                variant="ghost"
                size="compact"
                onClick={() => {
                  setShowPreviewModal(false)
                  setPreviewHtml(null)
                }}
              >
                ✕
              </Button>
            </div>
            <div className="flex-1 overflow-auto rounded-lg border border-border-hover">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-[60vh] bg-white"
                title="E-Mail Vorschau"
              />
            </div>
            <div className="flex justify-end mt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowPreviewModal(false)
                  setPreviewHtml(null)
                }}
              >
                Schließen
              </Button>
            </div>
          </FormCard>
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
          <FormCard className="max-w-md">
            <h3 className="text-xl font-bold text-foreground mb-4">Gewinnverteilung berechnen</h3>
            <p className="text-muted mb-6">
              Die bisherige Gewinnverteilung wird überschrieben. Möchten Sie fortfahren?
            </p>
            <div className="flex gap-4 justify-end">
              <Button
                variant="ghost"
                onClick={() => setShowConfirmDialog(false)}
              >
                Abbrechen
              </Button>
              <Button
                variant="emphasized"
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
              >
                Berechnen
              </Button>
            </div>
          </FormCard>
        </div>
      )}

      {commentDialogManager && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <FormCard className="w-full max-w-5xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-foreground">Kommentar</h3>
                <p className="text-sm text-muted">{commentDialogManager.managerName} - {commentDialogManager.prizeAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
              </div>
              <Button
                variant="ghost"
                size="compact"
                onClick={() => setCommentDialogManager(null)}
              >
                ✕
              </Button>
            </div>
            <textarea
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              rows={24}
              placeholder="Kommentar eingeben..."
              className="w-full bg-elevated border border-border-hover rounded-md text-foreground p-3 text-sm resize-y"
            />
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="ghost"
                onClick={() => setCommentDialogManager(null)}
              >
                Abbrechen
              </Button>
              <Button
                variant="emphasized"
                onClick={() => {
                  updatePrizePayout.mutate({
                    managerId: commentDialogManager.managerId,
                    data: { comment: commentDraft }
                  })
                  setCommentDialogManager(null)
                }}
              >
                Speichern
              </Button>
            </div>
          </FormCard>
        </div>
      )}
    </div>
  )
}
