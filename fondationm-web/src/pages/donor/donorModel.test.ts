import { describe, expect, it } from 'vitest'
import { donorFeedbackJson, donorRequestJson } from '../../test/donorFixtures'
import { readDonorFeedback, readDonorImpact, readDonorRequest, type DonorFeedback, type DonorRequest } from './donorData'
import { countText, feedbackSubject, findSentDuplicate, followUpSubject, ratingDetail, ratingText, sortFeedbacks, truncate } from './donorModel'

function feedback(json: Record<string, unknown> & { id: string }): DonorFeedback {
  const read = readDonorFeedback(donorFeedbackJson(json))
  if (read === null) throw new Error('Retour illisible')
  return read
}

function request(json: Record<string, unknown> & { id: string }): DonorRequest {
  const read = readDonorRequest(donorRequestJson(json))
  if (read === null) throw new Error('Requête illisible')
  return read
}

describe('Espace donateur : lecture et calculs', () => {
  it('lit l’impact de façon défensive : « — » pour un champ absent, « 0 » pour un zéro', () => {
    const impact = readDonorImpact({ completedMeetings: 0, averageRating: null })
    expect(countText(impact.completedMeetings)).toBe('0')
    expect(countText(impact.studentsReached)).toBe('—')
    expect(ratingText(impact.rating.overall)).toBe('—')
    expect(ratingText(4.56)).toBe('4,6 / 5')
    expect(ratingDetail({ overall: 4.3, school: null, speaker: 4 })).toBe('intervenants 4')
    expect(ratingDetail({ overall: 4.3, school: 4.5, speaker: 4 })).toBe('écoles 4,5 · intervenants 4')
    expect(ratingDetail({ overall: null, school: null, speaker: null })).toBeNull()
  })

  it('ignore un retour sans identifiant ou d’un rôle inconnu, et une note hors bornes', () => {
    expect(readDonorFeedback({ id: 'x', authorRole: 'DONOR' })).toBeNull()
    expect(readDonorFeedback({ authorRole: 'SCHOOL' })).toBeNull()
    expect(feedback({ id: 'x', rating: 9 }).rating).toBeNull()
  })

  it('trie par date de rencontre décroissante, puis publication, puis identifiant', () => {
    const sorted = sortFeedbacks([
      feedback({ id: 'b', meetingStartAt: '2026-10-20T10:00:00+01:00', publishedAt: '2026-11-01T10:00:00+01:00' }),
      feedback({ id: 'c', meetingStartAt: '2026-10-20T10:00:00+01:00', publishedAt: '2026-11-01T10:00:00+01:00' }),
      feedback({ id: 'a', meetingStartAt: '2026-11-06T10:00:00+01:00' }),
      feedback({ id: 'd', meetingStartAt: '2026-10-20T10:00:00+01:00', publishedAt: '2026-11-05T10:00:00+01:00' }),
    ])
    expect(sorted.map((item) => item.id)).toEqual(['a', 'd', 'b', 'c'])
  })

  it('préremplit les objets à 150 caractères au plus', () => {
    expect(feedbackSubject(feedback({ id: 'x', meetingStartAt: '2026-10-20T10:00:00+01:00', schoolCity: 'Pikine' }))).toBe('Retour du 20 octobre à Pikine')
    expect(followUpSubject(request({ id: 'x', subject: 'Bilan' }))).toBe('Complément : Bilan')
    expect(followUpSubject(request({ id: 'x', subject: 'y'.repeat(150) }))).toHaveLength(150)
    expect(truncate('abc', 3)).toBe('abc')
    expect(truncate('abcd', 3)).toBe('ab…')
  })

  it('ne retient une requête relue que si objet, message et date correspondent', () => {
    const startedAt = new Date('2026-11-24T08:00:00+01:00')
    const sent = { subject: 'Visite', message: 'Est-ce possible ?' }
    const before = request({ id: 'old', ...sent, createdAt: '2026-11-23T08:00:00+01:00' })
    const otherText = request({ id: 'other', subject: 'Visite', message: 'Autre', createdAt: '2026-11-24T08:01:00+01:00' })
    const same = request({ id: 'same', ...sent, createdAt: '2026-11-24T08:00:30+01:00' })
    expect(findSentDuplicate([before, otherText], sent, startedAt)).toBeNull()
    expect(findSentDuplicate([before, otherText, same], sent, startedAt)?.id).toBe('same')
    expect(findSentDuplicate([request({ id: 'nodate', ...sent, createdAt: null })], sent, startedAt)).toBeNull()
  })
})
