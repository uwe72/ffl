import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentApi } from '../api/documents'

export const useDocuments = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['documents'],
    queryFn: () => documentApi.getAll().then(res => res.data),
    enabled,
  })
}

export const useUploadDocument = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ file, description }: { file: File; description?: string }) =>
      documentApi.upload(file, description).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

export const useUpdateDocumentDescription = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, description }: { id: number; description: string }) =>
      documentApi.updateDescription(id, description).then(res => res.data),
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
