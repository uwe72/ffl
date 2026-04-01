import api from './client'
import type { Team } from '../types'

export const teamApi = {
  getAll: () => api.get<Team[]>('/teams'),
  getById: (id: number) => api.get<Team>(`/teams/${id}`),
  create: (team: Partial<Team>) => api.post<Team>('/teams', team),
}