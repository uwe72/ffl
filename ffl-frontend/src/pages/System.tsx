import { useState, useEffect } from 'react'
import { useSystemConfig, useUpdateSystemConfig, useSendTestMail } from '../hooks/useSystemConfig'
import PageHeader from '../components/PageHeader'
import Tabs from '../components/Tabs'
import FormCard from '../components/FormCard'
import Button from '../components/Button'
import type { SystemConfig, TestMailResult } from '../types'

export default function System() {
  const { data: config, isLoading, error } = useSystemConfig()
  const updateConfig = useUpdateSystemConfig()
  const sendTestMail = useSendTestMail()

  const [formData, setFormData] = useState<Partial<SystemConfig>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [testMailTo, setTestMailTo] = useState('')
  const [testMailResult, setTestMailResult] = useState<TestMailResult | null>(null)
  const [activeTab, setActiveTab] = useState<'general' | 'mail'>('general')

  useEffect(() => {
    if (config) {
      setFormData({
        gmailSenderEmail: config.gmailSenderEmail || '',
        gmailAppPassword: config.gmailAppPassword || '',
        gmailSmtpServer: config.gmailSmtpServer || 'smtp.gmail.com',
        gmailSmtpPort: config.gmailSmtpPort || 587,
        webUrl: config.webUrl || '',
        llmBaseUrl: config.llmBaseUrl || '',
        llmApiKey: config.llmApiKey || '',
        llmModel: config.llmModel || 'openai/gpt-4o-mini',
      })
      setTestMailTo(config.gmailSenderEmail || '')
      setHasChanges(false)
    }
  }, [config])

  const handleChange = (field: keyof SystemConfig, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setHasChanges(true)
    setSaveMessage('')
  }

  const handleSave = async () => {
    if (!hasChanges) return
    try {
      const result = await updateConfig.mutateAsync(formData)
      setFormData({
        gmailSenderEmail: result.gmailSenderEmail || '',
        gmailAppPassword: result.gmailAppPassword || '',
        gmailSmtpServer: result.gmailSmtpServer || 'smtp.gmail.com',
        gmailSmtpPort: result.gmailSmtpPort || 587,
        webUrl: result.webUrl || '',
        llmBaseUrl: result.llmBaseUrl || '',
        llmApiKey: result.llmApiKey || '',
        llmModel: result.llmModel || 'openai/gpt-4o-mini',
      })
      setHasChanges(false)
      setSaveMessage('Konfiguration gespeichert')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch {
      setSaveMessage('Fehler beim Speichern')
    }
  }

  const handleSendTestMail = async () => {
    if (!testMailTo) return
    setTestMailResult(null)
    try {
      const result = await sendTestMail.mutateAsync(testMailTo)
      setTestMailResult(result)
    } catch {
      setTestMailResult({
        success: false,
        message: 'Fehler beim Senden der Test-Mail',
        usedEmail: '',
        usedPassword: '',
        usedSmtpServer: '',
        usedSmtpPort: 0,
      })
    }
  }

  if (isLoading) return <div className="text-center py-8 text-muted">Laden...</div>
  if (error) return <div className="text-center py-8 text-danger">Fehler beim Laden</div>

  return (
    <div>
      <PageHeader icon="sap-icon-settings" title="System" />

      <Tabs
        items={[
          { key: 'general', label: 'Allgemein' },
          { key: 'mail', label: 'Mailkonfiguration' },
        ]}
        active={activeTab}
        onChange={(key) => setActiveTab(key as 'general' | 'mail')}
      />

      {activeTab === 'general' && (
        <>
          <div className="grid gap-6">
            <FormCard>
              <label className="block text-sm text-muted mb-1">Web-URL der FFL-Seite</label>
              <input
                type="url"
                value={formData.webUrl || ''}
                onChange={(e) => handleChange('webUrl', e.target.value)}
                placeholder="https://ffl.example.com"
                className="input-field w-full px-3 py-2 rounded focus:outline-none"
              />
              <p className="text-xs text-subtle mt-2">
                Öffentliche Basis-URL der FFL-Seite (z.B. für Links in Mails). Ohne abschließenden Slash.
              </p>
            </FormCard>

            <FormCard>
              <label className="block text-sm text-muted mb-3">LLM-Konfiguration</label>
              <div className="grid gap-4 grid-cols-1">
                <div>
                  <label className="block text-sm text-muted mb-1">Base-URL</label>
                  <input
                    type="url"
                    value={formData.llmBaseUrl || ''}
                    onChange={(e) => handleChange('llmBaseUrl', e.target.value)}
                    placeholder="http://localhost:4000/chat/completions"
                    className="input-field w-full px-3 py-2 rounded focus:outline-none font-mono"
                  />
                </div>
              </div>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 mt-4">
                <div>
                  <label className="block text-sm text-muted mb-1">API-Key</label>
                  <input
                    type="text"
                    value={formData.llmApiKey || ''}
                    onChange={(e) => handleChange('llmApiKey', e.target.value)}
                    className="input-field w-full px-3 py-2 rounded focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Modell</label>
                  <input
                    value={formData.llmModel || ''}
                    onChange={(e) => handleChange('llmModel', e.target.value)}
                    placeholder="openai/gpt-4o-mini"
                    className="input-field w-full px-3 py-2 rounded focus:outline-none"
                  />
                </div>
              </div>
              <p className="text-xs text-subtle mt-2">
                OpenAI-kompatible Chat-Completions-URL (z.B. LiteLLM-Proxy oder OpenRouter).
              </p>
            </FormCard>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <Button
              variant="emphasized"
              onClick={handleSave}
              disabled={!hasChanges || updateConfig.isPending}
            >
              {updateConfig.isPending ? 'Speichern...' : 'Speichern'}
            </Button>
            {saveMessage && (
              <span className={saveMessage.includes('Fehler') ? 'text-danger' : 'text-success'}>
                {saveMessage}
              </span>
            )}
          </div>
        </>
      )}

      {activeTab === 'mail' && (
        <>
          <div className="grid gap-6">
            <FormCard>
              <label className="block text-sm text-muted mb-3">Gmail Sende-Account</label>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Absender E-Mail</label>
                  <input
                    type="email"
                    value={formData.gmailSenderEmail || ''}
                    onChange={(e) => handleChange('gmailSenderEmail', e.target.value)}
                    placeholder="example@gmail.com"
                    className="input-field w-full px-3 py-2 rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">App-Passwort</label>
                  <input
                    value={formData.gmailAppPassword || ''}
                    onChange={(e) => handleChange('gmailAppPassword', e.target.value)}
                    placeholder="16-stellig"
                    className="input-field w-full px-3 py-2 rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">SMTP Server</label>
                  <input
                    value={formData.gmailSmtpServer || ''}
                    onChange={(e) => handleChange('gmailSmtpServer', e.target.value)}
                    className="input-field w-full px-3 py-2 rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">SMTP Port</label>
                  <input
                    type="number"
                    value={formData.gmailSmtpPort?.toString() || '587'}
                    onChange={(e) =>
                      handleChange('gmailSmtpPort', parseInt(e.target.value) || 587)
                    }
                    className="input-field w-full px-3 py-2 rounded focus:outline-none"
                  />
                </div>
              </div>
              <p className="text-xs text-subtle mt-2">
                Erstelle ein App-Passwort unter myaccount.google.com → Sicherheit → App-Passwörter
              </p>
            </FormCard>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <Button
              variant="emphasized"
              onClick={handleSave}
              disabled={!hasChanges || updateConfig.isPending}
            >
              {updateConfig.isPending ? 'Speichern...' : 'Speichern'}
            </Button>
            {saveMessage && (
              <span className={saveMessage.includes('Fehler') ? 'text-danger' : 'text-success'}>
                {saveMessage}
              </span>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <FormCard>
              <label className="block text-sm text-muted mb-3">Test-Mail senden</label>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm text-muted mb-1">Empfänger</label>
                  <input
                    type="email"
                    value={testMailTo}
                    onChange={(e) => setTestMailTo(e.target.value)}
                    placeholder="empfaenger@example.com"
                    className="input-field w-full px-3 py-2 rounded focus:outline-none"
                  />
                </div>
                <Button
                  variant="emphasized"
                  onClick={handleSendTestMail}
                  disabled={!testMailTo || sendTestMail.isPending}
                >
                  {sendTestMail.isPending ? 'Sende...' : 'Test-Mail senden'}
                </Button>
              </div>
            </FormCard>

            {testMailResult && (
              <FormCard className="mt-4">
                <div className="mb-4">
                  <span className={testMailResult.success ? 'text-success' : 'text-danger'}>
                    {testMailResult.success ? '✓ ' : '✗ '}{testMailResult.message}
                  </span>
                </div>
                <div className="text-sm text-muted space-y-1">
                  <p><span className="text-subtle">Verwendete Email:</span> {testMailResult.usedEmail || '-'}</p>
                  <p><span className="text-subtle">Verwendetes Passwort:</span> {testMailResult.usedPassword || '-'}</p>
                  <p><span className="text-subtle">SMTP Server:</span> {testMailResult.usedSmtpServer || '-'}</p>
                  <p><span className="text-subtle">SMTP Port:</span> {testMailResult.usedSmtpPort || '-'}</p>
                </div>
              </FormCard>
            )}
          </div>
        </>
      )}
    </div>
  )
}
