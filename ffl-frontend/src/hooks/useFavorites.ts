import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { favoritesApi } from '../api/favorites'

const favoritesKey = (seasonId: number) => ['favorites', seasonId] as const

export const useFavorites = (seasonId: number) => {
  return useQuery({
    queryKey: favoritesKey(seasonId),
    queryFn: () => favoritesApi.list(seasonId),
    enabled: !!seasonId,
  })
}

export const useAddFavorite = (seasonId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (friendManagerId: number) => favoritesApi.add(seasonId, friendManagerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: favoritesKey(seasonId) }),
  })
}

export const useRemoveFavorite = (seasonId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (friendManagerId: number) => favoritesApi.remove(seasonId, friendManagerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: favoritesKey(seasonId) }),
  })
}

export const useSetStandard = (seasonId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (friendManagerId: number | null) => favoritesApi.setStandard(seasonId, friendManagerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: favoritesKey(seasonId) }),
  })
}
