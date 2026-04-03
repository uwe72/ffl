import { useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { Button, Card, Alert, TextField, Label, Input } from '@heroui/react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login: authLogin } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await authLogin({ login, password })
      navigate('/')
    } catch (err) {
      setError('Ungültiger Login oder Passwort')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1419] py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full p-8 bg-[#1a2028] border border-[#2d3748]">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-[#f5f5f5]">Anmelden</h2>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <Alert status="danger">
              <Alert.Content>
                <Alert.Description>{error}</Alert.Description>
              </Alert.Content>
            </Alert>
          )}
          <div className="space-y-4">
            <TextField name="login" isRequired>
              <Label className="text-[#a0aec0]">Login</Label>
              <Input
                placeholder="Login"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5] placeholder-[#6b7280]"
              />
            </TextField>
            <TextField name="password" isRequired>
              <Label className="text-[#a0aec0]">Passwort</Label>
              <Input
                type="password"
                placeholder="Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#242d38] border-[#3d4a5c] text-[#f5f5f5] placeholder-[#6b7280]"
              />
            </TextField>
          </div>
          <Button
            type="submit"
            variant="primary"
            className="w-full bg-[#c9a66b] text-[#0f1419] hover:bg-[#d4b77a]"
            isDisabled={isLoading}
          >
            {isLoading ? 'Wird geladen...' : 'Anmelden'}
          </Button>
          <div className="text-center">
            <RouterLink to="/register" className="text-[#c9a66b] hover:text-[#d4b77a] link">
              Noch kein Konto? Registrieren
            </RouterLink>
          </div>
        </form>
      </Card>
    </div>
  )
}