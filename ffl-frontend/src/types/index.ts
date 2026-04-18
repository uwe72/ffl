export interface SystemConfig {
  gmailSenderEmail?: string
  gmailAppPassword?: string
  gmailSmtpServer?: string
  gmailSmtpPort?: number
  openrouterApiKey?: string
  openrouterModel?: string
  matchdayMailPrompt?: string
}

export interface Season {
  id: number
  name: string
  budget: number
  seasonState: SeasonState
  finalRegistrationDate?: string
  startRoundRueckrunde?: number
  currentMatchday?: number
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
  nameKickerAlt1?: string
  nameKickerAlt2?: string
  nameKickerAlt3?: string
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
  positionTotal?: number
  pointsLastRound?: number
  positionChange?: number
}

export interface ManagerInfo {
  id: number
  name: string
  shortName?: string
  firstName?: string
  lastName?: string
  email?: string
  teamValue?: number
  paymentState?: string
  positionTotal?: number
  positionChange?: number
  pointsTotal?: number
  pointsLastRound?: number
  hinrunde: boolean
  rueckrunde: boolean
}

export type PaymentState = 'PAID' | 'NOT_PAID'

export interface RulePoint {
  rule: string
  ruleLabel: string
  count: number
  points: number
}

export interface PlayerRank {
  roundId: number
  roundNumber: number
  pointsRound: number
  pointsTotal: number
  positionTotal: number
  positionRound: number
  played: boolean
  gameName?: string
  goalHost?: number
  goalVisitor?: number
  rules?: RulePoint[]
}

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
  position?: string
  prize?: number
  teamName?: string
  teamLogoUrl?: string
  positionTotal?: number
  positionChange?: number
  pointsLastRound?: number
  pointsTotal?: number
  managerCount?: number
  pictureUrl?: string
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
  email?: string
  teamValue?: number
  paymentState: string
  description?: string
  seasonId?: number
  seasonName?: string
  pointsTotal?: number
  pointsLastRound?: number
  positionTotal?: number
  positionLastRound?: number
  positionChange?: number
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
  currentMatchday?: number
}

export interface ManagerInfo {
  id: number
  name: string
  shortName?: string
  seasonId: number
  seasonName: string
}

export interface User {
  id: number
  login: string
  email: string
  firstName?: string
  lastName?: string
  street?: string
  city?: string
  birthday?: string
  role: UserRole
  managers?: ManagerInfo[]
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
  refreshToken: string
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
  refreshAccessToken: () => Promise<boolean>
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
  createdById?: number
  createdByLogin?: string
  createdByFirstName?: string
  createdByLastName?: string
  emailTo?: 'ALL_MANAGERS' | 'CREATOR_ONLY'
  editable?: boolean
}

export interface ManagerGroupListDto {
  id: number
  name: string
  description?: string
  seasonId: number
  managerCount: number
  createdById?: number
  createdByLogin?: string
  createdByFirstName?: string
  createdByLastName?: string
}

export interface PositionStats {
  goalkeeper: number
  defender: number
  midfield: number
  striker: number
}

export interface RoundPointData {
  round: number
  pointsCumulative: number
}

export interface ManagerRoundStats {
  managerId: number
  managerName: string
  shortName?: string
  roundData: RoundPointData[]
}

export interface ManagerGroupRoundStats {
  groupId: number
  groupName: string
  managers: {
    managerId: number
    managerName: string
    shortName?: string
    firstName?: string
    lastName?: string
    login?: string
    isCurrentUser: boolean
    roundData: RoundPointData[]
  }[]
}

export interface Game {
  id: number
  name: string
  roundId: number
  roundNumber: number
  seasonId: number
  hostId: number
  hostName: string
  hostShortName?: string
  hostLogoUrl?: string
  visitorId: number
  visitorName: string
  visitorShortName?: string
  visitorLogoUrl?: string
  goalHost?: number
  goalVisitor?: number
  formation?: string
  formationExtern?: string
  formationIntern?: string
  importString?: string
  playersHost?: PlayerPoints[]
  playersVisitor?: PlayerPoints[]
}

export interface PlayerPoints {
  playerId: number
  playerName: string
  nameKickerAlt1?: string
  nameKickerAlt2?: string
  nameKickerAlt3?: string
  position?: string
  totalPoints: number
  rules: RulePoint[]
}

export interface GameImportResult {
  success: boolean
  errorMessage?: string
  missingPlayers?: MissingPlayer[]
  game?: Game
}

export interface MissingPlayer {
  playerName: string
  teamId?: number
  teamName: string
  isHost: boolean
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  hostPlayerCount: number
  visitorPlayerCount: number
  missingPlayers?: MissingPlayerInfo[]
}

export interface MissingPlayerInfo {
  playerName: string
  teamName: string
  teamId?: number
  host: boolean
}

export interface PlayerSearchDto {
  id: number
  nameKicker: string
  nameKickerAlt1?: string
  nameKickerAlt2?: string
  nameKickerAlt3?: string
  firstName?: string
  lastName?: string
  position?: string
  teams: Array<{ id: number; name: string }>
}

export interface RulePoint {
  rule: string
  ruleLabel: string
  count: number
  points: number
}