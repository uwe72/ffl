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
  marktwert: number
  tore: number
  zuNull: number
  regeln?: RulePoint[]
}

export interface Aufstellung {
  phase: DashboardPhase
  spieltag: number
  teamname: string
  punkteGesamt: number
  punkteSpieltag: number
  kaderwert: number
  budget: number
  spieler: SpielerAufstellung[]
}

export type PunkteModus = 'gesamt' | 'spieltag'
