import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
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

export const useGroupLogo = (groupId: number | null | undefined) => {
  const query = useQuery({
    queryKey: ['group-logo', groupId],
    queryFn: async () => {
      if (!groupId) return null
      try {
        return await managerGroupApi.getLogo(groupId).then(res => res.data as Blob)
      } catch {
        return null
      }
    },
    enabled: !!groupId,
    staleTime: 1000 * 60 * 5,
  })

  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (query.data instanceof Blob) {
      const objectUrl = URL.createObjectURL(query.data)
      setUrl(objectUrl)
      return () => URL.revokeObjectURL(objectUrl)
    }
    setUrl(null)
  }, [query.data])

  return { ...query, data: url }
}

export const useUploadGroupLogo = (groupId: number) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => managerGroupApi.uploadLogo(groupId, file).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-logo', groupId] })
      queryClient.invalidateQueries({ queryKey: ['manager-group', groupId] })
    },
  })
}

export const useDeleteGroupLogo = (groupId: number) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => managerGroupApi.deleteLogo(groupId).then(() => {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-logo', groupId] })
      queryClient.invalidateQueries({ queryKey: ['manager-group', groupId] })
    },
  })
}

export const useCreateManagerGroup = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { 
      name: string
      description?: string
      seasonId: number
      emailTo?: 'ALL_MANAGERS' | 'CREATOR_ONLY'
      managerIds?: number[]
    }) => managerGroupApi.create(data).then(res => res.data),
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

export const useChangeCreator = (groupId: number) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (newCreatorId: number) => 
      managerGroupApi.changeCreator(groupId, newCreatorId).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-group', groupId] })
      queryClient.invalidateQueries({ queryKey: ['manager-groups'] })
    },
  })
}

export const useMyGroupsWithStats = (enabled = true) => {
  return useQuery({
    queryKey: ['manager-groups', 'my-stats'],
    queryFn: () => managerGroupApi.getMyGroupsWithStats().then(res => res.data),
    enabled,
  })
}

export const useManagerGroupsWithStats = (managerId: number, enabled = true) => {
  return useQuery({
    queryKey: ['manager-groups', 'stats', managerId],
    queryFn: () => managerGroupApi.getGroupsWithStatsByManagerId(managerId).then(res => res.data),
    enabled: enabled && !!managerId,
  })
}
