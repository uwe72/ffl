import api from './client'
import type { Aufstellung } from '../types/dashboard'

export const dashboardApi = {
  getAufstellung: (managerId: number) =>
    api.get<Aufstellung>(`/dashboard/aufstellung/${managerId}`).then(r => r.data),
}
