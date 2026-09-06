import api from './client'
import type {
  SurveyAdmin,
  SurveyPublic,
  SurveyCreateRequest,
  SurveyAnswerRequest,
  SurveyResult,
} from '../types'

export const surveyApi = {
  list: () => api.get<SurveyAdmin[]>('/surveys'),
  get: (id: number) => api.get<SurveyAdmin>(`/surveys/${id}`),
  create: (data: SurveyCreateRequest) => api.post<SurveyAdmin>('/surveys', data),
  update: (id: number, data: SurveyCreateRequest) => api.put<SurveyAdmin>(`/surveys/${id}`, data),
  updateMeta: (id: number, data: { title: string; description: string; deadline: string }) =>
    api.put<SurveyAdmin>(`/surveys/${id}/meta`, data),
  copy: (id: number) => api.post<SurveyAdmin>(`/surveys/${id}/copy`),
  remove: (id: number) => api.delete(`/surveys/${id}`),
  removeResponse: (surveyId: number, responseId: number) =>
    api.delete(`/surveys/${surveyId}/responses/${responseId}`),
  start: (id: number) => api.post<SurveyAdmin>(`/surveys/${id}/start`),
  end: (id: number) => api.post<SurveyAdmin>(`/surveys/${id}/end`),
  reset: (id: number) => api.post<SurveyAdmin>(`/surveys/${id}/reset`),
  reopen: (id: number, data?: { deadline: string | null }) =>
    api.post<SurveyAdmin>(`/surveys/${id}/reopen`, data ?? {}),
  result: (id: number) => api.get<SurveyResult>(`/surveys/${id}/result`),
}

export const surveyPublicApi = {
  active: () => api.get<SurveyPublic>('/public/survey/active'),
  get: (id: number) => api.get<SurveyPublic>(`/public/survey/${id}`),
  submit: (id: number, data: SurveyAnswerRequest) =>
    api.post(`/public/survey/${id}/submit`, data),
}
