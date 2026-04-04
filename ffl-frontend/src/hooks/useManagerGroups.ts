import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { managerGroupApi } from '../api/managerGroups'

export const useManagerGroups = () => {
  return useQuery({
    queryKey: ['manager-groups'],
    queryFn: () => managerGroupApi.getAll().then(res => res.data),
  })
}

export const useManagerGroup = (id: number) => {
  return useQuery({
    queryKey: ['manager-group', id],
    queryFn: () => managerGroupApi.getById(id).then(res => res.data),
    enabled: !!id,
  })
}

export const useCreateManagerGroup = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string; seasonId: number }) => 
      managerGroupApi.create(data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-groups'] })
    },
  })
}

export const useUpdateManagerGroup = (id: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string; emailTo?: 'ALL_MANAGERS' | 'CREATOR_ONLY' }) => 
      managerGroupApi.update(id, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-groups'] })
      queryClient.invalidateQueries({ queryKey: ['manager-group', id] })
    },
  })
}

export const useDeleteManagerGroup = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => managerGroupApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-groups'] })
    },
  })
}

export const useAddManagerToGroup = (groupId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (managerId: number) => 
      managerGroupApi.addManager(groupId, managerId).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-group', groupId] })
    },
  })
}

export const useRemoveManagerFromGroup = (groupId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (managerId: number) => 
      managerGroupApi.removeManager(groupId, managerId).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-group', groupId] })
    },
  })
}
