import api from './client'
import type { VisitStatistics } from '../types'

export const visitStatsApi = {
  getVisits: (from: string, to: string) =>
    api.get<VisitStatistics>('/statistics/visits', { params: { from, to } }),
  recordVisit: () => api.post<void>('/visits'),
}
