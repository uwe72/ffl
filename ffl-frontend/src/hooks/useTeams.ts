import { useQuery } from '@tanstack/react-query'
import { teamApi } from '../api/teams'

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: () => teamApi.getAll().then(res => res.data),
  })
}

export function useTeam(id: number) {
  return useQuery({
    queryKey: ['teams', id],
    queryFn: () => teamApi.getById(id).then(res => res.data),
    enabled: !!id,
  })
}