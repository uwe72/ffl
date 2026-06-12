import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

declare global {
  interface Window {
    _paq: Array<Array<string | number>>
  }
}

function pushToMatomo(args: Array<string | number>) {
  if (typeof window !== 'undefined' && window._paq) {
    window._paq.push(args)
  }
}

export function useMatomoPageView() {
  const location = useLocation()
  const isFirstMount = useRef(true)

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }

    pushToMatomo(['setReferrerUrl', window.location.origin + document.referrer])
    pushToMatomo(['setCustomUrl', window.location.origin + location.pathname + location.search])
    pushToMatomo(['setDocumentTitle', document.title])
    pushToMatomo(['trackPageView'])
  }, [location])
}

export function trackEvent(category: string, action: string, name?: string, value?: number) {
  const args: Array<string | number> = ['trackEvent', category, action]
  if (name !== undefined) args.push(name)
  if (value !== undefined) args.push(value)
  pushToMatomo(args)
}