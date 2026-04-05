import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userApi } from '../api/users'
import type { User } from '../types'

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.getAll().then(res => res.data),
  })
}

export const useUser = (id: number) => {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => userApi.getById(id).then(res => res.data),
    enabled: !!id,
  })
}

export const useUpdateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<User> }) => 
      userApi.update(id, data).then(res => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export const useDeleteUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => userApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
