import { describe, expect, it } from 'vitest'
import { DEFAULT_FOUNDATION_MEETINGS } from '../../../test/foundationMeetingsFixtures'
import { readFoundationMeeting, type FoundationMeeting } from '../meetings/foundationMeetingsData'
import {
  actionsSentence,
  chartLabel,
  completionRate,
  meetingBuckets,
  momentTitle,
  periodBounds,
  periodQuery,
  ratingText,
  todayLabels,
} from './dashboardModel'

const NOW = new Date('2026-11-24T08:00:00+01:00')
const MEETINGS = DEFAULT_FOUNDATION_MEETINGS.map(readFoundationMeeting).filter((meeting): meeting is FoundationMeeting => meeting !== null)

describe('Tableau de bord : période', () => {
  it('calcule le trimestre civil et l’année, bornes avec décalage, `to` exclu', () => {
    expect(periodQuery(periodBounds('trimestre', NOW))).toEqual({ from: '2026-10-01T00:00:00+01:00', to: '2027-01-01T00:00:00+01:00' })
    expect(periodQuery(periodBounds('annee', NOW))).toEqual({ from: '2026-01-01T00:00:00+01:00', to: '2027-01-01T00:00:00+01:00' })
  })

  it('change de trimestre et d’année au 1er octobre et au 1er janvier', () => {
    expect(periodQuery(periodBounds('trimestre', new Date('2026-09-30T23:59:00+01:00'))).from).toBe('2026-07-01T00:00:00+01:00')
    expect(periodQuery(periodBounds('trimestre', new Date('2026-10-01T00:00:00+01:00')))).toEqual({
      from: '2026-10-01T00:00:00+01:00',
      to: '2027-01-01T00:00:00+01:00',
    })
    const newYear = new Date('2027-01-01T00:00:00+01:00')
    expect(periodQuery(periodBounds('trimestre', newYear))).toEqual({ from: '2027-01-01T00:00:00+01:00', to: '2027-04-01T00:00:00+01:00' })
    expect(periodQuery(periodBounds('annee', newYear))).toEqual({ from: '2027-01-01T00:00:00+01:00', to: '2028-01-01T00:00:00+01:00' })
    expect(periodQuery(periodBounds('annee', new Date('2026-12-31T23:59:00+01:00'))).from).toBe('2026-01-01T00:00:00+01:00')
  })
})

describe('Tableau de bord : calculs', () => {
  it('donne le taux de réalisation, « — » sans dénominateur', () => {
    expect(completionRate(MEETINGS, periodBounds('trimestre', NOW), NOW)).toEqual({ completed: 1, base: 2, rate: 50 })
    expect(completionRate([], periodBounds('trimestre', NOW), NOW)).toEqual({ completed: 0, base: 0, rate: null })
  })

  it('répartit les rencontres par mois du trimestre (3 mois) et par trimestre de l’année', () => {
    const quarter = meetingBuckets(MEETINGS, periodBounds('trimestre', NOW), NOW)
    expect(quarter.map((bucket) => [bucket.label, bucket.done, bucket.planned])).toEqual([
      ['Oct.', 0, 0],
      ['Nov.', 1, 4],
      ['Déc.', 0, 0],
    ])
    expect(chartLabel(quarter, 'trimestre')).toBe('Rencontres par mois : octobre 0, novembre 5 (1 réalisée, 4 prévues), décembre 0')
    expect(meetingBuckets(MEETINGS, periodBounds('annee', NOW), NOW).map((bucket) => bucket.label)).toEqual(['T1', 'T2', 'T3', 'T4'])
  })

  it('accorde la phrase de l’en-tête et nomme le moment selon sa date', () => {
    expect(actionsSentence(0)).toBe('Tout est à jour. Chaque validation a déjà rapproché des classes d’un métier.')
    expect(actionsSentence(1)).toBe('1 action vous attend. Chaque validation rapproche une classe d’un métier.')
    expect(actionsSentence(18)).toBe('18 actions vous attendent. Chaque validation rapproche une classe d’un métier.')
    expect(momentTitle('2026-11-20T10:00:00+01:00', NOW)).toBe('Le moment de la semaine')
    expect(momentTitle('2026-11-10T10:00:00+01:00', NOW)).toBe('Un moment marquant')
    expect(ratingText(4.33)).toBe('4,3 / 5')
    expect(ratingText(null)).toBe('—')
    expect(todayLabels(NOW)).toEqual({ long: 'Mardi 24 novembre 2026', short: 'Mardi 24 novembre' })
  })
})
