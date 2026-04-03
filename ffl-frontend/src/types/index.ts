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
  teams: Team[]
  season?: Season
  managerCount?: number
  managers?: ManagerInfo[]
  points?: number
}

export interface ManagerInfo {
  id: number
  name: string
  shortName?: string
  hinrunde: boolean
  rueckrunde: boolean
}

export type PaymentState = 'PAID' | 'NOT_PAID'

export interface RoundDetail {
  roundId: number
  roundNumber: number
  pointsRound: number
  pointsTotal: number
  positionRound: number
  positionTotal: number
  playerPoints: PlayerPoint[]
}

export interface RulePoint {
  rule: string
  ruleLabel: string
  count: number
  points: number
}

export interface PlayerPoint {
  playerId: number
  playerName: string
  points: number
  rules: RulePoint[]
}

export interface ManagerRank {
  id: number
  roundId: number
  roundNumber: number
  pointsRound: number
  pointsTotal: number
  positionRound: number
  positionTotal: number
}

export interface Manager {
  id: number
  name: string
  shortName?: string
  firstName?: string
  lastName?: string
  teamValue?: number
  paymentState: string
  description?: string
  seasonId?: number
  seasonName?: string
  pointsTotal?: number
  pointsLastRound?: number
  positionTotal?: number
  positionLastRound?: number
  playerGoalkeeper?: Player
  playerDefender1?: Player
  playerDefender2?: Player
  playerDefender3?: Player
  playerMidfield1?: Player
  playerMidfield2?: Player
  playerMidfield3?: Player
  playerStriker1?: Player
  playerStriker2?: Player
  playerStriker3?: Player
  playerFreeChoice?: Player
  playerExchangedOld1?: Player
  playerExchangedOld2?: Player
  playerExchangedOld3?: Player
  playerExchangedNew1?: Player
  playerExchangedNew2?: Player
  playerExchangedNew3?: Player
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

export interface LoginRequest {
  login: string
  password: string
}

export interface RegisterRequest {
  login: string
  email: string
  password: string
  firstName?: string
  lastName?: string
}

export interface AuthResponse {
  token: string
  type: string
  login: string
  role: string
}

export interface AuthContextType {
  user: { login: string; role: string } | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => void
}

export interface ManagerInGroup {
  id: number
  name: string
  shortName?: string
  firstName?: string
  lastName?: string
  pointsTotal?: number
  pointsLastRound?: number
  positionTotal?: number
  positionLastRound?: number
}

export interface ManagerGroup {
  id: number
  name: string
  description?: string
  seasonId: number
  managers: ManagerInGroup[]
}