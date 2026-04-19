import api from './client'
import type { SystemConfig, TestMailResult } from '../types'

export const systemApi = {
  getConfig: () => api.get<SystemConfig>('/system/config'),
  updateConfig: (data: Partial<SystemConfig>) => api.put<SystemConfig>('/system/config', data),
  sendTestMail: (to: string) => api.post<TestMailResult>(`/system/test-mail?to=${encodeURIComponent(to)}`),
}
