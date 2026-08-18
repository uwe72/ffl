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

export interface RanglistenEintrag {
  managerId: number
  platz: number
  veraenderung: number
  teamname: string
  managername: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
  punkteGesamt: number
  punkteSpieltag: number
  kaderwert?: number
  abstandZuMir: number
  istIch: boolean
}

export interface VerteilungEintrag {
  von: number
  bis: number
  anzahl: number
}

export interface Rangliste {
  phase: DashboardPhase
  spieltag: number
  teilnehmer: number
  preisgeldGrenzePlatz: number | null
  abstandZuPlatzEins: number | null
  abstandZurPreisgeldGrenze: number | null
  eintraege: RanglistenEintrag[]
  verteilung: VerteilungEintrag[] | null
  eigenerWert: number | null
  hatOben: boolean
  hatUnten: boolean
}

export type PunkteModus = 'gesamt' | 'spieltag'
export type StatAnsicht = 'feld' | 'rangliste'
