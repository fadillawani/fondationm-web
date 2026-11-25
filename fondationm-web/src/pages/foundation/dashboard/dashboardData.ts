import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '../../../api/client'
import { invalidResponseError } from '../../../api/errors'
import { asRecord, integer, recordList, text } from '../../../api/wire'
import { parseIso } from '../../../lib/dateTime'
import { MEETING_STATUSES, type FoundationMeetingStatus } from '../meetings/foundationMeetingsData'
import { periodQuery, type Period } from './dashboardModel'

/** `GET /api/foundation/indicators`, lu de façon défensive : compteur absent = 0, moyenne absente = null. */
export interface Indicators {
  schoolsPending: number
  speakersPending: number
  donors: number
  byStatus: Record<FoundationMeetingStatus, number>
  awaitingFoundation: number
  studentsReached: number
  distinctSchools: number
  completedMeetings: number
  submittedFeedbacks: number
  publishedFeedbacks: number
  ratingOverall: number | null
  ratingSchool: number | null
  ratingSpeaker: number | null
  openDonorRequests: number
}

function sub(record: Record<string, unknown> | null, key: string) {
  return record ? asRecord(record[key]) : null
}

function count(record: Record<string, unknown> | null, key: string): number {
  return (record && integer(record, key)) ?? 0
}

function rating(record: Record<string, unknown> | null, key: string): number | null {
  const value = record?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function readIndicators(value: unknown): Indicators {
  const record = asRecord(value)
  if (record === null) throw invalidResponseError()
  const accounts = sub(record, 'accounts')
  const meetings = sub(record, 'meetings')
  const byStatus = sub(meetings, 'byStatus')
  const impact = sub(record, 'impact')
  const feedbacks = sub(record, 'feedbacks')
  const average = sub(feedbacks, 'averageRating')
  const donorRequests = sub(record, 'donorRequests')
  return {
    schoolsPending: count(sub(accounts, 'schools'), 'pending'),
    speakersPending: count(sub(accounts, 'speakers'), 'pending'),
    donors: count(accounts, 'donors'),
    byStatus: Object.fromEntries(MEETING_STATUSES.map((status) => [status, count(byStatus, status)])) as Record<FoundationMeetingStatus, number>,
    awaitingFoundation: count(meetings, 'awaitingFoundation'),
    studentsReached: count(impact, 'studentsReached'),
    distinctSchools: count(impact, 'distinctSchools'),
    completedMeetings: count(impact, 'completedMeetings'),
    submittedFeedbacks: count(feedbacks, 'submittedCount'),
    publishedFeedbacks: count(feedbacks, 'publishedCount'),
    ratingOverall: rating(average, 'overall'),
    ratingSchool: rating(average, 'school'),
    ratingSpeaker: rating(average, 'speaker'),
    openDonorRequests: count(donorRequests, 'openCount'),
  }
}

const INDICATORS_KEY = ['foundation', 'indicateurs'] as const

/** Sans période : instantanés « À faire » ; avec période : indicateurs de la période. */
export function useIndicators(period: Period | null) {
  const query = period ? periodQuery(period) : null
  return useQuery({
    queryKey: [...INDICATORS_KEY, query?.from ?? null, query?.to ?? null],
    queryFn: async () =>
      readIndicators(await unwrap(api.GET('/api/foundation/indicators', { params: { query: query ?? {} } }))),
  })
}

export interface Moment {
  comment: string
  author: string
  context: string
  publishedAt: string | null
}

/**
 * Retour PUBLIÉ le plus récent qui a un commentaire, cherché dans la première page de 100 (le tri du serveur n'est
 * pas documenté) et choisi par `publishedAt` côté client.
 */
export function useLatestMoment() {
  return useQuery({
    queryKey: ['foundation', 'moment'],
    queryFn: async (): Promise<Moment | null> => {
      const record = asRecord(
        await unwrap(api.GET('/api/foundation/feedbacks', { params: { query: { status: 'PUBLISHED', page: 0, size: 100 } } })),
      )
      if (record === null) throw invalidResponseError()
      const moments = recordList(record, 'content').flatMap((entry): Moment[] => {
        const comment = text(entry, 'comment')?.trim()
        if (!comment || text(entry, 'status') !== 'PUBLISHED') return []
        const school = asRecord(entry.school)
        const speaker = asRecord(entry.speaker)
        const schoolName = (school && text(school, 'name')) ?? 'l’établissement'
        const speakerName = (speaker && text(speaker, 'fullName')) ?? 'l’intervenant'
        const bySchool = text(entry, 'authorRole') === 'SCHOOL'
        return [
          {
            comment,
            author: bySchool ? schoolName : speakerName,
            context: bySchool ? `après sa rencontre avec ${speakerName}` : `après sa rencontre au ${schoolName}`,
            publishedAt: text(entry, 'publishedAt'),
          },
        ]
      })
      const time = (moment: Moment) => parseIso(moment.publishedAt)?.getTime() ?? 0
      return moments.toSorted((a, b) => time(b) - time(a))[0] ?? null
    },
  })
}
