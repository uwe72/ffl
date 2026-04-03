import api from './client'
import type { Manager, ManagerRank, ManagerGroup, RoundDetail } from '../types'

export const managerApi = {
  getAll: () => api.get<Manager[]>('/managers'),
  getById: (id: number) => api.get<Manager>(`/managers/${id}`),
  getBySeason: (seasonId: number) => api.get<Manager[]>(`/managers/season/${seasonId}`),
  getRanks: (id: number) => api.get<ManagerRank[]>(`/managers/${id}/ranks`),
  getRoundDetails: (id: number) => api.get<RoundDetail[]>(`/managers/${id}/round-details`),
  getGroups: (id: number) => api.get<ManagerGroup[]>(`/managers/${id}/groups`),
}