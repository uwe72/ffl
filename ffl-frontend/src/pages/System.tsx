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
import { useSystemConfig, useUpdateSystemConfig } from '../hooks/useSystemConfig'
import type { SystemConfig } from '../types'
import MatchdayMailPanel from '../components/MatchdayMailPanel'

export default function System() {
  const { data: config, isLoading, error } = useSystemConfig()
  const updateConfig = useUpdateSystemConfig()

  const [formData, setFormData] = useState<Partial<SystemConfig>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    if (config) {
      setFormData({
        gmailSenderEmail: config.gmailSenderEmail || '',
        gmailAppPassword: '',
        gmailSmtpServer: config.gmailSmtpServer || 'smtp.gmail.com',
        gmailSmtpPort: config.gmailSmtpPort || 587,
      })
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
      await updateConfig.mutateAsync(formData)
      setHasChanges(false)
      setFormData((prev) => ({ ...prev, gmailAppPassword: '' }))
      setSaveMessage('Konfiguration gespeichert')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch {
      setSaveMessage('Fehler beim Speichern')
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
            id="mail"
            className="px-4 py-2 text-[#a0aec0] cursor-pointer data-[selected]:text-[#c9a66b] data-[selected]:border-b-2 data-[selected]:border-[#c9a66b] outline-none"
          >
            Mailkonfiguration
          </Tab>
          <Tab
            id="matchday"
            className="px-4 py-2 text-[#a0aec0] cursor-pointer data-[selected]:text-[#c9a66b] data-[selected]:border-b-2 data-[selected]:border-[#c9a66b] outline-none"
          >
            Spieltagsmail
          </Tab>
        </TabList>

        <TabPanel id="mail">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold text-[#c9a66b] mb-4">Gmail Sende-Account</h2>

            <div className="grid gap-4">
              <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
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
              </Card>

              <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
                <TextField name="gmailAppPassword">
                  <Label className="text-[#a0aec0]">App-Passwort</Label>
                  <Input
                    type="password"
                    value={formData.gmailAppPassword || ''}
                    onChange={(e) => handleChange('gmailAppPassword', e.target.value)}
                    placeholder="Neues Passwort eingeben zum Ändern"
                    className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5]"
                  />
                </TextField>
                <p className="text-xs text-[#6b7280] mt-2">
                  Erstelle ein App-Passwort unter myaccount.google.com → Sicherheit → App-Passwörter
                </p>
              </Card>

              <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
                <div className="grid gap-4 md:grid-cols-2">
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
          </div>
        </TabPanel>

        <TabPanel id="matchday">
          <MatchdayMailPanel />
        </TabPanel>
      </TabsRoot>
    </div>
  )
}
