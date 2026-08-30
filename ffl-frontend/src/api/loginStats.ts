import api from './client'
import type { LoginStatistics } from '../types'

export const loginStatsApi = {
  getLogins: (from: string, to: string) =>
    api.get<LoginStatistics>('/statistics/logins', { params: { from, to } }),
}
