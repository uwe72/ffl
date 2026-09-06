import { isAxiosError } from 'axios'

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data
    if (typeof data === 'string' && data.trim() !== '') {
      return data
    }
    return fallback
  }
  if (err instanceof Error && err.message !== '') {
    return err.message
  }
  return fallback
}
