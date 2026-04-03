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

export function useTeamPlayers(teamId: number) {
  return useQuery({
    queryKey: ['teams', teamId, 'players'],
    queryFn: () => teamApi.getPlayers(teamId).then(res => res.data),
    enabled: !!teamId,
  })
}