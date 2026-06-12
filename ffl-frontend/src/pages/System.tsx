import { useState, useEffect } from 'react'
import { Settings } from 'lucide-react'
import { useSystemConfig, useUpdateSystemConfig, useSendTestMail } from '../hooks/useSystemConfig'
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
        openrouterApiKey: config.openrouterApiKey || '',
        openrouterModel: config.openrouterModel || 'openai/gpt-4o-mini',
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
        openrouterApiKey: result.openrouterApiKey || '',
        openrouterModel: result.openrouterModel || 'openai/gpt-4o-mini',
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
      <div className="flex items-center gap-3 mb-6">
        <Settings size={28} className="text-accent" />
        <h1 className="text-2xl font-bold text-accent">System</h1>
      </div>

      <div className="flex gap-1 mb-6">
        <button
          onClick={() => setActiveTab('general')}
          className={activeTab === 'general' ? 'bg-accent text-background font-medium px-3 py-1.5 rounded' : 'bg-elevated text-muted hover:bg-default px-3 py-1.5 rounded'}
        >
          Allgemein
        </button>
        <button
          onClick={() => setActiveTab('mail')}
          className={activeTab === 'mail' ? 'bg-accent text-background font-medium px-3 py-1.5 rounded' : 'bg-elevated text-muted hover:bg-default px-3 py-1.5 rounded'}
        >
          Mailkonfiguration
        </button>
      </div>

      {activeTab === 'general' && (
        <div>
          <h2 className="text-xl font-semibold text-accent mb-4">Allgemeine Einstellungen</h2>
          <div className="p-6 bg-surface border border-border">
            <div>
              <label className="block text-sm text-muted mb-1">Web-URL der FFL-Seite</label>
              <input
                type="url"
                value={formData.webUrl || ''}
                onChange={(e) => handleChange('webUrl', e.target.value)}
                placeholder="https://ffl.example.com"
                className="input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated border-border-hover text-foreground"
              />
            </div>
            <p className="text-xs text-subtle mt-2">
              Öffentliche Basis-URL der FFL-Seite (z.B. für Links in Mails). Ohne abschließenden Slash.
            </p>
          </div>

          <h2 className="text-xl font-semibold text-accent mt-6 mb-4">LLM (OpenRouter)</h2>
          <div className="p-6 bg-surface border border-border">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <div>
                <label className="block text-sm text-muted mb-1">OpenRouter API-Key</label>
                <input
                  type="text"
                  value={formData.openrouterApiKey || ''}
                  onChange={(e) => handleChange('openrouterApiKey', e.target.value)}
                  className="input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated border-border-hover text-foreground font-mono"
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Modell</label>
                <input
                  value={formData.openrouterModel || ''}
                  onChange={(e) => handleChange('openrouterModel', e.target.value)}
                  placeholder="openai/gpt-4o-mini"
                  className="input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated border-border-hover text-foreground"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={!hasChanges || updateConfig.isPending}
              className="bg-primary text-background font-semibold px-6 py-2 rounded hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {updateConfig.isPending ? 'Speichern...' : 'Speichern'}
            </button>
            {saveMessage && (
              <span className={saveMessage.includes('Fehler') ? 'text-danger' : 'text-success'}>
                {saveMessage}
              </span>
            )}
          </div>
        </div>
      )}

      {activeTab === 'mail' && (
        <div>
          <h2 className="text-xl font-semibold text-accent mb-4">Gmail Sende-Account</h2>

          <div className="grid gap-4">
            <div className="p-6 bg-surface border border-border">
              <div className="grid gap-4 grid-cols-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Absender E-Mail</label>
                  <input
                    type="email"
                    value={formData.gmailSenderEmail || ''}
                    onChange={(e) => handleChange('gmailSenderEmail', e.target.value)}
                    placeholder="example@gmail.com"
                    className="input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated border-border-hover text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">App-Passwort</label>
                  <input
                    value={formData.gmailAppPassword || ''}
                    onChange={(e) => handleChange('gmailAppPassword', e.target.value)}
                    placeholder="16-stellig"
                    className="input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated border-border-hover text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">SMTP Server</label>
                  <input
                    value={formData.gmailSmtpServer || ''}
                    onChange={(e) => handleChange('gmailSmtpServer', e.target.value)}
                    className="input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated border-border-hover text-foreground"
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
                    className="input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated border-border-hover text-foreground"
                  />
                </div>
              </div>
              <p className="text-xs text-subtle mt-2">
                Erstelle ein App-Passwort unter myaccount.google.com → Sicherheit → App-Passwörter
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={!hasChanges || updateConfig.isPending}
              className="bg-primary text-background font-semibold px-6 py-2 rounded hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {updateConfig.isPending ? 'Speichern...' : 'Speichern'}
            </button>
            {saveMessage && (
              <span
                className={
                  saveMessage.includes('Fehler') ? 'text-danger' : 'text-success'
                }
              >
                {saveMessage}
              </span>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-lg font-semibold text-accent mb-4">Test-Mail senden</h3>
            <div className="p-6 bg-surface border border-border">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm text-muted mb-1">Empfänger</label>
                  <input
                    type="email"
                    value={testMailTo}
                    onChange={(e) => setTestMailTo(e.target.value)}
                    placeholder="empfaenger@example.com"
                    className="input-field w-full px-3 py-2 rounded focus:outline-none bg-elevated border-border-hover text-foreground"
                  />
                </div>
                <button
                  onClick={handleSendTestMail}
                  disabled={!testMailTo || sendTestMail.isPending}
                  className="bg-primary text-background font-semibold px-6 py-2 rounded hover:bg-accent-hover disabled:opacity-50 transition-colors"
                >
                  {sendTestMail.isPending ? 'Sende...' : 'Test-Mail senden'}
                </button>
              </div>
            </div>

            {testMailResult && (
              <div className="mt-4 p-6 bg-surface border border-border">
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
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
