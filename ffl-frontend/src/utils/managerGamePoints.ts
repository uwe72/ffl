import type { RoundDetail } from '../types'

export interface ManagerGamePointsRow {
  roundNumber: number
  gameName: string
  opponent: string
  homeAway: string
  goalHost?: number
  goalVisitor?: number
  goalsOwn?: number
  goalsOpponent?: number
  playerId: number
  playerName: string
  rule: string
  ruleLabel: string
  count: number
  points: number
}

export function buildManagerGamePointsRows(roundDetails: RoundDetail[] | undefined): ManagerGamePointsRow[] {
  if (!roundDetails) return []

  const rows: ManagerGamePointsRow[] = []

  for (const round of roundDetails) {
    if (!round.playerPoints) continue
    for (const pp of round.playerPoints) {
      if (!pp.rules) continue
      for (const rule of pp.rules) {
        if (!rule.points || rule.points <= 0) continue
        rows.push({
          roundNumber: round.roundNumber,
          gameName: pp.gameName ?? '',
          opponent: pp.opponent ?? '',
          homeAway: pp.homeAway ?? '',
          goalHost: pp.goalHost,
          goalVisitor: pp.goalVisitor,
          goalsOwn: pp.goalsOwn,
          goalsOpponent: pp.goalsOpponent,
          playerId: pp.playerId,
          playerName: pp.playerName,
          rule: rule.rule,
          ruleLabel: rule.ruleLabel,
          count: rule.count,
          points: rule.points,
        })
      }
    }
  }

  return rows
}
