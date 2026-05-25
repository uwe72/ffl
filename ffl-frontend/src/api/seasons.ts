import api from './client'
import type { Season, PrizePayout, PrizeDistributionLog, MinP1ValidationResult, PayoutStatus } from '../types'

export interface CalculationResult {
  success: boolean
  log: string
  error?: string
}

export interface UpdatePayoutRequest {
  comment?: string
  payoutStatus?: PayoutStatus
}

export const seasonApi = {
  getAll: () => api.get<Season[]>('/seasons'),
  getById: (id: number) => api.get<Season>(`/seasons/${id}`),
  getCurrent: () => api.get<Season>('/seasons/current'),
  create: (season: Partial<Season>) => api.post<Season>('/seasons', season),
  update: (id: number, season: Partial<Season>) => api.put<Season>(`/seasons/${id}`, season),
  delete: (id: number) => api.delete(`/seasons/${id}`),
  calculate: (id: number) => api.post<CalculationResult>(`/seasons/${id}/calculate`),
  getPrizeDistribution: (id: number) => api.get<PrizePayout[]>(`/seasons/${id}/prize-distribution`),
  calculatePrizeDistribution: (id: number) => api.post<PrizePayout[]>(`/seasons/${id}/prize-distribution`),
  getPrizeDistributionLog: (id: number) => api.get<PrizeDistributionLog>(`/seasons/${id}/prize-distribution/log`),
  getMinP1Validation: (id: number) => api.get<MinP1ValidationResult>(`/seasons/${id}/prize-distribution/validation`),
  updatePrizePayout: (seasonId: number, managerId: number, data: UpdatePayoutRequest) => 
    api.put<PrizePayout>(`/seasons/${seasonId}/prize-payouts/${managerId}`, data),
}