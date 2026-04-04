import api from './client'
import type { Game, GameImportResult, ValidationResult } from '../types'

export const gameApi = {
  getAll: () => api.get<Game[]>('/games'),
  getBySeason: (seasonId: number) => api.get<Game[]>(`/games/season/${seasonId}`),
  getByRound: (roundId: number) => api.get<Game[]>(`/games/round/${roundId}`),
  getById: (id: number) => api.get<Game>(`/games/${id}`),
  getLatestCompletedRound: () => api.get<number>('/games/latest-completed-round'),
  create: (game: Partial<Game>) => api.post<Game>('/games', game),
  update: (id: number, game: Partial<Game>) => api.put<Game>(`/games/${id}`, game),
  updateFormation: (id: number, formation: string) => api.put<Game>(`/games/${id}/formation`, formation, { headers: { 'Content-Type': 'text/plain' } }),
  importFormation: (id: number, formationExtern: string) => 
    api.post<Game>(`/games/${id}/import-formation`, formationExtern, { headers: { 'Content-Type': 'text/plain' } }),
  validateFormation: (id: number, formationExtern: string) =>
    api.post<ValidationResult>(`/games/${id}/validate-formation`, formationExtern, { headers: { 'Content-Type': 'text/plain' } }),
  delete: (id: number) => api.delete(`/games/${id}`),
  import: (id: number) => api.post<GameImportResult>(`/games/${id}/import`),
  importWithMappings: (id: number, playerMappings: Record<string, number>) => 
    api.post<GameImportResult>(`/games/${id}/import-with-mappings`, { playerMappings }),
  createPlayer: (id: number, playerName: string, teamId: number, position?: string) =>
    api.post<GameImportResult>(`/games/${id}/create-player`, { 
      playerName, 
      teamId, 
      position 
    }),
}
