import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deriveSeasonPhase, DEFAULT_START_ROUND_RUECKRUNDE } from './season.ts'

test('Standardschwelle: Spieltag 1 bis 17 ist Hinrunde', () => {
  assert.equal(deriveSeasonPhase(1), 'Hinrunde')
  assert.equal(deriveSeasonPhase(17), 'Hinrunde')
})

test('Standardschwelle: ab Spieltag 18 ist Rückrunde', () => {
  assert.equal(deriveSeasonPhase(18), 'Rückrunde')
  assert.equal(deriveSeasonPhase(34), 'Rückrunde')
})

test('Der fachliche Fehler (Hinrunde bei Spieltag 34) tritt nicht mehr auf', () => {
  assert.notEqual(deriveSeasonPhase(34), 'Hinrunde')
})

test('Explizite startRoundRueckrunde übersteuert die Standardschwelle', () => {
  assert.equal(deriveSeasonPhase(16, 16), 'Rückrunde')
  assert.equal(deriveSeasonPhase(15, 16), 'Hinrunde')
})

test('Ohne Spieltag gibt es keine Phase', () => {
  assert.equal(deriveSeasonPhase(undefined), null)
  assert.equal(deriveSeasonPhase(null), null)
  assert.equal(deriveSeasonPhase(0), null)
})

test('Standardschwelle ist 18', () => {
  assert.equal(DEFAULT_START_ROUND_RUECKRUNDE, 18)
})

test('Die Schwelle wird aus der Konstante gelesen, nicht fest verdrahtet', () => {
  assert.equal(deriveSeasonPhase(DEFAULT_START_ROUND_RUECKRUNDE), 'Rückrunde')
  assert.equal(deriveSeasonPhase(DEFAULT_START_ROUND_RUECKRUNDE - 1), 'Hinrunde')
})
