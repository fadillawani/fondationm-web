import { normalizeName } from '../../lib/normalize'

/** Villes placées sur la carte de la maquette : centre du cercle et étiquette. */
export interface MapCity {
  key: string
  name: string
  cx: number
  cy: number
  lx: number
  ly: number
  anchor: 'start' | 'middle'
  /** Étiquette en poids 900 taille 12 (Dakar, Saint-Louis). */
  major: boolean
}

function city(name: string, cx: number, cy: number, lx: number, ly: number, anchor: 'start' | 'middle', major = false): MapCity {
  return { key: normalizeName(name), name, cx, cy, lx, ly, anchor, major }
}

export const MAP_CITIES: readonly MapCity[] = [
  city('Saint-Louis', 67, 46, 85, 38, 'start', true),
  city('Louga', 83, 73, 98, 77, 'start'),
  city('Dakar', 10, 128, 10, 166, 'middle', true),
  city('Thiès', 48, 116, 50, 94, 'middle'),
  city('Touba', 104, 117, 119, 121, 'start'),
  city('Kaolack', 92, 159, 108, 163, 'start'),
  city('Tambacounda', 236, 181, 236, 160, 'middle'),
  city('Ziguinchor', 80, 250, 96, 242, 'start'),
]

export const MAP_COUNTRY = 'senegal'

/** r = min(21, 7,5 + 2,8·√n) (maquette). */
export function circleRadius(count: number): number {
  return Math.min(21, 7.5 + 2.8 * Math.sqrt(count))
}

/** Taille du nombre : 14 pour les grands cercles, 11 pour les moyens, 10 pour les petits. */
export function countFontSize(radius: number): number {
  if (radius >= 18) return 14
  if (radius >= 11) return 11
  return 10
}

export function isOnMap(name: string): boolean {
  const key = normalizeName(name)
  return MAP_CITIES.some((entry) => entry.key === key)
}
