import api from './client'
import type { Document } from '../types'

export const documentApi = {
  getAll: () => api.get<Document[]>('/documents'),
  download: (id: number) => api.get(`/documents/${id}/content`, { responseType: 'blob' }),
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<Document>('/documents', formData)
  },
  remove: (id: number) => api.delete(`/documents/${id}`),
}
