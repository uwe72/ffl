import { useQuery } from '@tanstack/react-query'
import { visitStatsApi } from '../api/visitStats'
import type { VisitStatistics } from '../types'

export const useVisitStats = (from: string, to: string) => {
  return useQuery<VisitStatistics>({
    queryKey: ['visitStats', from, to],
    queryFn: () => visitStatsApi.getVisits(from, to).then(res => res.data),
  })
}
