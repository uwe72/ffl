import api from './client'
import type { Player } from '../types'

export const playerApi = {
  getAll: () => api.get<Player[]>('/players'),
  getById: (id: number) => api.get<Player>(`/players/${id}`),
  getBySeason: (seasonId: number) => api.get<Player[]>(`/players/season/${seasonId}`),
}
