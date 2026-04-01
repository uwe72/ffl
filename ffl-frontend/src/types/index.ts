export interface Season {
  id: number
  name: string
  budget: number
  seasonState: SeasonState
  finalRegistrationDate?: string
}

export type SeasonState = 'BEFORE_SEASON' | 'RUNNING_HINRUNDE' | 'RUNNING_RUECKRUNDE'

export interface Team {
  id: number
  name: string
  shortName?: string
  logoXxlUrl?: string
  logoSUrl?: string
}

export type Position = 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELD' | 'STRIKER'

export interface Player {
  id: number
  nameKicker: string
  firstName?: string
  lastName?: string
  position: Position
  prize: number
  pictureUrl?: string
  team?: Team
  season?: Season
}

export type PaymentState = 'PAID' | 'NOT_PAID'

export interface Manager {
  id: number
  name: string
  shortName?: string
  budget: number
  paymentState: PaymentState
  description?: string
  players: Player[]
}

export interface User {
  id: number
  login: string
  email: string
  firstName?: string
  lastName?: string
  role: UserRole
}

export type UserRole = 'ADMIN' | 'NORMAL' | 'GUEST'