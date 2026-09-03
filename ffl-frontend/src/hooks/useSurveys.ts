import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { surveyApi, surveyPublicApi } from '../api/surveys'
import type { SurveyCreateRequest, SurveyAnswerRequest } from '../types'

export const useSurveys = () => {
  return useQuery({
    queryKey: ['surveys'],
    queryFn: () => surveyApi.list().then(res => res.data),
  })
}

export const useSurveyResult = (id: number) => {
  return useQuery({
    queryKey: ['survey', id, 'result'],
    queryFn: () => surveyApi.result(id).then(res => res.data),
    enabled: !!id,
  })
}

export const useActiveSurvey = () => {
  return useQuery({
    queryKey: ['survey', 'active'],
    queryFn: () => surveyPublicApi.active().then(res => res.data),
    retry: false,
  })
}

export const usePublicSurvey = (id: number) => {
  return useQuery({
    queryKey: ['survey', 'public', id],
    queryFn: () => surveyPublicApi.get(id).then(res => res.data),
    enabled: !!id,
  })
}

export const usePublicSurveyResult = (id: number, enabled?: boolean) => {
  return useQuery({
    queryKey: ['survey', 'public', id, 'result'],
    queryFn: () => surveyPublicApi.result(id).then(res => res.data),
    enabled: !!id && enabled !== false,
  })
}

export const useCreateSurvey = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SurveyCreateRequest) => surveyApi.create(data).then(res => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surveys'] }),
  })
}

export const useUpdateSurvey = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SurveyCreateRequest }) =>
      surveyApi.update(id, data).then(res => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surveys'] }),
  })
}

export const useCopySurvey = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => surveyApi.copy(id).then(res => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surveys'] }),
  })
}

export const useDeleteSurvey = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => surveyApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      queryClient.invalidateQueries({ queryKey: ['survey', 'active'] })
    },
  })
}

export const useSurveyStatusAction = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'start' | 'end' | 'publish' }) => {
      if (action === 'start') return surveyApi.start(id).then(res => res.data)
      if (action === 'end') return surveyApi.end(id).then(res => res.data)
      return surveyApi.publish(id).then(res => res.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      queryClient.invalidateQueries({ queryKey: ['survey', 'active'] })
    },
  })
}

export const useSubmitSurvey = () => {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SurveyAnswerRequest }) =>
      surveyPublicApi.submit(id, data),
  })
}
