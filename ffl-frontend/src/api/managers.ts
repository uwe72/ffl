import api from './client'
import type { Manager, ManagerRank, ManagerGroup, RoundDetail, PositionStats, ManagerRoundStats, PlayerPoint, UpdateLineupRequest, WinterTransferRequest } from '../types'

export const managerApi = {
  getAll: () => api.get<Manager[]>('/managers'),
  getById: (id: number) => api.get<Manager>(`/managers/${id}`),
  getBySeason: (seasonId: number) => api.get<Manager[]>(`/managers/season/${seasonId}`),
  getRanks: (id: number) => api.get<ManagerRank[]>(`/managers/${id}/ranks`),
  getRoundDetails: (id: number) => api.get<RoundDetail[]>(`/managers/${id}/round-details`),
  getCurrentPlayers: (id: number) => api.get<PlayerPoint[]>(`/managers/${id}/current-players`),
  getGroups: (id: number) => api.get<ManagerGroup[]>(`/managers/${id}/groups`),
  getCurrent: () => api.get<Manager>('/managers/current'),
  getPositionStats: (id: number) => api.get<PositionStats>(`/managers/${id}/position-stats`),
  getLeaguePositionStats: (seasonId: number) => api.get<PositionStats>(`/managers/league/position-stats?seasonId=${seasonId}`),
  getRoundStats: (seasonId: number) => api.get<ManagerRoundStats[]>(`/managers/round-stats?seasonId=${seasonId}`),
  updateLineup: (data: UpdateLineupRequest) => api.put<Manager>('/managers/current/lineup', data),
  updateWinterTransfers: (data: WinterTransferRequest) => api.put<Manager>('/managers/current/winter-transfers', data),
}