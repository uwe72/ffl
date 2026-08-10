import { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { trackEvent } from '../hooks/useMatomo'
import { useCurrentSeason, useUpdateSeason, usePrizeDistribution, useCalculatePrizeDistribution, usePrizeDistributionLog, useUpdatePrizePayout, usePreviewSeasonSetup, useGeneratePlayersPdf, useDeposits, useUpdateDeposit, useSyncDeposits } from '../hooks/useSeasons'
import { useSystemConfig, useUpdateSystemConfig } from '../hooks/useSystemConfig'
import { useAuth } from '../context/AuthContext'
import CalculationDialog from '../components/CalculationDialog'
import SetupProgressDialog from '../components/SetupProgressDialog'
import Button from '../components/Button'
import Tabs from '../components/Tabs'
import FormCard from '../components/FormCard'
import { TableHead, Th, TableBody } from '../components/Table'
import { seasonStateLabel } from '../utils/season'
import { getChartColors } from '../utils/chartColors'
import type { Season, SeasonState, PrizeDistributionLog, PrizePayout, PayoutStatus, SetupPreviewDto, Deposit, DepositSyncResult, DepositStatus, PaymentMethod } from '../types'

const seasonStateOptions: { value: SeasonState; label: string }[] = (
  ['BEFORE_SEASON', 'RUNNING_HINRUNDE', 'RUNNING_RUECKRUNDE'] as SeasonState[]
).map(value => ({ value, label: seasonStateLabel(value) as string }))

const chartColors = getChartColors()
const COLOR_FIRST = chartColors.success
const COLOR_NORMAL = chartColors.accentLight
const COLOR_LAST = chartColors.warning

const tabItems = [
  { key: 'saisondaten', label: 'Saisondaten' },
  { key: 'bankverbindung', label: 'Bankverbindung' },
  { key: 'einzahlungen', label: 'Einzahlungen' },
  { key: 'gewinnausschuettung', label: 'Gewinnausschüttung' },
  { key: 'neue-saison', label: 'Saison Datenimport' }
]

const DEFAULT_SOURCE_URL = 'https://classic.kicker-libero.de/api/gameloop/v1/state/current/se-k00012026.json'

function nextSeasonName(current?: string): string {
  if (!current) return '2026/27'
  const m = current.match(/^(\d{4})\/(\d{2,4})$/)
  if (!m) return '2026/27'
  const startYear = parseInt(m[1]) + 1
  const nextFull = (startYear + 1) % 100
  const nextShort = String(nextFull).padStart(2, '0')
  return `${startYear}/${nextShort}`
}

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
        <div className="bg-surface border border-border rounded-card p-3 shadow-lg">
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
    <div className="bg-surface border border-border rounded-card p-6">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} horizontal={true} vertical={false} />
          <XAxis 
            dataKey="position" 
            stroke={chartColors.axis} 
            tick={{ fill: chartColors.axis, fontSize: 12 }}
            label={{ value: 'Platz', position: 'bottom', fill: chartColors.axis, offset: -5 }}
          />
          <YAxis 
            stroke={chartColors.axis} 
            tick={{ fill: chartColors.axis, fontSize: 12 }}
            label={{ value: 'Preisgeld (€)', angle: -90, position: 'insideLeft', fill: chartColors.axis }}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} wrapperStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }} />
          <Bar dataKey="prize" radius={[4, 4, 0, 0]}>
            <LabelList 
              dataKey="prizeLabel" 
              position="top" 
              fill={chartColors.axis} 
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
          <span className="w-4 h-4 rounded-badge" style={{ backgroundColor: COLOR_FIRST }} />
          <span className="text-muted text-sm">Erster Platz</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-badge" style={{ backgroundColor: COLOR_NORMAL }} />
          <span className="text-muted text-sm">Normal (Degression)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-badge" style={{ backgroundColor: COLOR_LAST }} />
          <span className="text-muted text-sm">Letzter Platz</span>
        </div>
      </div>
    </div>
  )
}

export default function Season() {
  const { data: season, isLoading, error } = useCurrentSeason()
  const updateSeason = useUpdateSeason()
  const previewSeasonSetup = usePreviewSeasonSetup()
  const generatePlayersPdf = useGeneratePlayersPdf()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const { data: systemConfig } = useSystemConfig()
  const updateSystemConfig = useUpdateSystemConfig()
  const { data: prizeDistribution, isLoading: isLoadingPrize } = usePrizeDistribution(season?.id ?? 0)
  const { data: prizeDistributionLog } = usePrizeDistributionLog(season?.id ?? 0)
  const calculatePrize = useCalculatePrizeDistribution()
  const updatePrizePayout = useUpdatePrizePayout(season?.id ?? 0)
  const { data: deposits, isLoading: isLoadingDeposits } = useDeposits(season?.id ?? 0)
  const updateDeposit = useUpdateDeposit(season?.id ?? 0)
  const syncDeposits = useSyncDeposits(season?.id ?? 0)
  const [activeTab, setActiveTab] = useState<'saisondaten' | 'bankverbindung' | 'gewinnausschuettung' | 'einzahlungen' | 'neue-saison'>('saisondaten')
  const [formData, setFormData] = useState<Partial<Season>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [showCalcDialog, setShowCalcDialog] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [commentDialogManager, setCommentDialogManager] = useState<PrizePayout | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [depositCommentDialog, setDepositCommentDialog] = useState<Deposit | null>(null)
  const [depositCommentDraft, setDepositCommentDraft] = useState('')
  const [showDepositSyncConfirm, setShowDepositSyncConfirm] = useState(false)
  const [depositSyncResult, setDepositSyncResult] = useState<DepositSyncResult | null>(null)
  const [depositSyncError, setDepositSyncError] = useState<string | null>(null)
  const [setupSeasonName, setSetupSeasonName] = useState('')
  const [setupPreview, setSetupPreview] = useState<SetupPreviewDto | null>(null)
  const [showSetupConfirm, setShowSetupConfirm] = useState(false)
  const [showSetupDialog, setShowSetupDialog] = useState(false)
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false)
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(false)
  const [autoUpdateCron, setAutoUpdateCron] = useState('0 0 8 * * *')
  const [autoUpdateConfigError, setAutoUpdateConfigError] = useState<string | null>(null)
  const [autoUpdateSaving, setAutoUpdateSaving] = useState(false)
  const [sourceUrlDraft, setSourceUrlDraft] = useState(DEFAULT_SOURCE_URL)
  const [sourceUrlSaving, setSourceUrlSaving] = useState(false)
  const [pdfFeedback, setPdfFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (season) {
      setFormData({
        name: season.name,
        budget: season.budget,
        seasonState: season.seasonState,
        seasonStartDate: season.seasonStartDate ?? '',
        seasonStartTime: season.seasonStartTime ?? '',
        startRoundRueckrunde: season.startRoundRueckrunde,
        spieleinsatzEuro: season.spieleinsatzEuro ?? 10,
        serverkostenEuro: season.serverkostenEuro ?? 60,
        anzahlSpielleiter: season.anzahlSpielleiter ?? 2,
        gewinnErsterPlatzProzent: season.gewinnErsterPlatzProzent ?? 10,
        gewinnLetzterPlatzEuro: season.gewinnLetzterPlatzEuro ?? 15,
        paypalLink: season.paypalLink ?? '',
        bankName: season.bankName ?? '',
        iban: season.iban ?? '',
        bic: season.bic ?? '',
        kontoinhaber: season.kontoinhaber ?? ''
      })
      setHasChanges(false)
      if (!setupSeasonName) {
        setSetupSeasonName(nextSeasonName(season.name))
      }
    }
  }, [season])

  useEffect(() => {
    if (systemConfig) {
      setAutoUpdateEnabled(systemConfig.autoUpdateEnabled ?? false)
      setAutoUpdateCron(systemConfig.autoUpdateCron ?? '0 0 8 * * *')
      setSourceUrlDraft(systemConfig.autoUpdateSourceUrl || DEFAULT_SOURCE_URL)
    }
  }, [systemConfig])

  const effectiveSourceUrl = systemConfig?.autoUpdateSourceUrl || DEFAULT_SOURCE_URL

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
      seasonStartDate: season.seasonStartDate ?? '',
      seasonStartTime: season.seasonStartTime ?? '',
      startRoundRueckrunde: season.startRoundRueckrunde,
      spieleinsatzEuro: season.spieleinsatzEuro ?? 10,
      serverkostenEuro: season.serverkostenEuro ?? 60,
      anzahlSpielleiter: season.anzahlSpielleiter ?? 2,
      gewinnErsterPlatzProzent: season.gewinnErsterPlatzProzent ?? 10,
      gewinnLetzterPlatzEuro: season.gewinnLetzterPlatzEuro ?? 15,
      paypalLink: season.paypalLink ?? '',
      bankName: season.bankName ?? '',
      iban: season.iban ?? '',
      bic: season.bic ?? '',
      kontoinhaber: season.kontoinhaber ?? ''
    })
    setHasChanges(false)
  }

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>
  if (!season) return <div className="text-center py-8 text-subtle">Keine aktuelle Saison gefunden</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        {season.currentMatchday && (
          <span className="text-sm text-muted">
            {season.currentMatchday}. Spieltag
          </span>
        )}
      </div>

      <Tabs
        items={tabItems}
        active={activeTab}
        onChange={(key) => setActiveTab(key as 'saisondaten' | 'bankverbindung' | 'gewinnausschuettung' | 'einzahlungen' | 'neue-saison')}
      />

      {activeTab === 'saisondaten' && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <FormCard>
              <label className="block text-sm text-muted mb-1">Name</label>
              <input
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                className="input-field w-full px-3 py-2 rounded-control focus:outline-none"
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
                className="input-field w-full px-3 py-2 rounded-control focus:outline-none"
              />
            </FormCard>

            <FormCard>
              <label className="block text-sm text-muted mb-1">Saisonstart Datum</label>
              <input
                type="date"
                value={formData.seasonStartDate || ''}
                onChange={(e) => handleChange('seasonStartDate', e.target.value)}
                className="input-field w-full px-3 py-2 rounded-control focus:outline-none"
              />
            </FormCard>

            <FormCard>
              <label className="block text-sm text-muted mb-1">Saisonstart Uhrzeit</label>
              <input
                type="time"
                value={formData.seasonStartTime || ''}
                onChange={(e) => handleChange('seasonStartTime', e.target.value)}
                className="input-field w-full px-3 py-2 rounded-control focus:outline-none"
              />
            </FormCard>

            <FormCard>
              <label className="block text-sm text-muted mb-1">Start Spieltag Rückrunde</label>
              <input
                type="number"
                value={formData.startRoundRueckrunde || ''}
                onChange={(e) => handleChange('startRoundRueckrunde', parseInt(e.target.value) || 16)}
                className="input-field w-full px-3 py-2 rounded-control focus:outline-none"
              />
            </FormCard>

            <FormCard>
              <label className="block text-sm text-muted mb-1">Aktueller Spieltag</label>
              <input
                value={season.currentMatchday?.toString() ?? '-'}
                readOnly
                className="input-field w-full px-3 py-2 rounded-control focus:outline-none"
              />
            </FormCard>

            <FormCard className="md:col-span-2">
              <label className="block text-sm text-muted mb-3">Saisonphase</label>
              <div className="flex gap-4">
                {seasonStateOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-2 px-4 py-2 rounded-control cursor-pointer transition-all ${
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

      {activeTab === 'bankverbindung' && (
        <>
          <h2 className="text-lg font-bold text-foreground mb-4">PayPal</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <FormCard>
              <label className="block text-sm text-muted mb-1">PayPal-Link</label>
              <input
                value={formData.paypalLink || ''}
                onChange={(e) => handleChange('paypalLink', e.target.value)}
                placeholder="https://paypal.me/..."
                className="input-field w-full px-3 py-2 rounded-control focus:outline-none"
              />
            </FormCard>
          </div>

          <h2 className="text-lg font-bold text-foreground mb-4 mt-8">Bankverbindung</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <FormCard>
              <label className="block text-sm text-muted mb-1">Kontoinhaber</label>
              <input
                value={formData.kontoinhaber || ''}
                onChange={(e) => handleChange('kontoinhaber', e.target.value)}
                className="input-field w-full px-3 py-2 rounded-control focus:outline-none"
              />
            </FormCard>

            <FormCard>
              <label className="block text-sm text-muted mb-1">Bankname</label>
              <input
                value={formData.bankName || ''}
                onChange={(e) => handleChange('bankName', e.target.value)}
                className="input-field w-full px-3 py-2 rounded-control focus:outline-none"
              />
            </FormCard>

            <FormCard>
              <label className="block text-sm text-muted mb-1">IBAN</label>
              <input
                value={formData.iban || ''}
                onChange={(e) => handleChange('iban', e.target.value)}
                className="input-field w-full px-3 py-2 rounded-control focus:outline-none"
              />
            </FormCard>

            <FormCard>
              <label className="block text-sm text-muted mb-1">BIC</label>
              <input
                value={formData.bic || ''}
                onChange={(e) => handleChange('bic', e.target.value)}
                className="input-field w-full px-3 py-2 rounded-control focus:outline-none"
              />
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
                className={`input-field w-full px-3 py-2 rounded-control focus:outline-none ${validationErrors.spieleinsatzEuro ? 'border-danger' : ''}`}
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
                className={`input-field w-full px-3 py-2 rounded-control focus:outline-none ${validationErrors.serverkostenEuro ? 'border-danger' : ''}`}
              />
              {validationErrors.serverkostenEuro && <p className="text-danger text-sm mt-1">{validationErrors.serverkostenEuro}</p>}
            </FormCard>

            <FormCard className={validationErrors.anzahlSpielleiter ? 'border-danger' : ''}>
              <label className="block text-sm text-muted mb-1">Anzahl Spielleiter</label>
              <input
                type="number"
                value={formData.anzahlSpielleiter ?? ''}
                onChange={(e) => handleChange('anzahlSpielleiter', parseInt(e.target.value) || 0)}
                className={`input-field w-full px-3 py-2 rounded-control focus:outline-none ${validationErrors.anzahlSpielleiter ? 'border-danger' : ''}`}
              />
              {validationErrors.anzahlSpielleiter && <p className="text-danger text-sm mt-1">{validationErrors.anzahlSpielleiter}</p>}
            </FormCard>

            <FormCard className={validationErrors.gewinnErsterPlatzProzent ? 'border-danger' : ''}>
              <label className="block text-sm text-muted mb-1">Gewinn 1. Platz (%)</label>
              <input
                type="number"
                value={formData.gewinnErsterPlatzProzent ?? ''}
                onChange={(e) => handleChange('gewinnErsterPlatzProzent', parseInt(e.target.value) || 0)}
                className={`input-field w-full px-3 py-2 rounded-control focus:outline-none ${validationErrors.gewinnErsterPlatzProzent ? 'border-danger' : ''}`}
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
                className={`input-field w-full px-3 py-2 rounded-control focus:outline-none ${validationErrors.gewinnLetzterPlatzEuro ? 'border-danger' : ''}`}
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
              <div className="bg-surface border border-border rounded-card p-3 mb-4">
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
              <div className="rounded-card border border-border overflow-x-auto">
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
                        style={{ borderLeftWidth: '4px', borderLeftColor: payout.payoutStatus === 'PAID' ? 'var(--color-success)' : 'var(--color-border-neutral)' }}
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
                            className={`px-3 py-1.5 rounded-control text-sm font-medium cursor-pointer ${
                              payout.payoutStatus === 'PAID'
                                 ? 'bg-success text-success-foreground'
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
                            className={`text-lg p-1 rounded-control transition-colors ${
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

      {activeTab === 'einzahlungen' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">Einzahlungen</h2>
            <Button
              variant="emphasized"
              onClick={() => setShowDepositSyncConfirm(true)}
              disabled={syncDeposits.isPending}
            >
              {syncDeposits.isPending ? 'Wird synchronisiert...' : 'Einzahlungen synchronisieren'}
            </Button>
          </div>

          {depositSyncError && (
            <div className="bg-danger-bg border border-danger p-4 mb-4">
              <p className="text-danger text-sm">{depositSyncError}</p>
            </div>
          )}

          {depositSyncResult && (
            <div className="flex items-start gap-3 p-4 mb-4 bg-success-bg border border-success/30 rounded-card">
              <i className="sap-icon sap-icon-accept text-[18px] text-success shrink-0" />
              <div>
                <p className="text-success text-sm mb-1">
                  Synchronisation abgeschlossen:
                </p>
                <p className="text-success text-sm">
                  {depositSyncResult.created.length > 0
                    ? `${depositSyncResult.created.length} neue Einzahlung(en) angelegt. `
                    : 'Keine neuen Einzahlungen erforderlich. '}
                  {depositSyncResult.alreadyPresent > 0 && `(${depositSyncResult.alreadyPresent} bereits vorhanden) `}
                </p>
                {depositSyncResult.deleted.length > 0 && (
                  <p className="text-sm text-danger mt-2">
                    Hinweis: Für folgende nicht mehr existente Manager wurden Einzahlungsobjekte gelöscht: {depositSyncResult.deleted.join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}

          {isLoadingDeposits && (
            <div className="text-center py-8 text-muted">Lade Einzahlungen...</div>
          )}

          {deposits && deposits.length > 0 && (
            <>
              <div className="bg-surface border border-border rounded-card p-3 mb-4">
                <div className="flex items-center gap-6 text-sm flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-muted">Gesamt:</span>
                    <span className="text-foreground font-medium">{deposits.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted">Eingegangen:</span>
                    <span className="text-success font-medium">
                      {deposits.filter(d => d.depositStatus === 'RECEIVED').length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted">Offen:</span>
                    <span className="text-danger font-medium">
                      {deposits.filter(d => d.depositStatus !== 'RECEIVED').length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-default rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success"
                        style={{ width: `${deposits.length > 0 ? (deposits.filter(d => d.depositStatus === 'RECEIVED').length / deposits.length) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-foreground font-medium">
                      {deposits.length > 0 ? Math.round((deposits.filter(d => d.depositStatus === 'RECEIVED').length / deposits.length) * 100) : 0}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm flex-wrap mt-3 pt-3 border-t border-border">
                  {(() => {
                    const total = deposits.reduce((sum, d) => sum + d.amount, 0)
                    const paypalSum = deposits.filter(d => d.paymentMethod === 'PAYPAL' && d.depositStatus === 'RECEIVED').reduce((sum, d) => sum + d.amount, 0)
                    const ueberweisungSum = deposits.filter(d => d.paymentMethod === 'UEBERWEISUNG' && d.depositStatus === 'RECEIVED').reduce((sum, d) => sum + d.amount, 0)
                    const openSum = deposits.filter(d => d.depositStatus !== 'RECEIVED').reduce((sum, d) => sum + d.amount, 0)
                    const pct = (v: number) => total > 0 ? Math.round((v / total) * 100) : 0
                    const fmt = (v: number) => v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    return (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-muted">PayPal:</span>
                          <span className="text-foreground font-medium">{fmt(paypalSum)} €</span>
                          <span className="text-muted">({pct(paypalSum)}%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted">Überweisung:</span>
                          <span className="text-foreground font-medium">{fmt(ueberweisungSum)} €</span>
                          <span className="text-muted">({pct(ueberweisungSum)}%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted">Offen:</span>
                          <span className="text-danger font-medium">{fmt(openSum)} €</span>
                          <span className="text-muted">({pct(openSum)}%)</span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
              <div className="rounded-card border border-border overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <TableHead>
                    <tr>
                      <Th className="whitespace-nowrap">Login</Th>
                      <Th className="whitespace-nowrap">Vorname</Th>
                      <Th className="whitespace-nowrap">Nachname</Th>
                      <Th className="whitespace-nowrap">E-Mail</Th>
                      <Th align="center" className="whitespace-nowrap">Zahlungsart</Th>
                      <Th align="center" className="whitespace-nowrap">Status</Th>
                      <Th align="center" className="whitespace-nowrap">Kommentar</Th>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {deposits.map((deposit) => (
                      <tr
                        key={deposit.managerId}
                        className="border-b border-border last:border-b-0 hover:bg-card-hover"
                        style={{ borderLeftWidth: '4px', borderLeftColor: deposit.depositStatus === 'RECEIVED' ? 'var(--color-success)' : 'var(--color-border-neutral)' }}
                      >
                        <td className="px-3 py-2 text-foreground">{deposit.managerLogin || '-'}</td>
                        <td className="px-3 py-2 text-muted">{deposit.managerFirstName || '-'}</td>
                        <td className="px-3 py-2 text-muted">{deposit.managerLastName || '-'}</td>
                        <td className="px-3 py-2 text-muted">{deposit.managerEmail || '-'}</td>
                        <td className="px-3 py-2 text-center">
                          <select
                            value={deposit.paymentMethod || ''}
                            onChange={(e) => {
                              updateDeposit.mutate({
                                managerId: deposit.managerId,
                                data: { paymentMethod: e.target.value as PaymentMethod | '' }
                              })
                            }}
                            className={`px-3 py-1.5 rounded-control text-sm font-medium cursor-pointer ${
                              !deposit.paymentMethod && deposit.depositStatus === 'RECEIVED'
                                ? 'bg-danger text-danger-foreground'
                                : 'bg-default text-foreground'
                            }`}
                          >
                            <option value="">-</option>
                            <option value="UEBERWEISUNG">Überweisung</option>
                            <option value="PAYPAL">PayPal</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <select
                            value={deposit.depositStatus || 'OPEN'}
                            onChange={(e) => {
                              updateDeposit.mutate({
                                managerId: deposit.managerId,
                                data: { depositStatus: e.target.value as DepositStatus }
                              })
                            }}
                            className={`px-3 py-1.5 rounded-control text-sm font-medium cursor-pointer ${
                              deposit.depositStatus === 'RECEIVED'
                                ? 'bg-success text-success-foreground'
                                : deposit.paymentMethod
                                  ? 'bg-danger text-danger-foreground'
                                  : 'bg-default text-foreground'
                            }`}
                          >
                            <option value="OPEN">Offen</option>
                            <option value="RECEIVED">Eingegangen</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => {
                              setDepositCommentDialog(deposit)
                              setDepositCommentDraft(deposit.comment || '')
                            }}
                            className={`text-lg p-1 rounded-control transition-colors ${
                              deposit.comment
                                ? 'bg-success hover:bg-success'
                                : 'bg-default hover:bg-elevated'
                            }`}
                            title={deposit.comment || 'Kommentar hinzufügen'}
                          >
                            📝
                          </button>
                        </td>
                      </tr>
                    ))}
                  </TableBody>
                </table>
              </div>
            </>
          )}

          {deposits && deposits.length === 0 && !isLoadingDeposits && (
            <div className="text-center py-8 text-muted">
              Noch keine Einzahlungen erfasst. Klicken Sie auf „Einzahlungen synchronisieren“, um für alle Manager Einzahlungsobjekte anzulegen.
            </div>
          )}
        </>
      )}

      {activeTab === 'neue-saison' && (
        <>
          {isAdmin && (
            <div className="bg-surface border border-border rounded-card p-6 mb-6">
              <h2 className="text-lg font-bold text-foreground mb-2">PDF erstellen</h2>
              <p className="text-muted text-sm mb-4">
                Erstellt ein PDF mit allen Spielern der aktuellen Saison (Position, Spieler, Verein,
                Position, Marktwert, Punkte, Anzahl Manager) und fügt es der Dokumentenliste hinzu.
              </p>
              <Button
                variant="emphasized"
                disabled={!season || generatePlayersPdf.isPending}
                onClick={async () => {
                  setPdfFeedback(null)
                  try {
                    await generatePlayersPdf.mutateAsync(season!.id)
                    setPdfFeedback({ type: 'success', text: 'PDF wurde erstellt und der Dokumentenliste hinzugefügt.' })
                  } catch (err: any) {
                    const message = err?.response?.data?.message || err?.message || 'PDF-Erstellung fehlgeschlagen'
                    setPdfFeedback({ type: 'error', text: message })
                  }
                }}
              >
                {generatePlayersPdf.isPending ? 'PDF wird erstellt...' : 'PDF erstellen – Spielerliste'}
              </Button>
              {pdfFeedback && (
                <div className={`mt-4 p-4 border rounded-card ${pdfFeedback.type === 'success' ? 'bg-success-bg border-success/30' : 'bg-danger-bg border-danger'}`}>
                  <p className={`text-sm ${pdfFeedback.type === 'success' ? 'text-success' : 'text-danger'}`}>{pdfFeedback.text}</p>
                </div>
              )}
            </div>
          )}

          <div className="bg-surface border border-border rounded-card p-6 mb-6">
            <h2 className="text-lg font-bold text-foreground mb-2">Quell-URL</h2>
            <p className="text-muted text-sm mb-4">
              Diese URL wird für das manuelle und das automatische Spieler-Update verwendet
              (kicker-libero State-URL).
            </p>
            <FormCard className="mb-4">
              <label className="block text-sm text-muted mb-1">Quell-URL</label>
              <input
                value={sourceUrlDraft}
                onChange={(e) => setSourceUrlDraft(e.target.value)}
                className="input-field w-full px-3 py-2 rounded-control focus:outline-none"
                placeholder="https://classic.kicker-libero.de/api/gameloop/v1/state/current/se-k00012026.json"
              />
            </FormCard>
            <Button
              variant="emphasized"
              disabled={sourceUrlSaving || !sourceUrlDraft}
              onClick={async () => {
                setSourceUrlSaving(true)
                setAutoUpdateConfigError(null)
                try {
                  await updateSystemConfig.mutateAsync({ autoUpdateSourceUrl: sourceUrlDraft })
                } catch (err: any) {
                  const message = err?.response?.data?.message || err?.message || 'Speichern fehlgeschlagen'
                  setAutoUpdateConfigError(message)
                } finally {
                  setSourceUrlSaving(false)
                }
              }}
            >
              {sourceUrlSaving ? 'Speichert...' : 'Quell-URL speichern'}
            </Button>
          </div>

          <div className="bg-surface border border-border rounded-card p-6 mb-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Neue Saison erstellen</h2>
            <p className="text-muted text-sm mb-4">
              Die Daten werden von der kicker-libero-Schnittstelle geladen (Vereine inkl. Wappen, Spieler inkl. Bilder
              und Spielplan). Alle Einstellungen (Budget, Bankverbindung, Mail-Vorlagen, Gewinn-Anteile) werden aus der
              aktuellen Saison übernommen. Die alte Saison inkl. Manager, Benutzer (außer Admin), Spieler, Vereine und
              Spiele wird vollständig gelöscht.
            </p>
            <div className="grid gap-6">
              <FormCard>
                <label className="block text-sm text-muted mb-1">Saison-Name</label>
                <input
                  value={setupSeasonName}
                  onChange={(e) => setSetupSeasonName(e.target.value)}
                  className="input-field w-full px-3 py-2 rounded-control focus:outline-none"
                  placeholder="z.B. 2026/27"
                />
              </FormCard>
            </div>
            <div className="mt-6 flex gap-4">
              <Button
                variant="ghost"
                onClick={async () => {
                  setSetupPreview(null)
                  setErrorMessage(null)
                  try {
                    const data = await previewSeasonSetup.mutateAsync({ sourceUrl: effectiveSourceUrl, seasonName: setupSeasonName })
                    setSetupPreview(data)
                  } catch (err: any) {
                    const message = err?.response?.data?.message || err?.message || 'Vorschau fehlgeschlagen'
                    setErrorMessage(message)
                  }
                }}
                disabled={previewSeasonSetup.isPending || !effectiveSourceUrl || !setupSeasonName}
              >
                {previewSeasonSetup.isPending ? 'Lade Vorschau...' : 'Vorschau laden'}
              </Button>
              <Button
                variant="emphasized"
                onClick={() => setShowSetupConfirm(true)}
                disabled={!setupPreview || !setupSeasonName}
              >
                Neue Saison starten
              </Button>
            </div>
            {errorMessage && (
              <div className="bg-danger-bg border border-danger p-4 mt-4">
                <p className="text-danger text-sm">{errorMessage}</p>
              </div>
            )}
          </div>

          {setupPreview && (
            <div className="bg-surface border border-border rounded-card p-6">
              <h3 className="text-xl font-bold text-foreground mb-4">Vorschau</h3>
              <div className="flex items-center gap-6 mb-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted">Vereine:</span>
                  <span className="text-foreground font-medium">{setupPreview.teamCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted">Spieler gesamt:</span>
                  <span className="text-foreground font-medium">{setupPreview.playersTotal}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted">Spiele:</span>
                  <span className="text-foreground font-medium">{setupPreview.gamesTotal}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted">Torwart:</span>
                  <span className="text-foreground font-medium">{setupPreview.playersPerPosition?.GOALKEEPER ?? 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted">Abwehr:</span>
                  <span className="text-foreground font-medium">{setupPreview.playersPerPosition?.DEFENDER ?? 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted">Mittelfeld:</span>
                  <span className="text-foreground font-medium">{setupPreview.playersPerPosition?.MIDFIELD ?? 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted">Sturm:</span>
                  <span className="text-foreground font-medium">{setupPreview.playersPerPosition?.STRIKER ?? 0}</span>
                </div>
              </div>
              <div className="rounded-card border border-border overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <TableHead>
                    <tr>
                      <Th className="whitespace-nowrap">Verein</Th>
                      <Th align="right" className="whitespace-nowrap">Spieler</Th>
                      <Th align="center" className="whitespace-nowrap">TW</Th>
                      <Th align="center" className="whitespace-nowrap">ABW</Th>
                      <Th align="center" className="whitespace-nowrap">MF</Th>
                      <Th align="center" className="whitespace-nowrap">ST</Th>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {setupPreview.teamBreakdown.map((t) => (
                      <tr key={t.name} className="border-b border-border last:border-b-0 hover:bg-card-hover">
                        <td className="px-3 py-2 text-foreground">{t.name}</td>
                        <td className="px-3 py-2 text-right text-foreground">{t.players}</td>
                        <td className="px-3 py-2 text-center text-muted">{t.hasGoalkeeper ? '✓' : '-'}</td>
                        <td className="px-3 py-2 text-center text-muted">{t.hasDefender ? '✓' : '-'}</td>
                        <td className="px-3 py-2 text-center text-muted">{t.hasMidfield ? '✓' : '-'}</td>
                        <td className="px-3 py-2 text-center text-muted">{t.hasStriker ? '✓' : '-'}</td>
                      </tr>
                    ))}
                  </TableBody>
                </table>
              </div>
            </div>
          )}

          {season && (
            <div className="bg-surface border border-border rounded-card p-6 mt-6">
              <h2 className="text-lg font-bold text-foreground mb-4">Spieler aktualisieren (manuell)</h2>
              <p className="text-muted text-sm mb-4">
                Lädt die kicker-Datenbank von der Quell-URL und übernimmt neue Spieler in die aktuelle Saison
                (nicht-destruktiv, es wird nichts gelöscht).
                {season.seasonState === 'BEFORE_SEASON'
                  ? ' Da sich die Saison im Status "Vor Saison" befindet, werden auch Vereinswechsel bestehender Spieler übernommen.'
                  : ' Vereinswechsel bestehender Spieler werden nur im Status "Vor Saison" übernommen und daher aktuell übersprungen.'}
              </p>
              <div className="flex gap-4">
                <Button
                  variant="emphasized"
                  onClick={() => setShowUpdateConfirm(true)}
                  disabled={!effectiveSourceUrl}
                >
                  Spieler aktualisieren
                </Button>
              </div>
            </div>
          )}

          {season && (
            <div className="bg-surface border border-border rounded-card p-6 mt-6">
              <h2 className="text-lg font-bold text-foreground mb-2">Spieler aktualisieren (automatisch)</h2>
              <p className="text-muted text-sm mb-4">
                Stößt das Spieler-Update automatisch zum hinterlegten Zeitpunkt (Cron) an und sendet das Ergebnis-Log
                als E-Mail an alle Admins. Im Betreff ist ersichtlich, ob und was geändert wurde.
              </p>
              <div className="grid gap-6 md:grid-cols-2 mb-4">
                <FormCard>
                  <label className="block text-sm text-muted mb-1">Automatisches Update aktivieren</label>
                  <label className="flex items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      checked={autoUpdateEnabled}
                      onChange={(e) => setAutoUpdateEnabled(e.target.checked)}
                      className="h-5 w-5 rounded-control border-border-strong"
                    />
                    <span className="text-sm text-foreground">
                      {autoUpdateEnabled ? 'Aktiviert' : 'Deaktiviert'}
                    </span>
                  </label>
                </FormCard>
                <FormCard>
                  <label className="block text-sm text-muted mb-1">Cron-Ausdruck (Spring, 6 Felder)</label>
                  <input
                    value={autoUpdateCron}
                    onChange={(e) => setAutoUpdateCron(e.target.value)}
                    className="input-field w-full px-3 py-2 rounded-control focus:outline-none"
                    placeholder="0 0 8 * * *"
                  />
                  <p className="text-xs text-subtle mt-1">
                    Format: Sekunden Minuten Stunden Tag Monat Wochentag — z.B. <code>0 0 8 * * *</code> = täglich 08:00 Uhr
                  </p>
                </FormCard>
              </div>
              {systemConfig?.autoUpdateLastRun && (
                <p className="text-sm text-muted mb-4">
                  Letzte Ausführung: {new Date(systemConfig.autoUpdateLastRun).toLocaleString('de-DE')}
                </p>
              )}
              {autoUpdateConfigError && (
                <div className="bg-danger-bg border border-danger p-4 mb-4">
                  <p className="text-danger text-sm">{autoUpdateConfigError}</p>
                </div>
              )}
              <Button
                variant="emphasized"
                disabled={autoUpdateSaving}
                onClick={async () => {
                  setAutoUpdateSaving(true)
                  setAutoUpdateConfigError(null)
                  try {
                    await updateSystemConfig.mutateAsync({
                      autoUpdateEnabled: autoUpdateEnabled,
                      autoUpdateCron: autoUpdateCron,
                    })
                  } catch (err: any) {
                    const message = err?.response?.data?.message || err?.message || 'Speichern fehlgeschlagen'
                    setAutoUpdateConfigError(message)
                  } finally {
                    setAutoUpdateSaving(false)
                  }
                }}
              >
                {autoUpdateSaving ? 'Speichert...' : 'Automatisches Update speichern'}
              </Button>
            </div>
          )}
        </>
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
              className="w-full bg-elevated border border-border-hover rounded-control text-foreground p-3 text-sm resize-y"
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

      {depositCommentDialog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <FormCard className="w-full max-w-5xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-foreground">Kommentar</h3>
                <p className="text-sm text-muted">{depositCommentDialog.managerLogin || depositCommentDialog.managerName}</p>
              </div>
              <Button
                variant="ghost"
                size="compact"
                onClick={() => setDepositCommentDialog(null)}
              >
                ✕
              </Button>
            </div>
            <textarea
              value={depositCommentDraft}
              onChange={(e) => setDepositCommentDraft(e.target.value)}
              rows={24}
              placeholder="Kommentar eingeben..."
              className="w-full bg-elevated border border-border-hover rounded-control text-foreground p-3 text-sm resize-y"
            />
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="ghost"
                onClick={() => setDepositCommentDialog(null)}
              >
                Abbrechen
              </Button>
              <Button
                variant="emphasized"
                onClick={() => {
                  updateDeposit.mutate({
                    managerId: depositCommentDialog.managerId,
                    data: { comment: depositCommentDraft }
                  })
                  setDepositCommentDialog(null)
                }}
              >
                Speichern
              </Button>
            </div>
          </FormCard>
        </div>
      )}

      {showDepositSyncConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <FormCard className="max-w-md">
            <h3 className="text-xl font-bold text-foreground mb-4">Einzahlungen synchronisieren</h3>
            <p className="text-muted mb-6">
              Für alle Manager ohne Einzahlungsobjekt wird ein neues angelegt. Verwaiste Einzahlungsobjekte (Manager nicht mehr in der Saison) werden gelöscht. Möchten Sie fortfahren?
            </p>
            <div className="flex gap-4 justify-end">
              <Button
                variant="ghost"
                onClick={() => setShowDepositSyncConfirm(false)}
              >
                Abbrechen
              </Button>
              <Button
                variant="emphasized"
                onClick={async () => {
                  setShowDepositSyncConfirm(false)
                  setDepositSyncError(null)
                  try {
                    const result = await syncDeposits.mutateAsync()
                    setDepositSyncResult(result)
                    trackEvent('einzahlungen', 'synchronisieren', 'success')
                  } catch (error: any) {
                    trackEvent('einzahlungen', 'synchronisieren', 'failure')
                    const message = error?.response?.data?.message || error?.message || 'Ein unbekannter Fehler ist aufgetreten.'
                    setDepositSyncError(message)
                  }
                }}
              >
                Synchronisieren
              </Button>
            </div>
          </FormCard>
        </div>
      )}

      {showSetupConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <FormCard className="max-w-lg">
            <h3 className="text-xl font-bold text-foreground mb-4">Neue Saison erstellen</h3>
            <p className="text-muted mb-2">
              Es wird eine neue Saison <span className="font-semibold text-foreground">{setupSeasonName}</span> erstellt.
            </p>
            <p className="text-danger mb-6">
              Die komplette aktuelle Saison wird gelöscht — inkl. aller Manager, Benutzer (außer Admin), Spieler, Vereine
              und Spieltage. Diese Aktion kann nicht rückgängig gemacht werden. Bitte erstelle im Vorfeld ein Backup.
            </p>
            <div className="flex gap-4 justify-end">
              <Button variant="ghost" onClick={() => setShowSetupConfirm(false)}>Abbrechen</Button>
              <Button
                variant="emphasized"
                onClick={() => {
                  setShowSetupConfirm(false)
                  setShowSetupDialog(true)
                  trackEvent('season', 'setup', 'start')
                }}
              >
                Fortfahren
              </Button>
            </div>
          </FormCard>
        </div>
      )}

      {showSetupDialog && (
        <SetupProgressDialog
          isOpen={showSetupDialog}
          sourceUrl={effectiveSourceUrl}
          seasonName={setupSeasonName}
          onClose={() => {
            setShowSetupDialog(false)
            setSetupPreview(null)
          }}
        />
      )}

      {showUpdateConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <FormCard className="max-w-lg">
            <h3 className="text-xl font-bold text-foreground mb-4">Spieler aktualisieren (manuell)</h3>
            <p className="text-muted mb-6">
              Die kicker-Datenbank wird geladen und neue Spieler werden in die aktuelle Saison übernommen.
              {season?.seasonState === 'BEFORE_SEASON'
                ? ' Vereinswechsel bestehender Spieler werden ebenfalls aktualisiert.'
                : ' Vereinswechsel werden im aktuellen Saison-Status nicht übernommen.'}
              Es wird nichts gelöscht. Möchten Sie fortfahren?
            </p>
            <div className="flex gap-4 justify-end">
              <Button variant="ghost" onClick={() => setShowUpdateConfirm(false)}>Abbrechen</Button>
              <Button
                variant="emphasized"
                onClick={() => {
                  setShowUpdateConfirm(false)
                  setShowUpdateDialog(true)
                  trackEvent('season', 'update-players', 'start')
                }}
              >
                Fortfahren
              </Button>
            </div>
          </FormCard>
        </div>
      )}

      {showUpdateDialog && (
        <SetupProgressDialog
          isOpen={showUpdateDialog}
          sourceUrl={effectiveSourceUrl}
          seasonName=""
          streamUrl={`/api/seasons/setup/update-players/stream-sse?sourceUrl=${encodeURIComponent(effectiveSourceUrl)}`}
          runningTitle="Spieler werden aktualisiert..."
          successTitle="Spieler-Update abgeschlossen"
          onClose={() => setShowUpdateDialog(false)}
        />
      )}
    </div>
  )
}
