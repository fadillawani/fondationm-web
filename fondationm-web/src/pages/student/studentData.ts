import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '../../api/client'
import { FETCH_PAGE_SIZE, fetchAllPages } from '../../api/paging'
import { asRecord, oneOf, text, textList } from '../../api/wire'
import { parseIso } from '../../lib/dateTime'
import { readPhotoUrl } from '../../lib/photo'

/** Seuls CONFIRMED et COMPLETED sont attendus (description du contrat) ; tout autre statut est ignoré (décision 110). */
const STATUSES = ['CONFIRMED', 'COMPLETED'] as const
const FORMATS = ['IN_PERSON', 'ONLINE'] as const

/** Rencontre de la classe de l'élève (`StudentMeetingResponse`, lue de façon défensive). */
export interface StudentMeeting {
  id: string
  status: (typeof STATUSES)[number]
  startAt: string
  endAt: string | null
  speakerName: string
  /** Photo de l'intervenant (F13), facultative. */
  speakerPhotoUrl: string | null
  city: string
  country: string
  skills: string[]
  /** Déclarés par le schéma de `SpeakerView` mais pas par sa description : affichés seulement s'ils sont présents. */
  jobTitle: string | null
  organization: string | null
  format: (typeof FORMATS)[number] | null
  place: string | null
}

export function readStudentMeeting(value: unknown): StudentMeeting | null {
  const record = asRecord(value)
  if (record === null) return null
  const id = text(record, 'id')
  const status = oneOf(STATUSES, text(record, 'status'))
  const startAt = text(record, 'startAt')
  if (id === null || status === null || startAt === null || parseIso(startAt) === null) return null
  const speaker = asRecord(record.speaker)
  // `motivation` n'est pas lue : texte écrit pour la Fondation, hors description du contrat (décision 113).
  return {
    id,
    status,
    startAt,
    endAt: text(record, 'endAt'),
    speakerName: (speaker && text(speaker, 'fullName')) ?? 'Intervenant',
    speakerPhotoUrl: readPhotoUrl(speaker),
    city: (speaker && text(speaker, 'city')) ?? '',
    country: (speaker && text(speaker, 'country')) ?? '',
    skills: speaker ? textList(speaker, 'skills') : [],
    jobTitle: speaker && text(speaker, 'jobTitle'),
    organization: speaker && text(speaker, 'organization'),
    format: oneOf(FORMATS, text(record, 'format')),
    place: text(record, 'place'),
  }
}

/** Toutes les rencontres de la classe, toutes les pages, sans filtre de statut. */
export function useStudentMeetings() {
  return useQuery({
    queryKey: ['student', 'meetings'],
    queryFn: () =>
      fetchAllPages(
        (page) => unwrap(api.GET('/api/student/meetings', { params: { query: { page, size: FETCH_PAGE_SIZE } } })),
        readStudentMeeting,
      ),
  })
}
