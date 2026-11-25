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

/**
 * Zones de clic invisibles (Carte-Q2) : disque de 24 unités autour de chaque ville, découpé à la médiatrice avec
 * chaque ville voisine (zones disjointes). Sur mobile, la carte fait environ 0,8 px par unité : la paire la plus
 * proche (Saint-Louis–Louga, 31 unités) garde un cercle inscrit de 15,5 unités, soit plus de 24 px de diamètre.
 */
export const HIT_RADIUS = 24
const HIT_SIDES = 32

export interface Point {
  x: number
  y: number
}

/** Garde la partie du polygone située du côté de `own` par rapport à la médiatrice de [own, other]. */
function clipByBisector(polygon: readonly Point[], own: Point, other: Point): Point[] {
  const nx = other.x - own.x
  const ny = other.y - own.y
  const mx = (own.x + other.x) / 2
  const my = (own.y + other.y) / 2
  const side = (p: Point) => (p.x - mx) * nx + (p.y - my) * ny
  const result: Point[] = []
  polygon.forEach((current, index) => {
    const next = polygon[(index + 1) % polygon.length] ?? current
    const a = side(current)
    const b = side(next)
    if (a <= 0) result.push(current)
    if ((a < 0 && b > 0) || (a > 0 && b < 0)) {
      const t = a / (a - b)
      result.push({ x: current.x + t * (next.x - current.x), y: current.y + t * (next.y - current.y) })
    }
  })
  return result
}

export function hitArea(target: MapCity, cities: readonly MapCity[] = MAP_CITIES, radius = HIT_RADIUS): Point[] {
  const own = { x: target.cx, y: target.cy }
  let polygon: Point[] = Array.from({ length: HIT_SIDES }, (_, index) => {
    const angle = (2 * Math.PI * index) / HIT_SIDES
    return { x: own.x + radius * Math.cos(angle), y: own.y + radius * Math.sin(angle) }
  })
  for (const other of cities) {
    if (other.key === target.key) continue
    if (Math.hypot(other.cx - target.cx, other.cy - target.cy) < 2 * radius) {
      polygon = clipByBisector(polygon, own, { x: other.cx, y: other.cy })
    }
  }
  return polygon
}

/** Chemin SVG d'un polygone. */
export function polygonPath(points: readonly Point[]): string {
  return points.map((p, index) => `${index === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'
}

/** Rayon du cercle inscrit centré sur la ville (distance minimale du centre aux côtés). */
export function inscribedRadius(center: Point, polygon: readonly Point[]): number {
  let min = Number.POSITIVE_INFINITY
  polygon.forEach((a, index) => {
    const b = polygon[(index + 1) % polygon.length] ?? a
    const dx = b.x - a.x
    const dy = b.y - a.y
    const length = Math.hypot(dx, dy)
    if (length === 0) return
    min = Math.min(min, Math.abs(dx * (a.y - center.y) - dy * (a.x - center.x)) / length)
  })
  return min
}

/** Ordre de tabulation : du nord au sud. */
export const MAP_CITIES_NORTH_TO_SOUTH: readonly MapCity[] = MAP_CITIES.toSorted((a, b) => a.cy - b.cy || a.cx - b.cx)
