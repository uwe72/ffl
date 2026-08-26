import api from './client'
import type { Season, PrizePayout, PrizeDistributionLog, MinP1ValidationResult, PayoutStatus, BestTeamResult, SetupPreviewDto, Document, Deposit, DepositSyncResult, DepositStatus, PaymentMethod, PublicSeasonInfo, InvitationPreview } from '../types'

export interface CalculationResult {
  success: boolean
  log: string
  error?: string
}

export interface UpdatePayoutRequest {
  comment?: string
  payoutStatus?: PayoutStatus
}

export interface UpdateDepositRequest {
  comment?: string
  depositStatus?: DepositStatus
  paymentMethod?: PaymentMethod | ''
}

export interface MailPreviewResponse {
  html: string
}

export interface NewSeasonSetupRequest {
  sourceUrl: string
  seasonName: string
}

export const seasonApi = {
  getAll: () => api.get<Season[]>('/seasons'),
  getById: (id: number) => api.get<Season>(`/seasons/${id}`),
  getCurrent: () => api.get<Season>('/seasons/current'),
  getPublicCurrent: () => api.get<PublicSeasonInfo>('/public/season-info'),
  getInvitationPreview: () => api.get<InvitationPreview>('/public/invitation-preview'),
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
  getPrizeDistributionMailPreview: (id: number) => api.get<MailPreviewResponse>(`/seasons/${id}/prize-distribution/mail/preview`),
  sendInvitationTestMail: (id: number) => api.post<{ message: string }>(`/seasons/${id}/invitation-mail/test`),
  sendReminderTestMail: (id: number, variant: 'danke' | 'erinnerung') => api.post<{ message: string }>(`/seasons/${id}/reminder-mail/test`, null, { params: { variant } }),
  getReminderRegisteredEmails: (id: number) => api.get<string[]>(`/seasons/${id}/reminder-mail/registered-emails`),
  sendSeasonReport: (id: number) => api.post<{ message: string }>(`/seasons/${id}/report-mail`),
  sendTransparencyTestMail: (id: number) => api.post<{ message: string }>(`/seasons/${id}/transparency-mail/test`),
  getTransparencyMailPreview: (id: number) => api.get<MailPreviewResponse>(`/seasons/${id}/transparency-mail/preview`),
  getBestTeam: (id: number) => api.get<BestTeamResult>(`/seasons/${id}/best-team`),
  previewSetup: (req: NewSeasonSetupRequest) => api.post<SetupPreviewDto>('/seasons/setup/preview', req),
  generatePlayersPdf: (id: number) => api.post<Document>(`/seasons/${id}/players-pdf`),
  getDeposits: (id: number) => api.get<Deposit[]>(`/seasons/${id}/deposits`),
  updateDeposit: (seasonId: number, managerId: number, data: UpdateDepositRequest) =>
    api.put<Deposit>(`/seasons/${seasonId}/deposits/${managerId}`, data),
  syncDeposits: (id: number) => api.post<DepositSyncResult>(`/seasons/${id}/deposits/sync`),
  setSpielleiter: (seasonId: number, managerId: number, spielleiter: boolean) =>
    api.put<Deposit>(`/seasons/${seasonId}/managers/${managerId}/spielleiter`, { spielleiter }),
}