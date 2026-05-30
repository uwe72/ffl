import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { emailApi } from '../api/emails'

export const useEmails = (search?: string) => {
  return useQuery({
    queryKey: ['emails', search],
    queryFn: () => emailApi.getAll(search).then(res => res.data),
  })
}

export const useCreateEmail = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => emailApi.create(email).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] })
    },
  })
}

export const useBulkCreateEmails = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (emails: string[]) => emailApi.bulkCreate(emails).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] })
    },
  })
}

export const useDeleteEmail = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => emailApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] })
    },
  })
}