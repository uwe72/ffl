import type { PlayerRank } from '../types'

export interface GamePointsRow {
  roundNumber: number
  pointsRound?: number
  gameName: string
  opponent: string
  homeAway: string
  goalHost?: number
  goalVisitor?: number
  goalsOwn?: number
  goalsOpponent?: number
  rule: string
  ruleLabel: string
  count: number
  points: number
}

const SHORT_RULE_LABELS: Record<string, string> = {
  GOAL_STRIKER: 'Tor ST',
  GOAL_MIDFIELDER: 'Tor MF',
  GOAL_DEFENDER: 'Tor VT',
  TO_NULL_GOALKEEPER: 'Zu 0 TW',
  TO_NULL_DEFENDER: 'Zu 0 VT',
  GOAL_GOALKEEPER: 'Tor TW',
  GOAL_GOALKEEPER_BY_PENALTY: 'Tor TW (Elf.)',
}

export function shortRuleLabel(rule: string): string {
  return SHORT_RULE_LABELS[rule] ?? rule
}

export function splitGameName(gameName: string): { host: string; visitor: string } {
  const idx = gameName.indexOf(' - ')
  const host = idx >= 0 ? gameName.slice(0, idx) : gameName
  const visitor = idx >= 0 ? gameName.slice(idx + 3) : ''
  return { host, visitor }
}

export function buildGamePointsRows(ranks: PlayerRank[] | undefined): GamePointsRow[] {
  if (!ranks) return []

  const rows: GamePointsRow[] = []

  for (const rank of ranks) {
    if (!rank.played || !rank.rules) continue
    for (const rule of rank.rules) {
      if (!rule.points || rule.points <= 0) continue
      rows.push({
        roundNumber: rank.roundNumber,
        pointsRound: rank.pointsRound,
        gameName: rank.gameName ?? '',
        opponent: rank.opponent ?? '',
        homeAway: rank.homeAway ?? '',
        goalHost: rank.goalHost,
        goalVisitor: rank.goalVisitor,
        goalsOwn: rank.goalsOwn,
        goalsOpponent: rank.goalsOpponent,
        rule: rule.rule,
        ruleLabel: rule.ruleLabel,
        count: rule.count,
        points: rule.points,
      })
    }
  }

  return rows
}
