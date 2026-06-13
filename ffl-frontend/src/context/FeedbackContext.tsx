import { useState, createContext, useContext, type ReactNode } from 'react'
import FeedbackDialog from '../components/FeedbackDialog'

interface FeedbackContextType {
  isOpen: boolean
  open: () => void
  close: () => void
}

const FeedbackContext = createContext<FeedbackContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
})

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <FeedbackContext.Provider value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}>
      {children}
      <FeedbackDialog isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </FeedbackContext.Provider>
  )
}

export function useFeedback() {
  return useContext(FeedbackContext)
}
