import api from './client'
import type { FriendTeam } from '../types'

export const favoritesApi = {
  list: (seasonId: number) =>
    api.get<FriendTeam[]>(`/favorites/season/${seasonId}`).then(r => r.data),
  add: (seasonId: number, friendManagerId: number) =>
    api.post<FriendTeam>('/favorites', { seasonId, friendManagerId }).then(r => r.data),
  remove: (seasonId: number, friendManagerId: number) =>
    api.delete(`/favorites/${friendManagerId}`, { params: { seasonId } }),
  setStandard: (seasonId: number, friendManagerId: number | null) =>
    api.put<FriendTeam | null>('/favorites/standard', { seasonId, friendManagerId }).then(r => r.data),
  getCounts: (seasonId: number) =>
    api.get<Record<string, number>>('/favorites/counts', { params: { seasonId } }).then(r => r.data),
}
