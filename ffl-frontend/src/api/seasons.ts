import api from './client'
import type { Season } from '../types'

export const seasonApi = {
  getAll: () => api.get<Season[]>('/seasons'),
  getById: (id: number) => api.get<Season>(`/seasons/${id}`),
  getCurrent: () => api.get<Season>('/seasons/current'),
  create: (season: Partial<Season>) => api.post<Season>('/seasons', season),
  update: (id: number, season: Partial<Season>) => api.put<Season>(`/seasons/${id}`, season),
  delete: (id: number) => api.delete(`/seasons/${id}`),
}