import api from './client'
import type { SystemConfig, TestMailResult } from '../types'

export const systemApi = {
  getConfig: () => api.get<SystemConfig>('/system/config'),
  updateConfig: (data: Partial<SystemConfig>) => api.put<SystemConfig>('/system/config', data),
  updatePaymentChecks: (data: { lastPaypalCheck: string | null; lastUeberweisungCheck: string | null }) =>
    api.put<SystemConfig>('/system/config/payment-checks', data),
  sendTestMail: (to: string) => api.post<TestMailResult>(`/system/test-mail?to=${encodeURIComponent(to)}`),
}
