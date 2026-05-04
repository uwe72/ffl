import { useQuery } from '@tanstack/react-query'
import { authApi } from '../api/auth'

export const useProfile = () => {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => authApi.getProfile(),
  })
}
