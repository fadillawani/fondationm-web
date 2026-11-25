import { describe, expect, it } from 'vitest'
import { COMPLETED_OLD, COMPLETED_RECENT, DEFAULT_STUDENT_MEETINGS, IN_FIVE_DAYS, LATER, OVERDUE, TOMORROW, studentMeetingJson } from '../../test/studentFixtures'
import { readStudentMeeting, type StudentMeeting } from './studentData'
import { defaultMeeting, greetingSentence, infoBox, relativeLabel, splitMeetings } from './studentModel'

const NOW = new Date('2026-11-24T08:00:00+01:00')

function read(json: unknown): StudentMeeting {
  const meeting = readStudentMeeting(json)
  if (meeting === null) throw new Error('Rencontre illisible')
  return meeting
}

const ALL = DEFAULT_STUDENT_MEETINGS.map(readStudentMeeting).filter((meeting): meeting is StudentMeeting => meeting !== null)

describe('Espace élève : lecture et tri', () => {
  it('ignore un statut inattendu et lit le reste de façon défensive', () => {
    expect(ALL.map((meeting) => meeting.id)).not.toContain('m-annulee')
    expect(readStudentMeeting({ id: 'x', status: 'PENDING', startAt: '2026-11-25T10:00:00+01:00' })).toBeNull()
    expect(readStudentMeeting({ id: 'x', status: 'CONFIRMED', startAt: 'pas une date' })).toBeNull()
    const bare = read({ id: 'x', status: 'CONFIRMED', startAt: '2026-11-25T10:00:00+01:00', speaker: null, format: null, place: null })
    expect(bare).toMatchObject({ speakerName: 'Intervenant', jobTitle: null, organization: null, skills: [], format: null, place: null })
    expect(Object.keys(bare)).not.toContain('motivation')
  })

  it('range les futures par date croissante, puis les confirmées au créneau passé, et les réalisées par date décroissante', () => {
    const lists = splitMeetings(ALL, NOW)
    expect(lists.upcoming.map((meeting) => meeting.id)).toEqual([TOMORROW.id, IN_FIVE_DAYS.id, LATER.id, OVERDUE.id])
    expect(lists.past.map((meeting) => meeting.id)).toEqual([COMPLETED_RECENT.id, COMPLETED_OLD.id])
  })

  it('choisit la future la plus proche, sinon la plus récente', () => {
    expect(defaultMeeting(ALL, NOW)?.id).toBe(TOMORROW.id)
    const withoutFuture = ALL.filter((meeting) => ![TOMORROW.id, IN_FIVE_DAYS.id, LATER.id].includes(meeting.id))
    expect(defaultMeeting(withoutFuture, NOW)?.id).toBe(OVERDUE.id)
    expect(defaultMeeting([], NOW)).toBeUndefined()
  })
})

describe('Espace élève : libellés relatifs', () => {
  it('dit « Aujourd’hui », « Demain », « Dans n jours » (2 à 13) puis la date seule', () => {
    const at = (startAt: string) => relativeLabel(read(studentMeetingJson({ id: 'x', startAt })), NOW)
    expect(at('2026-11-24T14:00:00+01:00')).toBe('Aujourd’hui')
    expect(at('2026-11-25T10:00:00+01:00')).toBe('Demain')
    expect(at('2026-11-26T10:00:00+01:00')).toBe('Dans 2 jours')
    expect(at('2026-12-07T10:00:00+01:00')).toBe('Dans 13 jours')
    expect(at('2026-12-08T10:00:00+01:00')).toBe('Mar 8 déc')
    expect(at('2026-11-23T10:00:00+01:00')).toBe('Hier')
    expect(at('2026-11-20T10:00:00+01:00')).toBe('Il y a 4 jours')
    expect(relativeLabel(read(COMPLETED_RECENT), NOW)).toBe('Vécue avec ta classe')
  })

  it('passe minuit : une rencontre de 23h30 devient « Hier » à 0h10, et sort des rencontres futures', () => {
    const late = read(studentMeetingJson({ id: 'tard', startAt: '2026-11-24T23:30:00+01:00', endAt: '2026-11-24T23:59:00+01:00' }))
    const evening = new Date('2026-11-24T23:00:00+01:00')
    const afterMidnight = new Date('2026-11-25T00:10:00+01:00')
    expect(relativeLabel(late, evening)).toBe('Aujourd’hui')
    expect(relativeLabel(late, afterMidnight)).toBe('Hier')
    expect(splitMeetings([late], afterMidnight).upcoming.map((meeting) => meeting.id)).toEqual(['tard'])
    expect(greetingSentence(splitMeetings([late], afterMidnight), afterMidnight)).toBe(
      'Pas de nouvelle rencontre prévue pour l’instant. Retrouve ici celles que ta classe a déjà vécues.',
    )
    expect(infoBox(late, afterMidnight).title).toBe('En attente de confirmation')
  })
})

describe('Espace élève : textes', () => {
  it('écrit une phrase d’accroche neutre selon la prochaine rencontre', () => {
    expect(greetingSentence(splitMeetings(ALL, NOW), NOW)).toBe('Demain, ta classe rencontre Awa Sarr, ingénieure data. Une belle occasion de découvrir son métier.')
    expect(greetingSentence(splitMeetings([read(IN_FIVE_DAYS)], NOW), NOW)).toBe('Dans 5 jours, ta classe rencontre Moussa Diop. Une belle occasion de découvrir un métier.')
    expect(greetingSentence(splitMeetings([read(LATER)], NOW), NOW)).toBe('Le lundi 14 décembre, ta classe rencontre Cheikh Sarr. Une belle occasion de découvrir un métier.')
    expect(greetingSentence(splitMeetings([read(COMPLETED_OLD)], NOW), NOW)).toBe(
      'Pas de nouvelle rencontre prévue pour l’instant. Retrouve ici celles que ta classe a déjà vécues.',
    )
    expect(greetingSentence(splitMeetings([], NOW), NOW)).toBe('Les rencontres de ta classe apparaîtront ici dès qu’elles seront confirmées.')
    expect(greetingSentence(splitMeetings(ALL, NOW), NOW)).not.toMatch(/Prête?|Prêt·e/)
  })

  it('choisit l’encart du détail sans rien promettre', () => {
    expect(infoBox(read(TOMORROW), NOW).title).toBe('Pour te préparer')
    expect(infoBox(read(TOMORROW), NOW).text).not.toMatch(/fort|forte|en ligne/i)
    expect(infoBox(read(OVERDUE), NOW)).toEqual({
      title: 'En attente de confirmation',
      text: 'Cette rencontre était prévue le vendredi 20 novembre. La Fondation M doit encore confirmer qu’elle a bien eu lieu.',
    })
    expect(infoBox(read(COMPLETED_RECENT), NOW).title).toBe('Ce que tu as vécu')
  })
})
