import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PWAContextType {
  isInstallable: boolean
  isInstalled: boolean
  install: () => Promise<boolean>
}

const PWAContext = createContext<PWAContextType | null>(null)

export function PWAProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferredPrompt) return false

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setIsInstallable(false)

    if (outcome === 'accepted') {
      setIsInstalled(true)
      return true
    }
    return false
  }, [deferredPrompt])

  return (
    <PWAContext.Provider value={{ isInstallable, isInstalled, install }}>
      {children}
    </PWAContext.Provider>
  )
}

export function usePWAInstallContext() {
  const context = useContext(PWAContext)
  if (!context) {
    throw new Error('usePWAInstall must be used within a PWAProvider')
  }
  return context
}
