import api from './client'
import type { InstallStatistics } from '../types'

export const installStatsApi = {
  getInstallClicks: (from: string, to: string) =>
    api.get<InstallStatistics>('/statistics/install-clicks', { params: { from, to } }),
}
