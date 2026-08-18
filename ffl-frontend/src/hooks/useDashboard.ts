import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../api/dashboard'

export const useDashboardAufstellung = (managerId: number) => {
  return useQuery({
    queryKey: ['dashboard', 'aufstellung', managerId],
    queryFn: () => dashboardApi.getAufstellung(managerId),
    enabled: !!managerId,
  })
}
