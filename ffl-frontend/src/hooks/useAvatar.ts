import { useEffect, useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { authApi } from '../api/auth'
import { useAuth } from '../context/AuthContext'

export function useAvatar(userId: number | null | undefined) {
  const query = useQuery({
    queryKey: ['avatar', userId],
    queryFn: async () => {
      if (!userId) return null
      try {
        return await authApi.getAvatar(userId)
      } catch (err) {
        console.error('Failed to load avatar:', err)
        return null
      }
    },
    enabled: !!userId,
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

export function useUploadAvatar() {
  const queryClient = useQueryClient()
  const { updateAvatarUrl } = useAuth()

  return useMutation({
    mutationFn: ({ file, userId }: { file: File; userId: number }) =>
      authApi.uploadAvatar(file).then(res => ({ res, userId })),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['avatar', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['manager'] })
      updateAvatarUrl('/api/users/' + variables.userId + '/avatar')
    },
  })
}

export function useDeleteAvatar() {
  const queryClient = useQueryClient()
  const { updateAvatarUrl } = useAuth()

  return useMutation({
    mutationFn: ({ userId }: { userId: number }) =>
      authApi.deleteAvatar().then(() => ({ userId })),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['avatar', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['manager'] })
      updateAvatarUrl(null)
    },
  })
}
