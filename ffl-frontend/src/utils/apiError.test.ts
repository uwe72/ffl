import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getApiErrorMessage } from './apiError.ts'
import { AxiosError, AxiosHeaders } from 'axios'

test('Fachliche Meldung aus dem Response-Body wird verwendet', () => {
  const err = new AxiosError(
    'Request failed with status code 400',
    '400',
    { headers: new AxiosHeaders() },
    {},
    { data: 'Datei darf maximal 100 MB groß sein', status: 400, statusText: 'Bad Request', headers: {}, config: { headers: new AxiosHeaders() } }
  )
  assert.equal(getApiErrorMessage(err, 'Unbekannter Fehler'), 'Datei darf maximal 100 MB groß sein')
})

test('Ohne Response-Body fällt der Fallback zurück', () => {
  const err = new AxiosError(
    'Network Error',
    undefined,
    { headers: new AxiosHeaders() },
    {}
  )
  assert.equal(getApiErrorMessage(err, 'Unbekannter Fehler'), 'Unbekannter Fehler')
})

test('Objekt-Response-Bodies werden nicht als Meldung verwendet', () => {
  const err = new AxiosError(
    'Request failed with status code 400',
    '400',
    { headers: new AxiosHeaders() },
    {},
    { data: { error: 'Fehler' }, status: 400, statusText: 'Bad Request', headers: {}, config: { headers: new AxiosHeaders() } }
  )
  assert.equal(getApiErrorMessage(err, 'Unbekannter Fehler'), 'Unbekannter Fehler')
})

test('Nicht-Axios-Fehler nutzt die Error-Message', () => {
  assert.equal(getApiErrorMessage(new Error('lokal'), 'Unbekannter Fehler'), 'lokal')
})

test('Nicht-Error-Werte nutzen den Fallback', () => {
  assert.equal(getApiErrorMessage(undefined, 'Unbekannter Fehler'), 'Unbekannter Fehler')
  assert.equal(getApiErrorMessage(null, 'Unbekannter Fehler'), 'Unbekannter Fehler')
})
