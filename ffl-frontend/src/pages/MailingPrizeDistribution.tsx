import { useState, useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import ReactQuill, { Quill } from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import { useCurrentSeason, useUpdateSeason, usePrizeDistributionMailPreview } from '../hooks/useSeasons'
import PrizeDistributionMailSendDialog from '../components/PrizeDistributionMailSendDialog'
import Button from '../components/Button'
import PageHeader from '../components/PageHeader'
import FormCard from '../components/FormCard'
import type { Season } from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Size = Quill.import('formats/size') as any
Size.whitelist = ['8px', '9px', '10px', '11px', '12px', '13px', '14px', '15px', '16px', '17px', '18px', '20px', '22px', '24px', '28px', '32px']
Quill.register(Size, true)

export default function MailingPrizeDistribution() {
  const { data: season, isLoading } = useCurrentSeason()
  const updateSeason = useUpdateSeason()
  const { refetch: fetchPreview, isFetching: isFetchingPreview } = usePrizeDistributionMailPreview(season?.id ?? 0)

  const [formData, setFormData] = useState<Partial<Season>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [showSendDialog, setShowSendDialog] = useState(false)

  useEffect(() => {
    if (season) {
      setFormData({
        mailText: season.mailText ?? ''
      })
      setHasChanges(false)
    }
  }, [season])

  const handleChange = (field: keyof Season, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!season || !hasChanges) return
    await updateSeason.mutateAsync({ id: season.id, data: formData })
    setHasChanges(false)
  }

  const resetFormData = () => {
    if (!season) return
    setFormData({
      mailText: season.mailText ?? ''
    })
    setHasChanges(false)
  }

  if (isLoading) {
    return <div className="text-muted">Laden...</div>
  }

  if (!season) {
    return <div className="text-muted">Keine Saison gefunden.</div>
  }

  return (
    <div>
      <RouterLink to="/mailing" className="inline-flex items-center gap-1 text-sm text-[#c9a66b] hover:text-[#d4b77a] hover:underline mb-4">
        <i className="sap-icon sap-icon-nav-back text-base" />
        Zurück zur Übersicht
      </RouterLink>

      <PageHeader icon="sap-icon-email-read" title="Saisonabschlussmail" />

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
              await updateSeason.mutateAsync({ id: season.id, data: formData })
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
          onClick={() => setShowSendDialog(true)}
        >
          An alle Manager senden
        </Button>
      </div>

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

      <PrizeDistributionMailSendDialog
        isOpen={showSendDialog}
        onClose={() => setShowSendDialog(false)}
        seasonId={season.id}
        seasonName={season.name}
      />
    </div>
  )
}
