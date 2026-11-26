import { describe, expect, it } from 'vitest'
import { feedbackJson } from '../../test/feedbackFixtures'
import { meetingJson } from '../../test/helpers'
import { readMyFeedback, type MyFeedback } from '../feedback/feedbackData'
import { readMeeting, type Meeting } from './speakerData'
import { awaitingConfirmationText, caveats, computeImpact, emotionCounts, hoursLabel, schoolsLine, sinceLabel } from './speakerImpact'

const NOW = new Date('2026-11-24T08:00:00+01:00')
let next = 0

function meeting(overrides: Record<string, unknown>): Meeting {
  next += 1
  const read = readMeeting(meetingJson({ id: `d1200000-0000-4000-8000-${String(next).padStart(12, '0')}`, status: 'COMPLETED', ...overrides }))
  if (read === null) throw new Error('Rencontre illisible')
  return read
}

function slot(startAt: string, endAt: string) {
  return { id: `slot-${startAt}`, startAt, endAt }
}

function feedback(comment: string | null): MyFeedback {
  const read = readMyFeedback(feedbackJson('m', { comment }))
  if (read === null) throw new Error('Retour illisible')
  return read
}

const SOR = { name: 'Lycée de Sor', city: 'Saint-Louis', country: 'Sénégal' }
const PIKINE = { name: 'Lycée de Pikine', city: 'Pikine', country: 'Sénégal' }

describe('Mon impact : rencontres, établissements, élèves', () => {
  it('ne compte que les rencontres réalisées, et chaque classe une seule fois', () => {
    const impact = computeImpact(
      [
        meeting({ school: SOR, schoolClass: { title: 'Terminale S2', studentCount: 32 } }),
        meeting({ school: SOR, schoolClass: { title: 'Terminale S2', studentCount: 32 } }),
        meeting({ school: { ...SOR, name: 'lycee de sor' }, schoolClass: { title: 'terminale s2', studentCount: 32 } }),
        meeting({ school: SOR, schoolClass: { title: 'Première L', studentCount: 28 } }),
        meeting({ school: PIKINE, schoolClass: { title: 'Terminale S2', studentCount: 34 } }),
        meeting({ status: 'CONFIRMED', school: PIKINE, schoolClass: { title: 'Seconde', studentCount: 40 }, slot: slot('2026-11-30T10:00:00+01:00', '2026-11-30T11:00:00+01:00') }),
        meeting({ status: 'CANCELLED', school: PIKINE, schoolClass: { title: 'Seconde', studentCount: 40 } }),
      ],
      NOW,
    )
    expect(impact.completed).toBe(5)
    expect(impact.schools).toBe(2)
    expect(impact.studentsReached).toBe(32 + 28 + 34)
    expect(impact.classesWithoutCount).toBe(0)
  })

  it('fusionne deux classes homonymes d’une même école (effectif sous-estimé) et ignore un effectif absent', () => {
    const impact = computeImpact(
      [
        meeting({ school: SOR, schoolClass: { title: 'Terminale S2', studentCount: 30 } }),
        meeting({ school: SOR, schoolClass: { title: 'Terminale S2', studentCount: 32 } }),
        meeting({ school: PIKINE, schoolClass: { title: 'Première', studentCount: null } }),
      ],
      NOW,
    )
    expect(impact.studentsReached).toBe(32)
    expect(impact.classesWithoutCount).toBe(1)
    expect(caveats(impact)).toEqual(['Effectif inconnu pour 1 classe.'])
  })
})

describe('Mon impact : durées', () => {
  it('additionne les créneaux et calcule la moyenne, sans les créneaux illisibles', () => {
    const impact = computeImpact(
      [
        meeting({ slot: slot('2026-10-01T10:00:00+01:00', '2026-10-01T11:00:00+01:00') }),
        meeting({ slot: slot('2026-10-08T10:00:00+01:00', '2026-10-08T11:30:00+01:00') }),
        meeting({ slot: null }),
        meeting({ slot: slot('2026-10-09T10:00:00+01:00', '2026-10-09T09:00:00+01:00') }),
      ],
      NOW,
    )
    expect(impact.totalMinutes).toBe(150)
    expect(hoursLabel(impact.totalMinutes)).toBe('2 h 30')
    expect(impact.averageMinutes).toBe(75)
    expect(hoursLabel(75)).toBe('1 h 15')
    expect(impact.withoutDuration).toBe(2)
    expect(caveats(impact)).toEqual(['Durée inconnue pour 2 rencontres.'])
  })

  it('renvoie des valeurs vides sans rencontre réalisée', () => {
    const impact = computeImpact([], NOW)
    expect(impact).toMatchObject({ completed: 0, schools: 0, studentsReached: 0, totalMinutes: 0, averageMinutes: null, firstStart: null, awaitingConfirmation: 0 })
    expect(hoursLabel(0)).toBe('0 h')
    expect(sinceLabel(null)).toBeNull()
    expect(schoolsLine(0)).toBe('dans 0 établissement')
    expect(schoolsLine(5)).toBe('dans 5 établissements')
  })
})

describe('Mon impact : période et rencontres en attente', () => {
  it('date la première rencontre réalisée dans le fuseau du navigateur', () => {
    const impact = computeImpact(
      [
        meeting({ slot: slot('2026-10-20T10:00:00+01:00', '2026-10-20T11:00:00+01:00') }),
        // 23h30 UTC le 31 août = 0h30 le 1er septembre à Lagos.
        meeting({ slot: slot('2026-08-31T23:30:00Z', '2026-09-01T00:30:00Z') }),
        meeting({ status: 'CONFIRMED', slot: slot('2026-07-01T10:00:00+01:00', '2026-07-01T11:00:00+01:00') }),
      ],
      NOW,
    )
    expect(sinceLabel(impact.firstStart)).toBe('Depuis septembre 2026')
  })

  it('compte à part les rencontres confirmées au créneau passé, y compris après minuit', () => {
    const late = meeting({ status: 'CONFIRMED', slot: slot('2026-11-24T23:30:00+01:00', '2026-11-24T23:59:00+01:00') })
    const future = meeting({ status: 'CONFIRMED', slot: slot('2026-11-30T10:00:00+01:00', '2026-11-30T11:00:00+01:00') })
    const pending = meeting({ status: 'PENDING', slot: slot('2026-11-01T10:00:00+01:00', '2026-11-01T11:00:00+01:00') })
    expect(computeImpact([late, future, pending], new Date('2026-11-24T23:00:00+01:00')).awaitingConfirmation).toBe(0)
    expect(computeImpact([late, future, pending], new Date('2026-11-25T00:10:00+01:00')).awaitingConfirmation).toBe(1)
    expect(computeImpact([late, future, pending], new Date('2026-11-25T00:10:00+01:00')).completed).toBe(0)
    expect(awaitingConfirmationText(0)).toBeNull()
    expect(awaitingConfirmationText(1)).toBe('1 rencontre passée en attente de confirmation par la Fondation M, pas encore comptée.')
    expect(awaitingConfirmationText(3)).toBe('3 rencontres passées en attente de confirmation par la Fondation M, pas encore comptées.')
  })
})

describe('Mon impact : émotions', () => {
  it('compte les émotions de mes retours, triées par fréquence puis par ordre alphabétique', () => {
    const counts = emotionCounts([
      feedback('[Émotions] Fierté, Joie\n\n[Moment marquant] Un.'),
      feedback('[Émotions] Joie, Fierté, Fierté\n\n[Moment marquant] Deux.'),
      feedback('[Émotions] Utilité, Émerveillement\n\n[Moment marquant] Trois.'),
      feedback('[Émotions] Nostalgie\n\n[Moment marquant] Quatre.'),
      // Texte brut (étiquette inconnue) : aucune émotion lue.
      feedback('[Ressenti] Fierté'),
      feedback('Un très beau moment.'),
      feedback(null),
    ])
    expect(counts).toEqual([
      { label: 'Fierté', count: 2 },
      { label: 'Joie', count: 2 },
      { label: 'Émerveillement', count: 1 },
      { label: 'Nostalgie', count: 1 },
      { label: 'Utilité', count: 1 },
    ])
    expect(emotionCounts([])).toEqual([])
  })
})
