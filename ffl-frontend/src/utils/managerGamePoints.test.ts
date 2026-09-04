import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildManagerGamePointsRows } from './managerGamePoints.ts'
import type { RoundDetail } from '../types'

function round(overrides: Partial<RoundDetail>): RoundDetail {
  return {
    roundId: 1,
    roundNumber: 1,
    pointsRound: 0,
    pointsTotal: 0,
    positionRound: 0,
    positionTotal: 0,
    playerPoints: [],
    ...overrides,
  }
}

test('Ohne RoundDetails gibt es keine Zeilen', () => {
  assert.deepEqual(buildManagerGamePointsRows(undefined), [])
  assert.deepEqual(buildManagerGamePointsRows([]), [])
})

test('Spieler ohne Regeln ergibt keine Zeile', () => {
  const details = [round({ roundNumber: 2, playerPoints: [{ playerId: 1, playerName: 'Spieler A', points: 0, rules: [] }] })]
  assert.deepEqual(buildManagerGamePointsRows(details), [])
})

test('Regeln mit null oder 0 Punkten werden uebersprungen', () => {
  const details = [
    round({
      playerPoints: [
        {
          playerId: 1,
          playerName: 'Spieler A',
          points: 0,
          rules: [
            { rule: 'X', ruleLabel: 'Ohne Punkte', count: 1, points: 0 },
            { rule: 'Y', ruleLabel: 'Null', count: 1, points: 0 },
          ],
        },
      ],
    }),
  ]
  assert.deepEqual(buildManagerGamePointsRows(details), [])
})

test('Zwei verschiedene Regeln eines Spielers ergeben zwei Zeilen mit Spieler und Spiel', () => {
  const details = [
    round({
      roundNumber: 1,
      playerPoints: [
        {
          playerId: 7,
          playerName: 'Kicker Star',
          points: 9,
          gameName: 'HSV - BVB',
          opponent: 'BVB',
          homeAway: 'H',
          goalHost: 2,
          goalVisitor: 0,
          goalsOwn: 2,
          goalsOpponent: 0,
          rules: [
            { rule: 'TO_NULL_DEFENDER', ruleLabel: 'Zu Null Verteidiger', count: 1, points: 2 },
            { rule: 'GOAL_DEFENDER', ruleLabel: 'Tor Verteidiger', count: 1, points: 7 },
          ],
        },
      ],
    }),
  ]
  assert.deepEqual(buildManagerGamePointsRows(details), [
    { roundNumber: 1, gameName: 'HSV - BVB', opponent: 'BVB', homeAway: 'H', goalHost: 2, goalVisitor: 0, goalsOwn: 2, goalsOpponent: 0, playerId: 7, playerName: 'Kicker Star', rule: 'TO_NULL_DEFENDER', ruleLabel: 'Zu Null Verteidiger', count: 1, points: 2 },
    { roundNumber: 1, gameName: 'HSV - BVB', opponent: 'BVB', homeAway: 'H', goalHost: 2, goalVisitor: 0, goalsOwn: 2, goalsOpponent: 0, playerId: 7, playerName: 'Kicker Star', rule: 'GOAL_DEFENDER', ruleLabel: 'Tor Verteidiger', count: 1, points: 7 },
  ])
})

test('Mehrere Spieler und Spieltage erzeugen Zeilen in Reihenfolge', () => {
  const details = [
    round({
      roundNumber: 3,
      playerPoints: [
        {
          playerId: 1,
          playerName: 'Spieler A',
          points: 3,
          gameName: 'FCB - S04',
          opponent: 'FCB',
          homeAway: 'A',
          goalsOwn: 0,
          goalsOpponent: 2,
          rules: [{ rule: 'GOAL_STRIKER', ruleLabel: 'Tor Stürmer', count: 1, points: 3 }],
        },
      ],
    }),
    round({
      roundNumber: 1,
      playerPoints: [
        {
          playerId: 2,
          playerName: 'Spieler B',
          points: 7,
          gameName: 'BVB - KOE',
          opponent: 'BVB',
          homeAway: 'H',
          goalsOwn: 3,
          goalsOpponent: 1,
          rules: [{ rule: 'GOAL_DEFENDER', ruleLabel: 'Tor Verteidiger', count: 1, points: 7 }],
        },
      ],
    }),
  ]
  const rows = buildManagerGamePointsRows(details)
  assert.equal(rows.length, 2)
  assert.equal(rows[0].roundNumber, 3)
  assert.equal(rows[0].playerName, 'Spieler A')
  assert.equal(rows[1].roundNumber, 1)
  assert.equal(rows[1].playerName, 'Spieler B')
})

test('Mehrere gleiche Regeln werden als Zeile mit Anzahl und Gesamtpunkten uebernommen', () => {
  const details = [
    round({
      playerPoints: [
        {
          playerId: 5,
          playerName: 'Spieler C',
          points: 15,
          rules: [{ rule: 'GOAL_MIDFIELDER', ruleLabel: 'Tor Mittelfeldspieler', count: 3, points: 15 }],
        },
      ],
    }),
  ]
  assert.deepEqual(buildManagerGamePointsRows(details), [
    { roundNumber: 1, gameName: '', opponent: '', homeAway: '', goalHost: undefined, goalVisitor: undefined, goalsOwn: undefined, goalsOpponent: undefined, playerId: 5, playerName: 'Spieler C', rule: 'GOAL_MIDFIELDER', ruleLabel: 'Tor Mittelfeldspieler', count: 3, points: 15 },
  ])
})
