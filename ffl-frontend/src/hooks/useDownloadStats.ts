import { useQuery } from '@tanstack/react-query'
import { downloadStatsApi } from '../api/downloadStats'
import type { DownloadStatistics } from '../types'

export const useDownloadStats = (from: string, to: string) => {
  return useQuery<DownloadStatistics>({
    queryKey: ['downloadStats', from, to],
    queryFn: () => downloadStatsApi.getDownloads(from, to).then(res => res.data),
  })
}
