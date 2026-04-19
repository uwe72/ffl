import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { systemApi } from '../api/system'
import type { SystemConfig } from '../types'

export function useSystemConfig() {
  return useQuery({
    queryKey: ['systemConfig'],
    queryFn: () => systemApi.getConfig().then(res => res.data),
  })
}

export function useUpdateSystemConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<SystemConfig>) =>
      systemApi.updateConfig(data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemConfig'] })
    },
  })
}

export function useSendTestMail() {
  return useMutation({
    mutationFn: (to: string) => systemApi.sendTestMail(to).then(res => res.data),
  })
}
