import api from './client'
import type { SeasonHistory } from '../types'

export const seasonHistoryApi = {
  getAll: () => api.get<SeasonHistory[]>('/history'),
  create: (data: { saison: string; budget: number; anzahlManager: number }) =>
    api.post<SeasonHistory>('/history', data),
  update: (id: number, data: { saison: string; budget: number; anzahlManager: number }) =>
    api.put<SeasonHistory>(`/history/${id}`, data),
  delete: (id: number) => api.delete(`/history/${id}`),
}
