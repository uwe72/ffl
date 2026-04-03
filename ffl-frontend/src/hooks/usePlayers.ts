import { useQuery } from '@tanstack/react-query'
import { playerApi } from '../api/players'

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
