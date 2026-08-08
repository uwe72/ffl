import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentApi } from '../api/documents'

export const useDocuments = () => {
  return useQuery({
    queryKey: ['documents'],
    queryFn: () => documentApi.getAll().then(res => res.data),
  })
}

export const useUploadDocument = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => documentApi.upload(file).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

export const useDeleteDocument = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => documentApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}
