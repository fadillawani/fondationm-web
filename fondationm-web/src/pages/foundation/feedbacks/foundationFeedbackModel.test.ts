import { describe, expect, it } from 'vitest'
import { foundationFeedbackJson } from '../../../test/feedbackFixtures'
import { inTab, pairByMeeting, pairSteps, pairTitle, submittedCount } from './foundationFeedbackModel'
import { readFoundationFeedback, type FoundationFeedback } from './foundationFeedbacksData'

function read(json: unknown): FoundationFeedback {
  const feedback = readFoundationFeedback(json)
  if (feedback === null) throw new Error('Retour illisible')
  return feedback
}

const SOR_SCHOOL = read(foundationFeedbackJson({ id: 'a1', meetingId: 'sor', startAt: '2026-11-04T14:00:00+01:00' }))
const SOR_SPEAKER = read(foundationFeedbackJson({ id: 'a2', meetingId: 'sor', startAt: '2026-11-04T14:00:00+01:00', authorRole: 'SPEAKER', rating: 4 }))
const PIKINE = read(
  foundationFeedbackJson({ id: 'b1', meetingId: 'pikine', startAt: '2026-10-20T10:00:00+01:00', status: 'PUBLISHED', school: { name: 'Lycée de Pikine' } }),
)

describe('Retours (Fondation) : regroupement par rencontre', () => {
  it('lit les retours de façon défensive', () => {
    expect(readFoundationFeedback({ id: 'x', meeting: { id: 'm' }, authorRole: 'SCHOOL' })).toBeNull()
    expect(readFoundationFeedback({ id: 'x', meeting: { id: 'm' }, authorRole: 'DONOR', status: 'SUBMITTED' })).toBeNull()
    expect(read({ id: 'x', meeting: { id: 'm' }, authorRole: 'SPEAKER', status: 'SUBMITTED', rating: 9, school: null, speaker: null })).toMatchObject({
      rating: null,
      schoolName: 'Établissement',
      speakerName: 'Intervenant',
      comment: null,
    })
  })

  it('associe les deux retours d’une rencontre, la plus récente d’abord', () => {
    const pairs = pairByMeeting([PIKINE, SOR_SPEAKER, SOR_SCHOOL])
    expect(pairs.map((pair) => pair.meetingId)).toEqual(['sor', 'pikine'])
    const [sor, pikine] = pairs
    if (sor === undefined || pikine === undefined) throw new Error('Rencontres absentes')
    expect(sor.school?.id).toBe('a1')
    expect(sor.speaker?.id).toBe('a2')
    expect(pairTitle(sor)).toBe('Lycée de Sor × Aïssatou Diop')
    expect(pairSteps(pikine)).toEqual({ school: 'Validé', speaker: 'À rédiger' })
  })

  it('range les rencontres par onglet et compte les retours SUBMITTED', () => {
    const [sor, pikine] = pairByMeeting([SOR_SCHOOL, SOR_SPEAKER, PIKINE])
    if (sor === undefined || pikine === undefined) throw new Error('Rencontres absentes')
    expect([inTab(sor, 'a-valider'), inTab(sor, 'valides'), inTab(sor, 'tous')]).toEqual([true, false, true])
    expect([inTab(pikine, 'a-valider'), inTab(pikine, 'valides')]).toEqual([false, true])
    expect(submittedCount([SOR_SCHOOL, SOR_SPEAKER, PIKINE])).toBe(2)
  })
})
