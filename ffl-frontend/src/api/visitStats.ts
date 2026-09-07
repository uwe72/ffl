import api from './client'
import type { VisitStatistics, VisitTimeline, VisitTimelineGranularity } from '../types'

export const visitStatsApi = {
  getVisits: (from: string, to: string) =>
    api.get<VisitStatistics>('/statistics/visits', { params: { from, to } }),
  getTimeline: (granularity: VisitTimelineGranularity) =>
    api.get<VisitTimeline>('/statistics/visits/timeline', { params: { granularity } }),
  recordVisit: () => api.post<void>('/visits'),
}
