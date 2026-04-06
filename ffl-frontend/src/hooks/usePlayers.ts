import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { playerApi } from '../api/players'
import type { Player } from '../types'

export const usePlayers = () => {
  return useQuery({
    queryKey: ['players'],
    queryFn: () => playerApi.getAll().then(res => res.data),
  })
}

export const usePlayer = (id: number) => {
  return useQuery({
    queryKey: ['player', id],
    queryFn: () => playerApi.getById(id).then(res => res.data),
    enabled: !!id,
  })
}

export function usePlayersBySeason(seasonId: number) {
  return useQuery({
    queryKey: ['players', 'season', seasonId],
    queryFn: () => playerApi.getBySeason(seasonId).then(res => res.data),
    enabled: !!seasonId,
  })
}

export const useUpdatePlayer = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Player> }) => 
      playerApi.update(id, data).then(res => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['player', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['players'] })
    },
  })
}

export const usePlayerRanks = (id: number) => {
  return useQuery({
    queryKey: ['player', id, 'ranks'],
    queryFn: () => playerApi.getRanks(id).then(res => res.data),
    enabled: !!id,
  })
}
