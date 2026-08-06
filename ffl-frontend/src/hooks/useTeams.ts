import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teamApi } from '../api/teams'
import type { Team } from '../types'

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

export function useUpdateTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Team> }) =>
      teamApi.update(id, data).then(res => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teams', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
  })
}