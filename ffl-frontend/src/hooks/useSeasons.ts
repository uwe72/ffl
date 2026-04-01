import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { seasonApi } from '../api/seasons'

export function useSeasons() {
  return useQuery({
    queryKey: ['seasons'],
    queryFn: () => seasonApi.getAll().then(res => res.data),
  })
}

export function useSeason(id: number) {
  return useQuery({
    queryKey: ['seasons', id],
    queryFn: () => seasonApi.getById(id).then(res => res.data),
    enabled: !!id,
  })
}

export function useCreateSeason() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (season: Parameters<typeof seasonApi.create>[0]) => 
      seasonApi.create(season).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] })
    },
  })
}