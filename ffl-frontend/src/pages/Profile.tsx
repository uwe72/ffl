import { Link as RouterLink } from 'react-router-dom'
import { Card, Label, Chip } from '@heroui/react'
import { useProfile } from '../hooks/useProfile'

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  NORMAL: 'Normal',
  GUEST: 'Gast'
}

const roleColors: Record<string, 'success' | 'warning' | 'default'> = {
  ADMIN: 'success',
  NORMAL: 'warning',
  GUEST: 'default'
}

export default function Profile() {
  const { data: user, isLoading, error } = useProfile()

  if (isLoading) return <div className="text-center py-8 text-[#a0aec0]">Laden...</div>
  if (error) return <div className="text-center py-8 text-[#e05252]">Fehler beim Laden</div>
  if (!user) return <div className="text-center py-8 text-[#6b7280]">Profil nicht gefunden</div>

  return (
    <div>
      <RouterLink to="/" className="text-[#c9a66b] hover:text-[#d4b77a] mb-4 inline-block link">
        &larr; Zurück zur Startseite
      </RouterLink>

      <h1 className="text-3xl font-bold text-[#f5f5f5] mb-6">Mein Profil</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
          <Label className="text-[#a0aec0] block mb-2">Login-Name</Label>
          <p className="text-[#f5f5f5] text-lg">{user.login}</p>
        </Card>

        <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
          <Label className="text-[#a0aec0] block mb-2">Rolle</Label>
          <Chip
            color={roleColors[user.role as keyof typeof roleColors] || 'default'}
            variant="soft"
          >
            {roleLabels[user.role as keyof typeof roleLabels] || user.role}
          </Chip>
        </Card>

        <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
          <Label className="text-[#a0aec0] block mb-2">Vorname</Label>
          <p className="text-[#f5f5f5] text-lg">{user.firstName || '-'}</p>
        </Card>

        <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
          <Label className="text-[#a0aec0] block mb-2">Nachname</Label>
          <p className="text-[#f5f5f5] text-lg">{user.lastName || '-'}</p>
        </Card>

        <Card className="p-6 bg-[#1a2028] border border-[#2d3748]">
          <Label className="text-[#a0aec0] block mb-2">E-Mail</Label>
          <p className="text-[#f5f5f5] text-lg">{user.email || '-'}</p>
        </Card>
      </div>
    </div>
  )
}
