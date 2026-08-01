import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seasonStateLabel, DEFAULT_START_ROUND_RUECKRUNDE } from './season.ts'

test('BEFORE_SEASON wird als "Vor Saison" angezeigt', () => {
  assert.equal(seasonStateLabel('BEFORE_SEASON'), 'Vor Saison')
})

test('RUNNING_HINRUNDE wird als "Hinrunde" angezeigt', () => {
  assert.equal(seasonStateLabel('RUNNING_HINRUNDE'), 'Hinrunde')
})

test('RUNNING_RUECKRUNDE wird als "Rückrunde" angezeigt', () => {
  assert.equal(seasonStateLabel('RUNNING_RUECKRUNDE'), 'Rückrunde')
})

test('Ohne Saisonstatus gibt es kein Label', () => {
  assert.equal(seasonStateLabel(undefined), null)
  assert.equal(seasonStateLabel(null), null)
})

test('Die Phase haengt ausschliesslich am seasonState, nicht am Spieltag', () => {
  const stateFromDatabase = 'RUNNING_HINRUNDE'
  const currentMatchday = 34
  const startRoundRueckrunde = 16

  assert.ok(currentMatchday >= startRoundRueckrunde)
  assert.equal(seasonStateLabel(stateFromDatabase), 'Hinrunde')
})

test('Der fachliche Fehler (Winterwechsel-Hinweis mit dem Wort "Rueckrunde") tritt nicht mehr auf', () => {
  assert.notEqual(seasonStateLabel('RUNNING_HINRUNDE'), 'Rückrunde')
  assert.notEqual(seasonStateLabel('RUNNING_RUECKRUNDE'), 'Hinrunde')
})

test('Standardschwelle fuer den Start der Rueckrunde ist 18', () => {
  assert.equal(DEFAULT_START_ROUND_RUECKRUNDE, 18)
})
