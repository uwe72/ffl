import { useQuery } from '@tanstack/react-query'
import { loginStatsApi } from '../api/loginStats'
import type { LoginStatistics } from '../types'

export const useLoginStats = (from: string, to: string) => {
  return useQuery<LoginStatistics>({
    queryKey: ['loginStats', from, to],
    queryFn: () => loginStatsApi.getLogins(from, to).then(res => res.data),
  })
}
