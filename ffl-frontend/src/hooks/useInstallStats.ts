import { useQuery } from '@tanstack/react-query'
import { installStatsApi } from '../api/installStats'
import type { InstallStatistics } from '../types'

export const useInstallStats = (from: string, to: string) => {
  return useQuery<InstallStatistics>({
    queryKey: ['installStats', from, to],
    queryFn: () => installStatsApi.getInstallClicks(from, to).then(res => res.data),
  })
}
