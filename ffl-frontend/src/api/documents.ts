import api from './client'
import type { Document } from '../types'

export const documentApi = {
  getAll: () => api.get<Document[]>('/documents'),
  download: (id: number) => api.get(`/documents/${id}/content`, { responseType: 'blob' }),
  upload: (file: File, description?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (description) formData.append('description', description)
    return api.post<Document>('/documents', formData)
  },
  updateDescription: (id: number, description: string) =>
    api.put<Document>(`/documents/${id}`, { description }),
  remove: (id: number) => api.delete(`/documents/${id}`),
}
