import api from './client'
import type { DownloadStatistics } from '../types'

export const downloadStatsApi = {
  getDownloads: (from: string, to: string) =>
    api.get<DownloadStatistics>('/statistics/downloads', { params: { from, to } }),
}
