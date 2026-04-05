import { useQuery } from '@tanstack/react-query'
import { managerApi } from '../api/managers'

export const useManagers = () => {
  return useQuery({
    queryKey: ['managers'],
    queryFn: () => managerApi.getAll().then(res => res.data),
  })
}

export const useManager = (id: number) => {
  return useQuery({
    queryKey: ['manager', id],
    queryFn: () => managerApi.getById(id).then(res => res.data),
    enabled: !!id,
  })
}

export const useManagersBySeason = (seasonId: number) => {
  return useQuery({
    queryKey: ['managers', 'season', seasonId],
    queryFn: () => managerApi.getBySeason(seasonId).then(res => res.data),
    enabled: !!seasonId,
  })
}

export const useManagerRanks = (id: number) => {
  return useQuery({
    queryKey: ['manager', id, 'ranks'],
    queryFn: () => managerApi.getRanks(id).then(res => res.data),
    enabled: !!id,
  })
}

export const useManagerRoundDetails = (id: number) => {
  return useQuery({
    queryKey: ['manager', id, 'round-details'],
    queryFn: () => managerApi.getRoundDetails(id).then(res => res.data),
    enabled: !!id,
  })
}

export const useManagerGroups = (id: number) => {
  return useQuery({
    queryKey: ['manager', id, 'groups'],
    queryFn: () => managerApi.getGroups(id).then(res => res.data),
    enabled: !!id,
  })
}

export const useCurrentManager = () => {
  return useQuery({
    queryKey: ['manager', 'current'],
    queryFn: () => managerApi.getCurrent().then(res => res.data),
  })
}

export const useManagerPositionStats = (id: number) => {
  return useQuery({
    queryKey: ['manager', id, 'position-stats'],
    queryFn: () => managerApi.getPositionStats(id).then(res => res.data),
    enabled: !!id,
  })
}

export const useLeaguePositionStats = (seasonId: number) => {
  return useQuery({
    queryKey: ['managers', 'league', 'position-stats', seasonId],
    queryFn: () => managerApi.getLeaguePositionStats(seasonId).then(res => res.data),
    enabled: !!seasonId,
  })
}

export const useRoundStats = (seasonId: number) => {
  return useQuery({
    queryKey: ['managers', 'round-stats', seasonId],
    queryFn: () => managerApi.getRoundStats(seasonId).then(res => res.data),
    enabled: !!seasonId,
  })
}