import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { seasonHistoryApi } from '../api/seasonHistory'

export function useSeasonHistory() {
  return useQuery({
    queryKey: ['season-history'],
    queryFn: () => seasonHistoryApi.getAll().then(res => res.data),
  })
}

export function useCreateSeasonHistory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { saison: string; budget: number; anzahlManager: number }) =>
      seasonHistoryApi.create(data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['season-history'] })
    },
  })
}

export function useUpdateSeasonHistory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { saison: string; budget: number; anzahlManager: number } }) =>
      seasonHistoryApi.update(id, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['season-history'] })
    },
  })
}

export function useDeleteSeasonHistory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => seasonHistoryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['season-history'] })
    },
  })
}
