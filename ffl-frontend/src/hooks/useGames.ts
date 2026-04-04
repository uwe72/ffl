import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gameApi } from '../api/games'

export function useGames() {
  return useQuery({
    queryKey: ['games'],
    queryFn: () => gameApi.getAll().then(res => res.data),
  })
}

export function useLatestCompletedRound() {
  return useQuery({
    queryKey: ['games', 'latest-completed-round'],
    queryFn: () => gameApi.getLatestCompletedRound().then(res => res.data),
  })
}

export function useGamesBySeason(seasonId: number) {
  return useQuery({
    queryKey: ['games', 'season', seasonId],
    queryFn: () => gameApi.getBySeason(seasonId).then(res => res.data),
    enabled: !!seasonId,
  })
}

export function useGamesByRound(roundId: number) {
  return useQuery({
    queryKey: ['games', 'round', roundId],
    queryFn: () => gameApi.getByRound(roundId).then(res => res.data),
    enabled: !!roundId,
  })
}

export function useGame(id: number) {
  return useQuery({
    queryKey: ['games', id],
    queryFn: () => gameApi.getById(id).then(res => res.data),
    enabled: !!id,
  })
}

export function useCreateGame() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (game: Parameters<typeof gameApi.create>[0]) => gameApi.create(game),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] })
    },
  })
}

export function useUpdateGame() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, game }: { id: number; game: Parameters<typeof gameApi.update>[1] }) =>
      gameApi.update(id, game),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] })
    },
  })
}

export function useDeleteGame() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => gameApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] })
    },
  })
}
