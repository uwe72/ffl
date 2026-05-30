import api from './client'
import type { EmailAddress } from '../types'

export const emailApi = {
  getAll: (search?: string) => {
    const params = search ? { search } : undefined
    return api.get<EmailAddress[]>('/emails', { params })
  },
  create: (email: string) => api.post<EmailAddress>('/emails', { email }),
  bulkCreate: (emails: string[]) => api.post<EmailAddress[]>('/emails/import', { emails }),
  remove: (id: number) => api.delete(`/emails/${id}`),
}