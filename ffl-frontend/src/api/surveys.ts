import api from './client'
import type {
  SurveyAdmin,
  SurveyPublic,
  SurveyCreateRequest,
  SurveyAnswerRequest,
  SurveyResult,
  PublicSurveyResult,
} from '../types'

export const surveyApi = {
  list: () => api.get<SurveyAdmin[]>('/surveys'),
  get: (id: number) => api.get<SurveyAdmin>(`/surveys/${id}`),
  create: (data: SurveyCreateRequest) => api.post<SurveyAdmin>('/surveys', data),
  update: (id: number, data: SurveyCreateRequest) => api.put<SurveyAdmin>(`/surveys/${id}`, data),
  remove: (id: number) => api.delete(`/surveys/${id}`),
  start: (id: number) => api.post<SurveyAdmin>(`/surveys/${id}/start`),
  end: (id: number) => api.post<SurveyAdmin>(`/surveys/${id}/end`),
  publish: (id: number) => api.post<SurveyAdmin>(`/surveys/${id}/publish`),
  result: (id: number) => api.get<SurveyResult>(`/surveys/${id}/result`),
}

export const surveyPublicApi = {
  active: () => api.get<SurveyPublic>('/public/survey/active'),
  get: (id: number) => api.get<SurveyPublic>(`/public/survey/${id}`),
  submit: (id: number, data: SurveyAnswerRequest) =>
    api.post(`/public/survey/${id}/submit`, data),
  result: (id: number) => api.get<PublicSurveyResult>(`/public/survey/${id}/result`),
}
