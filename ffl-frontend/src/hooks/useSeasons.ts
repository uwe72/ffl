import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { seasonApi, type UpdatePayoutRequest } from '../api/seasons'

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

export function useCurrentSeason() {
  return useQuery({
    queryKey: ['seasons', 'current'],
    queryFn: () => seasonApi.getCurrent().then(res => res.data),
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

export function useUpdateSeason() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof seasonApi.update>[1] }) =>
      seasonApi.update(id, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] })
    },
  })
}

export function usePrizeDistribution(seasonId: number) {
  return useQuery({
    queryKey: ['seasons', seasonId, 'prize-distribution'],
    queryFn: () => seasonApi.getPrizeDistribution(seasonId).then(res => res.data),
    enabled: !!seasonId,
  })
}

export function useCalculatePrizeDistribution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (seasonId: number) =>
      seasonApi.calculatePrizeDistribution(seasonId).then(res => res.data),
    onSuccess: (_, seasonId) => {
      queryClient.invalidateQueries({ queryKey: ['seasons', seasonId, 'prize-distribution'] })
      queryClient.invalidateQueries({ queryKey: ['seasons', seasonId, 'prize-distribution-log'] })
    },
  })
}

export function usePrizeDistributionLog(seasonId: number) {
  return useQuery({
    queryKey: ['seasons', seasonId, 'prize-distribution-log'],
    queryFn: () => seasonApi.getPrizeDistributionLog(seasonId).then(res => res.data),
    enabled: !!seasonId,
  })
}

export function useMinP1Validation(seasonId: number) {
  return useQuery({
    queryKey: ['seasons', seasonId, 'min-p1-validation'],
    queryFn: () => seasonApi.getMinP1Validation(seasonId).then(res => res.data),
    enabled: !!seasonId,
  })
}

export function useUpdatePrizePayout(seasonId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ managerId, data }: { managerId: number; data: UpdatePayoutRequest }) =>
      seasonApi.updatePrizePayout(seasonId, managerId, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons', seasonId, 'prize-distribution'] })
    },
  })
}

export function usePrizeDistributionMailPreview(seasonId: number) {
  return useQuery({
    queryKey: ['seasons', seasonId, 'prize-distribution-mail-preview'],
    queryFn: () => seasonApi.getPrizeDistributionMailPreview(seasonId).then(res => res.data),
    enabled: false,
  })
}

export function useSendSeasonReport() {
  return useMutation({
    mutationFn: (seasonId: number) =>
      seasonApi.sendSeasonReport(seasonId).then(res => res.data),
  })
}