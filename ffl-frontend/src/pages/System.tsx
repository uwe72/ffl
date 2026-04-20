import { useState, useEffect } from 'react'
import {
  Card,
  TextField,
  Label,
  Input,
  Button,
  TabsRoot,
  TabList,
  Tab,
  TabPanel,
} from '@heroui/react'
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

  useEffect(() => {
    if (config) {
      setFormData({
        gmailSenderEmail: config.gmailSenderEmail || '',
        gmailAppPassword: config.gmailAppPassword || '',
        gmailSmtpServer: config.gmailSmtpServer || 'smtp.gmail.com',
        gmailSmtpPort: config.gmailSmtpPort || 587,
        webUrl: config.webUrl || '',
        openrouterApiKey: '',
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
        openrouterApiKey: '',
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

  if (isLoading) return <div className="text-center py-8 text-[#a0aec0]">Laden...</div>
  if (error) return <div className="text-center py-8 text-[#e05252]">Fehler beim Laden</div>

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#f5f5f5] mb-6">System</h1>

      <TabsRoot>
        <TabList className="flex gap-2 border-b border-[#2d3748] mb-6">
          <Tab
            id="general"
            className="px-4 py-2 text-[#a0aec0] cursor-pointer data-[selected]:text-[#c9a66b] data-[selected]:border-b-2 data-[selected]:border-[#c9a66b] outline-none"
          >
            Allgemein
          </Tab>
          <Tab
            id="mail"
            className="px-4 py-2 text-[#a0aec0] cursor-pointer data-[selected]:text-[#c9a66b] data-[selected]:border-b-2 data-[selected]:border-[#c9a66b] outline-none"
          >
            Mailkonfiguration
          </Tab>
        </TabList>

        <TabPanel id="general">
          <div>
            <h2 className="text-xl font-semibold text-[#c9a66b] mb-4">Allgemeine Einstellungen</h2>
            <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
              <TextField name="webUrl">
                <Label className="text-[#a0aec0]">Web-URL der FFL-Seite</Label>
                <Input
                  type="url"
                  value={formData.webUrl || ''}
                  onChange={(e) => handleChange('webUrl', e.target.value)}
                  placeholder="https://ffl.example.com"
                  className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
                />
              </TextField>
              <p className="text-xs text-[#6b7280] mt-2">
                Öffentliche Basis-URL der FFL-Seite (z.B. für Links in Mails). Ohne abschließenden Slash.
              </p>
            </Card>

            <h2 className="text-xl font-semibold text-[#c9a66b] mt-6 mb-4">LLM (OpenRouter)</h2>
            <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <TextField name="openrouterApiKey">
                  <Label className="text-[#a0aec0]">OpenRouter API-Key</Label>
                  <Input
                    type="password"
                    value={formData.openrouterApiKey || ''}
                    onChange={(e) => handleChange('openrouterApiKey', e.target.value)}
                    placeholder="Nur eingeben zum Ändern"
                    className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
                  />
                </TextField>
                <TextField name="openrouterModel">
                  <Label className="text-[#a0aec0]">Modell</Label>
                  <Input
                    value={formData.openrouterModel || ''}
                    onChange={(e) => handleChange('openrouterModel', e.target.value)}
                    placeholder="openai/gpt-4o-mini"
                    className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
                  />
                </TextField>
              </div>
            </Card>

            <div className="mt-6 flex items-center gap-4">
              <Button
                onPress={handleSave}
                isDisabled={!hasChanges || updateConfig.isPending}
                className="bg-[#c9a66b] text-[#0f1419] font-semibold px-6 py-2 rounded hover:bg-[#d4b87a] disabled:opacity-50"
              >
                {updateConfig.isPending ? 'Speichern...' : 'Speichern'}
              </Button>
              {saveMessage && (
                <span className={saveMessage.includes('Fehler') ? 'text-[#e05252]' : 'text-[#48bb78]'}>
                  {saveMessage}
                </span>
              )}
            </div>
          </div>
        </TabPanel>

        <TabPanel id="mail">
          <div>
            <h2 className="text-xl font-semibold text-[#c9a66b] mb-4">Gmail Sende-Account</h2>

            <div className="grid gap-4">
              <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
                <div className="grid gap-4 grid-cols-4">
                  <TextField name="gmailSenderEmail">
                    <Label className="text-[#a0aec0]">Absender E-Mail</Label>
                    <Input
                      type="email"
                      value={formData.gmailSenderEmail || ''}
                      onChange={(e) => handleChange('gmailSenderEmail', e.target.value)}
                      placeholder="example@gmail.com"
                      className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
                    />
                  </TextField>
                  <TextField name="gmailAppPassword">
                    <Label className="text-[#a0aec0]">App-Passwort</Label>
                    <Input
                      value={formData.gmailAppPassword || ''}
                      onChange={(e) => handleChange('gmailAppPassword', e.target.value)}
                      placeholder="16-stellig"
                      className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
                    />
                  </TextField>
                  <TextField name="gmailSmtpServer">
                    <Label className="text-[#a0aec0]">SMTP Server</Label>
                    <Input
                      value={formData.gmailSmtpServer || ''}
                      onChange={(e) => handleChange('gmailSmtpServer', e.target.value)}
                      className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
                    />
                  </TextField>
                  <TextField name="gmailSmtpPort">
                    <Label className="text-[#a0aec0]">SMTP Port</Label>
                    <Input
                      type="number"
                      value={formData.gmailSmtpPort?.toString() || '587'}
                      onChange={(e) =>
                        handleChange('gmailSmtpPort', parseInt(e.target.value) || 587)
                      }
                      className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
                    />
                  </TextField>
                </div>
                <p className="text-xs text-[#6b7280] mt-2">
                  Erstelle ein App-Passwort unter myaccount.google.com → Sicherheit → App-Passwörter
                </p>
              </Card>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <Button
                onPress={handleSave}
                isDisabled={!hasChanges || updateConfig.isPending}
                className="bg-[#c9a66b] text-[#0f1419] font-semibold px-6 py-2 rounded hover:bg-[#d4b87a] disabled:opacity-50"
              >
                {updateConfig.isPending ? 'Speichern...' : 'Speichern'}
              </Button>
              {saveMessage && (
                <span
                  className={
                    saveMessage.includes('Fehler') ? 'text-[#e05252]' : 'text-[#48bb78]'
                  }
                >
                  {saveMessage}
                </span>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-[#2d3748]">
              <h3 className="text-lg font-semibold text-[#c9a66b] mb-4">Test-Mail senden</h3>
              <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <TextField name="testMailTo">
                      <Label className="text-[#a0aec0]">Empfänger</Label>
                      <Input
                        type="email"
                        value={testMailTo}
                        onChange={(e) => setTestMailTo(e.target.value)}
                        placeholder="empfaenger@example.com"
                        className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
                      />
                    </TextField>
                  </div>
                  <Button
                    onPress={handleSendTestMail}
                    isDisabled={!testMailTo || sendTestMail.isPending}
                    className="bg-[#c9a66b] text-[#0f1419] font-semibold px-6 py-2 rounded hover:bg-[#d4b87a] disabled:opacity-50"
                  >
                    {sendTestMail.isPending ? 'Sende...' : 'Test-Mail senden'}
                  </Button>
                </div>
              </Card>

              {testMailResult && (
                <Card className="mt-4 p-6 bg-[#1a2028] border border-[#2d3748]">
                  <div className="mb-4">
                    <span className={testMailResult.success ? 'text-[#48bb78]' : 'text-[#e05252]'}>
                      {testMailResult.success ? '✓ ' : '✗ '}{testMailResult.message}
                    </span>
                  </div>
                  <div className="text-sm text-[#a0aec0] space-y-1">
                    <p><span className="text-[#6b7280]">Verwendete Email:</span> {testMailResult.usedEmail || '-'}</p>
                    <p><span className="text-[#6b7280]">Verwendetes Passwort:</span> {testMailResult.usedPassword || '-'}</p>
                    <p><span className="text-[#6b7280]">SMTP Server:</span> {testMailResult.usedSmtpServer || '-'}</p>
                    <p><span className="text-[#6b7280]">SMTP Port:</span> {testMailResult.usedSmtpPort || '-'}</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabPanel>

      </TabsRoot>
    </div>
  )
}
