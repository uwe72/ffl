import type { Position, RulePoint } from '../types'

export type DashboardPhase = 'VORSAISON' | 'SAISON'

export interface SpielerAufstellung {
  id: number
  name: string
  firstName?: string
  lastName?: string
  vereinKuerzel: string
  vereinLogoUrl?: string
  pictureUrl?: string
  position: Position
  joker: boolean
  punkteGesamt: number
  punkteSpieltag: number
  positionTotal: number
  positionRound: number
  marktwert: number
  tore: number
  zuNull: number
  gespielt: boolean
  einsaetze: number
  einsatzquote?: number
  regeln?: RulePoint[]
}

export interface Aufstellung {
  phase: DashboardPhase
  spieltag: number
  teamname: string
  punkteGesamt: number | null
  punkteSpieltag: number | null
  positionGesamt: number | null
  positionSpieltag: number | null
  teilnehmer: number | null
  positionGesamtVorher: number | null
  positionSpieltagVorher: number | null
  punkteGesamtVorher: number | null
  punkteSpieltagVorher: number | null
  kaderwert: number
  budget: number
  spieler: SpielerAufstellung[]
}

export type PunkteModus = 'gesamt' | 'spieltag'
