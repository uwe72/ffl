import api from './client'
import type { SystemConfig } from '../types'

export const systemApi = {
  getConfig: () => api.get<SystemConfig>('/system/config'),
  updateConfig: (data: Partial<SystemConfig>) => api.put<SystemConfig>('/system/config', data),
}
