import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../api/dashboard'

export const useDashboardAufstellung = (managerId: number) => {
  return useQuery({
    queryKey: ['dashboard', 'aufstellung', managerId],
    queryFn: () => dashboardApi.getAufstellung(managerId),
    enabled: !!managerId,
  })
}

export const useDashboardRangliste = (managerId: number, modus: 'gesamt' | 'spieltag') => {
  return useQuery({
    queryKey: ['dashboard', 'rangliste', managerId, modus],
    queryFn: () => dashboardApi.getRangliste(managerId, modus),
    enabled: !!managerId,
  })
}

export const useDashboardFremdAufstellung = (managerId: number) => {
  return useQuery({
    queryKey: ['dashboard', 'aufstellung', managerId],
    queryFn: () => dashboardApi.getAufstellung(managerId),
    enabled: !!managerId,
  })
}
