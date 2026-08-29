export interface EmailAddress {
  id: number
  email: string
}

export interface SystemConfig {
  gmailSenderEmail?: string
  gmailAppPassword?: string
  gmailSmtpServer?: string
  gmailSmtpPort?: number
  llmApiKey?: string
  llmModel?: string
  llmBaseUrl?: string
  matchdayMailPrompt?: string
  webUrl?: string
  autoUpdateEnabled?: boolean
  autoUpdateCron?: string
  autoUpdateSourceUrl?: string
  autoUpdateLastRun?: string
  lastPaypalCheck?: string
  lastUeberweisungCheck?: string
}

export interface TestMailResult {
  success: boolean
  message: string
  usedEmail: string
  usedPassword: string
  usedSmtpServer: string
  usedSmtpPort: number
}

export interface Season {
  id: number
  name: string
  budget: number
  seasonState: SeasonState
  finalRegistrationDate?: string
  seasonStartDate?: string
  seasonStartTime?: string
  startRoundRueckrunde?: number
  currentMatchday?: number
  spieleinsatzEuro?: number
  serverkostenEuro?: number
  anzahlSpielleiter?: number
  gewinnErsterPlatzProzent?: number
  gewinnLetzterPlatzEuro?: number
  mailText?: string
  invitationMailText?: string
  invitationMailSubject?: string
  paypalLink?: string
  bankName?: string
  iban?: string
  bic?: string
  kontoinhaber?: string
}

export type SeasonState = 'BEFORE_SEASON' | 'RUNNING_HINRUNDE' | 'RUNNING_RUECKRUNDE'

export interface SeasonHistory {
  id: number
  saison: string
  budget: number
  anzahlManager: number
}

export interface PublicSeasonInfo {
  id: number
  name: string
  budget: number
  seasonState: SeasonState
  finalRegistrationDate?: string
}

export interface InvitationPreview {
  seasonName: string
  startDateLong: string
  deadlineDate: string
  deadlineTime: string
  startRoundRueckrunde: string
  spieleinsatz: string
  serverkosten: string
  gewinnProzent: string
  gewinnLetzter: string
  anzahlSpielleiter: string
  budget: string
  webUrl?: string | null
  playersUrl?: string | null
  documentsUrl?: string | null
}

export interface PrizePayout {
  managerId: number
  managerName: string
  managerFirstName?: string
  managerLastName?: string
  managerEmail?: string
  position: number
  pointsTotal: number
  prizeAmount: number
  comment?: string
  payoutStatus: PayoutStatus
}

export interface PrizeDistributionLog {
  totalParticipants: number
  payingParticipants: number
  totalStakes: number
  serverCosts: number
  totalBudget: number
  numWinningRanks: number
  prizeFirstPlace: number
  prizeLastPlace: number
  curvatureFactor: number
  correctionAmount: number
  statisticsHtml: string
  calculatedAt: string
  basePrizes?: number[]
}

export interface MinP1ValidationResult {
  minP1Euro: number
  minP1Percent: number
  budget: number
  valid: boolean
}

export interface Team {
  calculatedAt: string
}

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
  kickerId?: string
  nameKickerAlt1?: string
  nameKickerAlt2?: string
  nameKickerAlt3?: string
  firstName?: string
  lastName?: string
  position: Position
  prize: number
  pictureUrl?: string
  aktiv?: boolean
  teams: Team[]
  season?: Season
  managerCount?: number
  managers?: ManagerInfo[]
  points?: number
  positionTotal?: number
  pointsLastRound?: number
  positionLastRound?: number
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
  positionTotal?: number
  positionChange?: number
  pointsTotal?: number
  pointsLastRound?: number
  hinrunde: boolean
  rueckrunde: boolean
}

export type PayoutStatus = 'PAID' | 'UNPAID'

export type PaymentMethod = 'PAYPAL' | 'UEBERWEISUNG' | 'OTHER'

export type DepositStatus = 'RECEIVED' | 'OPEN'

export interface Deposit {
  managerId: number
  managerName: string
  managerFirstName?: string
  managerLastName?: string
  managerLogin?: string
  managerEmail?: string
  amount: number
  comment?: string
  paymentMethod?: PaymentMethod
  depositStatus: DepositStatus
  receivedAt?: string
  spielleiter?: boolean
}

export interface DepositSyncResult {
  created: string[]
  deleted: string[]
  alreadyPresent: number
}

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
  login?: string
  userId?: number
  avatarUrl?: string
  teamValue?: number
  description?: string
  mailTheme?: MailTheme
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
  teamChangeCount?: number
}

export interface ManagerInfo {
  id: number
  name: string
  shortName?: string
  seasonId: number
  seasonName: string
}

export interface FriendTeam {
  id: number
  friendManagerId: number
  name?: string
  shortName?: string
  firstName?: string
  lastName?: string
  login?: string
  avatarUrl?: string
  position: number
  standard: boolean
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
  mailTheme?: MailTheme
  avatarUrl?: string
  slogan?: string
}

export type MailTheme = 'DARKMODE' | 'LIGHTMODE'

export type UserRole = 'ADMIN' | 'NORMAL' | 'GUEST'

export interface LoginRequest {
  login: string
  password: string
}

export interface RegisterRequest {
  login: string
  email: string
  password: string
  firstName: string
  lastName: string
  slogan?: string
  playerGoalkeeperId: number
  playerDefender1Id: number
  playerDefender2Id: number
  playerDefender3Id: number
  playerMidfield1Id: number
  playerMidfield2Id: number
  playerMidfield3Id: number
  playerStriker1Id: number
  playerStriker2Id: number
  playerStriker3Id: number
  playerFreeChoiceId: number
}

export interface UpdateLineupRequest {
  playerGoalkeeperId: number
  playerDefender1Id: number
  playerDefender2Id: number
  playerDefender3Id: number
  playerMidfield1Id: number
  playerMidfield2Id: number
  playerMidfield3Id: number
  playerStriker1Id: number
  playerStriker2Id: number
  playerStriker3Id: number
  playerFreeChoiceId: number
}

export interface WinterTransferRequest {
  transfers: { oldPlayerId: number; newPlayerId: number }[]
}

export interface UpdateManagerDetailsRequest {
  firstName?: string
  lastName?: string
  description?: string
  mailTheme?: string
}

export interface AuthResponse {
  token: string
  refreshToken: string
  type: string
  login: string
  role: string
}

export interface RegisterPaymentInfo {
  spieleinsatzEuro?: number
  paypalLink?: string
  iban?: string
  bic?: string
  bankName?: string
  kontoinhaber?: string
  seasonName?: string
}

export interface RegisterResponse {
  message: string
  paymentInfo?: RegisterPaymentInfo
}

export interface AuthContextType {
  user: { id?: number; login: string; role: string; firstName?: string; lastName?: string; avatarUrl?: string } | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginRequest) => Promise<void>
  register: (data: RegisterRequest, avatar?: File) => Promise<RegisterResponse>
  logout: () => void
  refreshAccessToken: () => Promise<boolean>
  updateAvatarUrl: (url: string | null) => void
  updateProfileInfo: (info: { firstName?: string; lastName?: string }) => void
}

export interface ManagerInGroup {
  id: number
  name: string
  shortName?: string
  firstName?: string
  lastName?: string
  login?: string
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
  hasLogo?: boolean
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
  hasLogo?: boolean
  emailTo?: string
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
  pictureUrl?: string
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
  pictureUrl?: string
  teams: Array<{ id: number; name: string }>
}

export interface RulePoint {
  rule: string
  ruleLabel: string
  count: number
  points: number
}

export interface BestTeamPlayer {
  id: number
  name: string
  position: string
  points: number
  prize: number
  teamName: string
  teamLogoUrl?: string
  pictureUrl?: string
  freeChoice: boolean
}

export interface BestTeamResult {
  players: BestTeamPlayer[]
  totalPoints: number
  totalCost: number
  formation: string
  budget: number
}

export interface Document {
  id: number
  filename: string
  contentType: string
  fileSize: number
  uploadedAt: string
  uploadedBy: string
}

export interface SetupPreviewTeamBreakdown {
  name: string
  players: number
  hasGoalkeeper: boolean
  hasDefender: boolean
  hasMidfield: boolean
  hasStriker: boolean
}

export interface SetupPreviewDto {
  teamCount: number
  playersTotal: number
  gamesTotal: number
  playersPerPosition: Record<string, number>
  teamBreakdown: SetupPreviewTeamBreakdown[]
}