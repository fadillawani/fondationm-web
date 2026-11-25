import { describe, expect, it } from 'vitest'
import { SENEGAL_CITIES } from '../../lib/places'
import { MAP_CITIES, MAP_CITIES_NORTH_TO_SOUTH, hitArea, inscribedRadius } from './mapCities'

/** Échelle de la carte sur un téléphone de 360 px de large (environ 0,8 px par unité). */
const MOBILE_PX_PER_UNIT = 0.8

function inside(point: { x: number; y: number }, polygon: readonly { x: number; y: number }[]): boolean {
  let result = false
  polygon.forEach((a, index) => {
    const b = polygon[(index + polygon.length - 1) % polygon.length] ?? a
    if (a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) result = !result
  })
  return result
}

describe('Villes de la carte', () => {
  it('reprennent l’orthographe de la liste des villes du Sénégal', () => {
    for (const city of MAP_CITIES) expect(SENEGAL_CITIES).toContain(city.name)
    expect(MAP_CITIES).toHaveLength(8)
  })

  it('sont parcourues du nord au sud', () => {
    expect(MAP_CITIES_NORTH_TO_SOUTH.map((city) => city.name)).toEqual([
      'Saint-Louis', 'Louga', 'Thiès', 'Touba', 'Dakar', 'Kaolack', 'Tambacounda', 'Ziguinchor',
    ])
  })
})

describe('Zones de clic', () => {
  it('ne se chevauchent pas : chaque zone ne contient que sa ville', () => {
    for (const city of MAP_CITIES) {
      const area = hitArea(city)
      expect(inside({ x: city.cx, y: city.cy }, area)).toBe(true)
      const others = MAP_CITIES.filter((other) => other.key !== city.key)
      expect(others.filter((other) => inside({ x: other.cx, y: other.cy }, area))).toEqual([])
    }
  })

  it('sont coupées à la médiatrice entre Saint-Louis et Louga', () => {
    const saintLouis = MAP_CITIES.find((city) => city.name === 'Saint-Louis')
    const louga = MAP_CITIES.find((city) => city.name === 'Louga')
    if (!saintLouis || !louga) throw new Error('Villes absentes')
    const half = Math.hypot(louga.cx - saintLouis.cx, louga.cy - saintLouis.cy) / 2
    expect(inscribedRadius({ x: saintLouis.cx, y: saintLouis.cy }, hitArea(saintLouis))).toBeCloseTo(half, 1)
  })

  it('gardent au moins 24 px sur mobile (WCAG 2.5.8)', () => {
    for (const city of MAP_CITIES) {
      const diameter = 2 * inscribedRadius({ x: city.cx, y: city.cy }, hitArea(city)) * MOBILE_PX_PER_UNIT
      expect(diameter).toBeGreaterThanOrEqual(24)
    }
  })
})
