import { useQuery } from '@tanstack/react-query'
import api from '../api/client'

interface SystemInfo {
  environment: string
}

export function useSystemInfo() {
  return useQuery<SystemInfo>({
    queryKey: ['systemInfo'],
    queryFn: () => api.get('/public/system-info').then(res => res.data),
    staleTime: Infinity
  })
}
