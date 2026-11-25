import { describe, expect, it } from 'vitest'
import { SENEGAL_CITIES } from '../../lib/places'
import { MAP_CITIES } from './mapCities'

describe('Villes de la carte', () => {
  it('reprennent l’orthographe de la liste des villes du Sénégal', () => {
    for (const city of MAP_CITIES) expect(SENEGAL_CITIES).toContain(city.name)
    expect(MAP_CITIES).toHaveLength(8)
  })
})
