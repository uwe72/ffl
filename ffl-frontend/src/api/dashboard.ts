import api from './client'
import type { Aufstellung, Rangliste } from '../types/dashboard'

export const dashboardApi = {
  getAufstellung: (managerId: number) =>
    api.get<Aufstellung>(`/dashboard/aufstellung/${managerId}`).then(r => r.data),
  getRangliste: (managerId: number, modus: 'gesamt' | 'spieltag', umkreis = 2) =>
    api.get<Rangliste>(`/dashboard/rangliste/${managerId}`, { params: { modus, umkreis } }).then(r => r.data),
}
