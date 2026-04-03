import api from './client'
import type { Team, Player } from '../types'

export const teamApi = {
  getAll: () => api.get<Team[]>('/teams'),
  getById: (id: number) => api.get<Team>(`/teams/${id}`),
  getPlayers: (id: number) => api.get<Player[]>(`/teams/${id}/players`),
  create: (team: Partial<Team>) => api.post<Team>('/teams', team),
}