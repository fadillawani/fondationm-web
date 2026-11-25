import { describe, expect, it } from 'vitest'
import {
  CANCELLED,
  COMPLETED,
  REFUSED_BY_US,
  REQUEST_SOR,
  REQUEST_YOFF,
  SLOT_TAKEN,
  TO_MARK,
  UPCOMING,
  VALIDATED_BY_US,
  DEFAULT_FOUNDATION_MEETINGS,
} from '../../../test/foundationMeetingsFixtures'
import { readFoundationMeeting, type FoundationMeeting } from './foundationMeetingsData'
import {
  calendarEntries,
  inRequestTab,
  isAwaitingFoundation,
  isToMark,
  plural,
  requestBadge,
  shortSchool,
  slotConflicts,
  waitingDays,
} from './foundationMeetingState'

const NOW = new Date('2026-11-24T08:00:00+01:00')

function read(json: unknown): FoundationMeeting {
  const meeting = readFoundationMeeting(json)
  if (meeting === null) throw new Error('Rencontre illisible')
  return meeting
}

const ALL = DEFAULT_FOUNDATION_MEETINGS.map(read)

function ids(tab: Parameters<typeof inRequestTab>[1]) {
  return ALL.filter((meeting) => inRequestTab(meeting, tab)).map((meeting) => meeting.id)
}

describe('Rencontres de la Fondation : règles calculées', () => {
  it('lit une réponse avec des null explicites et ignore une rencontre sans créneau', () => {
    const meeting = read({ ...REQUEST_SOR, reason: null, message: null, school: null, speaker: null })
    expect(meeting.schoolName).toBe('Établissement')
    expect(meeting.speakerSkills).toEqual([])
    expect(readFoundationMeeting({ ...REQUEST_SOR, slot: null })).toBeNull()
  })

  it('répartit les onglets (« À traiter » = PENDING + avis Fondation PENDING)', () => {
    expect(ids('a-traiter')).toEqual([REQUEST_SOR.id, REQUEST_YOFF.id])
    expect(ids('confirmees')).toEqual([TO_MARK.id, UPCOMING.id, COMPLETED.id])
    expect(ids('refusees')).toEqual([REFUSED_BY_US.id, SLOT_TAKEN.id, CANCELLED.id])
    expect(ids('toutes')).toHaveLength(9)
    expect(isAwaitingFoundation(read(VALIDATED_BY_US))).toBe(false)
  })

  it('distingue « Créneau pris » d’un refus et « Annulée »', () => {
    expect(requestBadge(read(SLOT_TAKEN)).label).toBe('Créneau pris')
    expect(requestBadge(read(REFUSED_BY_US)).label).toBe('Refusée')
    expect(requestBadge(read(CANCELLED)).label).toBe('Annulée')
    expect(requestBadge(read(COMPLETED)).label).toBe('Réalisée')
  })

  it('calcule « à marquer », l’attente et les conflits de créneau', () => {
    expect(ALL.filter((meeting) => isToMark(meeting, NOW)).map((meeting) => meeting.id)).toEqual([TO_MARK.id])
    expect(waitingDays(read(REQUEST_SOR), NOW)).toBe(4)
    expect(waitingDays(read(REQUEST_YOFF), NOW)).toBe(1)
    expect(waitingDays(read(UPCOMING), NOW)).toBeNull()
    expect(slotConflicts(read(REQUEST_SOR), ALL).map((meeting) => meeting.schoolName)).toEqual(['Lycée de Grand-Yoff'])
  })

  it('groupe les demandes PENDING d’un même créneau en une pastille', () => {
    const day = calendarEntries(ALL).get('2026-11-26') ?? []
    expect(day).toHaveLength(1)
    expect(day[0]?.meetings.map((meeting) => meeting.id)).toEqual([REQUEST_SOR.id, REQUEST_YOFF.id])
  })

  it('donne un nom court d’école et des pluriels corrects', () => {
    expect(shortSchool('Lycée de Sor')).toBe('Sor')
    expect(shortSchool('CEM Parcelles Assainies')).toBe('Parcelles')
    expect(shortSchool("Lycée d'Excellence")).toBe('Excellence')
    expect(plural(1, 'jour', 'jours')).toBe('1 jour')
    expect(plural(3, 'autre demande', 'autres demandes')).toBe('3 autres demandes')
  })
})
