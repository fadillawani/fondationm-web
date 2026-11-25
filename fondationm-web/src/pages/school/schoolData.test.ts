import { describe, expect, it } from 'vitest'
import { countByCity, type SpeakerSummary } from './schoolData'

function speaker(id: string, city: string, country = 'Sénégal'): SpeakerSummary {
  return {
    id,
    fullName: id,
    city,
    country,
    skills: [],
    availableSlotsCount: 0,
    nextSlotStartAt: null,
    jobTitle: '',
    organization: '',
    sector: null,
    motivation: '',
  }
}

describe('countByCity', () => {
  it('compte par ville sans casse ni accents, en ordre décroissant', () => {
    expect(
      countByCity([speaker('a', 'Thiès'), speaker('b', 'thies'), speaker('c', 'Dakar'), speaker('d', ''), speaker('e', 'Dakar', 'Mali')]),
    ).toEqual([
      { city: 'Thiès', country: 'Sénégal', count: 2 },
      { city: 'Dakar', country: 'Sénégal', count: 1 },
      { city: 'Dakar', country: 'Mali', count: 1 },
    ])
  })
})
