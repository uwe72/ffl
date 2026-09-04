import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildGamePointsRows, shortRuleLabel } from './gamePoints.ts'
import type { PlayerRank } from '../types'

function rank(overrides: Partial<PlayerRank>): PlayerRank {
  return {
    roundId: 1,
    roundNumber: 1,
    pointsRound: 0,
    pointsTotal: 0,
    positionTotal: 0,
    positionRound: 0,
    played: true,
    opponent: '',
    homeAway: '',
    goalsOwn: undefined,
    goalsOpponent: undefined,
    rules: [],
    ...overrides,
  }
}

test('Ohne Ranks gibt es keine Zeilen', () => {
  assert.deepEqual(buildGamePointsRows(undefined), [])
  assert.deepEqual(buildGamePointsRows([]), [])
})

test('Ein Spiel ohne Punkte ergibt keine Zeile', () => {
  const ranks = [rank({ roundNumber: 2, played: true, rules: [] })]
  assert.deepEqual(buildGamePointsRows(ranks), [])
})

test('Regeln mit null oder 0 Punkten werden uebersprungen', () => {
  const ranks = [
    rank({
      rules: [
        { rule: 'X', ruleLabel: 'Ohne Punkte', count: 1, points: 0 },
        { rule: 'Y', ruleLabel: 'Null', count: 1, points: 0 },
      ],
    }),
  ]
  assert.deepEqual(buildGamePointsRows(ranks), [])
})

test('Zwei verschiedene Regeln in einem Spiel ergeben zwei Zeilen', () => {
  const ranks = [
    rank({
      roundNumber: 1,
      opponent: 'BVB',
      homeAway: 'H',
      goalsOwn: 2,
      goalsOpponent: 0,
      rules: [
        { rule: 'TO_NULL_DEFENDER', ruleLabel: 'Zu Null Verteidiger', count: 1, points: 2 },
        { rule: 'GOAL_DEFENDER', ruleLabel: 'Tor Verteidiger', count: 1, points: 7 },
      ],
    }),
  ]
  assert.deepEqual(buildGamePointsRows(ranks), [
    { roundNumber: 1, gameName: '', opponent: 'BVB', homeAway: 'H', goalHost: undefined, goalVisitor: undefined, goalsOwn: 2, goalsOpponent: 0, rule: 'TO_NULL_DEFENDER', ruleLabel: 'Zu Null Verteidiger', count: 1, points: 2 },
    { roundNumber: 1, gameName: '', opponent: 'BVB', homeAway: 'H', goalHost: undefined, goalVisitor: undefined, goalsOwn: 2, goalsOpponent: 0, rule: 'GOAL_DEFENDER', ruleLabel: 'Tor Verteidiger', count: 1, points: 7 },
  ])
})

test('Drei Tore eines Mittelfeldspielers ergeben eine Zeile mit Anzahl und Gesamtpunkten', () => {
  const ranks = [
    rank({
      rules: [{ rule: 'GOAL_MIDFIELDER', ruleLabel: 'Tor Mittelfeldspieler', count: 3, points: 15 }],
    }),
  ]
  assert.deepEqual(buildGamePointsRows(ranks), [
    { roundNumber: 1, gameName: '', opponent: '', homeAway: '', goalHost: undefined, goalVisitor: undefined, goalsOwn: undefined, goalsOpponent: undefined, rule: 'GOAL_MIDFIELDER', ruleLabel: 'Tor Mittelfeldspieler', count: 3, points: 15 },
  ])
})

test('Ungespielte Ranks werden ignoriert', () => {
  const ranks = [
    rank({ played: false, rules: [{ rule: 'GOAL_DEFENDER', ruleLabel: 'Tor Verteidiger', count: 1, points: 7 }] }),
  ]
  assert.deepEqual(buildGamePointsRows(ranks), [])
})

test('Mehrere Spieltage werden in Reihenfolge der Ranks uebernommen', () => {
  const ranks = [
    rank({
      roundNumber: 3,
      opponent: 'FCB',
      rules: [{ rule: 'GOAL_STRIKER', ruleLabel: 'Tor Stürmer', count: 1, points: 3 }],
    }),
    rank({
      roundNumber: 1,
      opponent: 'BVB',
      rules: [{ rule: 'GOAL_DEFENDER', ruleLabel: 'Tor Verteidiger', count: 1, points: 7 }],
    }),
  ]
  const rows = buildGamePointsRows(ranks)
  assert.equal(rows.length, 2)
  assert.equal(rows[0].roundNumber, 3)
  assert.equal(rows[0].opponent, 'FCB')
  assert.equal(rows[1].roundNumber, 1)
  assert.equal(rows[1].opponent, 'BVB')
})

test('shortRuleLabel liefert kompakte Kuerzel fuer alle Regeln', () => {
  assert.equal(shortRuleLabel('GOAL_STRIKER'), 'Tor ST')
  assert.equal(shortRuleLabel('GOAL_MIDFIELDER'), 'Tor MF')
  assert.equal(shortRuleLabel('GOAL_DEFENDER'), 'Tor VT')
  assert.equal(shortRuleLabel('TO_NULL_GOALKEEPER'), 'Zu 0 TW')
  assert.equal(shortRuleLabel('TO_NULL_DEFENDER'), 'Zu 0 VT')
  assert.equal(shortRuleLabel('GOAL_GOALKEEPER'), 'Tor TW')
  assert.equal(shortRuleLabel('GOAL_GOALKEEPER_BY_PENALTY'), 'Tor TW (Elf.)')
})

test('shortRuleLabel faellt fuer unbekannte Regeln auf das Original zurueck', () => {
  assert.equal(shortRuleLabel('UNBEKANNT'), 'UNBEKANNT')
})
