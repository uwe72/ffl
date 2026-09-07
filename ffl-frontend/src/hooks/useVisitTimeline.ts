import { useQuery } from '@tanstack/react-query'
import { visitStatsApi } from '../api/visitStats'
import type { VisitTimeline, VisitTimelineGranularity } from '../types'

export const useVisitTimeline = (granularity: VisitTimelineGranularity) => {
  return useQuery<VisitTimeline>({
    queryKey: ['visitTimeline', granularity],
    queryFn: () => visitStatsApi.getTimeline(granularity).then(res => res.data),
  })
}
