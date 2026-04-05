import api from './client'
import type { Player, PlayerSearchDto } from '../types'

export const playerApi = {
  getAll: () => api.get<Player[]>('/players'),
  getById: (id: number) => api.get<Player>(`/players/${id}`),
  getBySeason: (seasonId: number) => api.get<Player[]>(`/players/season/${seasonId}`),
  getByTeamAndSeason: (teamId: number, seasonId: number) => 
    api.get<PlayerSearchDto[]>(`/players/team/${teamId}/season/${seasonId}`),
  getAllBySeason: (seasonId: number) =>
    api.get<PlayerSearchDto[]>(`/players/season/${seasonId}/all`),
  search: (seasonId: number, name: string) => 
    api.get<PlayerSearchDto[]>(`/players/search?seasonId=${seasonId}&name=${encodeURIComponent(name)}`),
  assignToTeam: (playerId: number, teamId: number, alternativeName?: string) => 
    api.post(`/players/${playerId}/assign-team/${teamId}${alternativeName ? `?alternativeName=${encodeURIComponent(alternativeName)}` : ''}`),
}
