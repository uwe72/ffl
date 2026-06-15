import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { authApi } from '../api/auth'

export function useAvatar(userId: number | null | undefined) {
  const objectUrlRef = useRef<string | null>(null)

  const query = useQuery({
    queryKey: ['avatar', userId],
    queryFn: async () => {
      if (!userId) return null
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
      try {
        const blob = await authApi.getAvatar(userId)
        const url = URL.createObjectURL(blob)
        objectUrlRef.current = url
        return url
      } catch (err) {
        console.error('Failed to load avatar:', err)
        return null
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [])

  return query
}

export function useUploadAvatar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ file, userId }: { file: File; userId: number }) =>
      authApi.uploadAvatar(file).then(res => ({ res, userId })),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['avatar', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['manager'] })
    },
  })
}

export function useDeleteAvatar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId }: { userId: number }) =>
      authApi.deleteAvatar().then(() => ({ userId })),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['avatar', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['manager'] })
    },
  })
}
