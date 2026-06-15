import api from './client'
import type { ManagerGroup, ManagerGroupListDto, ManagerGroupRoundStats } from '../types'

export const managerGroupApi = {
  getAll: () => api.get<ManagerGroupListDto[]>('/manager-groups'),
  getById: (id: number) => api.get<ManagerGroup>(`/manager-groups/${id}`),
  create: (data: { 
    name: string
    description?: string
    seasonId: number
    emailTo?: 'ALL_MANAGERS' | 'CREATOR_ONLY'
    managerIds?: number[]
  }) => api.post<ManagerGroup>('/manager-groups', data),
  update: (id: number, data: { name: string; description?: string; emailTo?: 'ALL_MANAGERS' | 'CREATOR_ONLY' }) => 
    api.put<ManagerGroup>(`/manager-groups/${id}`, data),
  delete: (id: number) => api.delete(`/manager-groups/${id}`),
  addManager: (groupId: number, managerId: number) => 
    api.post<ManagerGroup>(`/manager-groups/${groupId}/managers/${managerId}`),
  removeManager: (groupId: number, managerId: number) => 
    api.delete<ManagerGroup>(`/manager-groups/${groupId}/managers/${managerId}`),
  changeCreator: (groupId: number, newCreatorId: number) => 
    api.put<ManagerGroup>(`/manager-groups/${groupId}/creator`, { newCreatorId }),
  getMyGroupsWithStats: () => api.get<ManagerGroupRoundStats[]>('/manager-groups/my-groups-with-stats'),
  getGroupsWithStatsByManagerId: (managerId: number) => api.get<ManagerGroupRoundStats[]>(`/manager-groups/manager/${managerId}/with-stats`),
  uploadLogo: (groupId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<ManagerGroup>(`/manager-groups/${groupId}/logo`, formData)
  },
  deleteLogo: (groupId: number) => api.delete(`/manager-groups/${groupId}/logo`),
  getLogo: (groupId: number) => api.get(`/manager-groups/${groupId}/logo`, {
    responseType: 'blob',
    params: { _: Date.now() },
  }),
}
