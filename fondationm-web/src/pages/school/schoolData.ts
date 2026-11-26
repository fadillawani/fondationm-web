import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '../../api/client'
import { invalidResponseError } from '../../api/errors'
import { FETCH_PAGE_SIZE, fetchAllPages } from '../../api/paging'
import { asRecord, integer, oneOf, recordList, text, textList } from '../../api/wire'
import { normalizeName } from '../../lib/normalize'
import { readPhotoUrl } from '../../lib/photo'
import { SECTORS, type Sector } from '../../lib/referenceData'

export type SlotFormats = 'IN_PERSON' | 'ONLINE' | 'BOTH'
export type MeetingFormat = 'IN_PERSON' | 'ONLINE'
const SLOT_FORMATS = ['IN_PERSON', 'ONLINE', 'BOTH'] as const satisfies readonly SlotFormats[]

export interface SpeakerSummary {
  id: string
  fullName: string
  city: string
  country: string
  skills: string[]
  availableSlotsCount: number
  nextSlotStartAt: string | null
  jobTitle: string
  organization: string
  sector: Sector | null
  motivation: string
  /** Photo (F13), facultative. */
  photoUrl: string | null
}

export interface AvailableSlot {
  id: string
  startAt: string
  endAt: string
  formats: SlotFormats
}

export interface SpeakerDetail extends SpeakerSummary {
  slots: AvailableSlot[]
}

export interface CityCount {
  city: string
  country: string
  count: number
}

export interface SpeakerStats {
  total: number
  byCity: CityCount[]
}

export interface SchoolClass {
  id: string
  title: string
  fieldOfStudy: string
  studentCount: number | null
}


function readSummaryFields(value: unknown): SpeakerSummary | null {
  const record = asRecord(value)
  if (record === null) return null
  const id = text(record, 'id')
  if (id === null) return null
  return {
    id,
    fullName: text(record, 'fullName') ?? 'Intervenant',
    city: text(record, 'city') ?? '',
    country: text(record, 'country') ?? '',
    skills: textList(record, 'skills'),
    availableSlotsCount: integer(record, 'availableSlotsCount') ?? 0,
    nextSlotStartAt: text(record, 'nextSlotStartAt'),
    jobTitle: text(record, 'jobTitle') ?? '',
    organization: text(record, 'organization') ?? '',
    sector: oneOf(SECTORS, text(record, 'sector')),
    motivation: text(record, 'motivation') ?? '',
    photoUrl: readPhotoUrl(record),
  }
}

export const readSpeakerSummary = readSummaryFields

export function readAvailableSlot(value: unknown): AvailableSlot | null {
  const record = asRecord(value)
  if (record === null) return null
  const id = text(record, 'id')
  const startAt = text(record, 'startAt')
  const endAt = text(record, 'endAt')
  if (id === null || startAt === null || endAt === null) return null
  return { id, startAt, endAt, formats: oneOf(SLOT_FORMATS, text(record, 'formats')) ?? 'BOTH' }
}

export function readSpeakerDetail(value: unknown): SpeakerDetail {
  const summary = readSummaryFields(value)
  const record = asRecord(value)
  if (summary === null || record === null) throw invalidResponseError()
  const slots = recordList(record, 'slots')
    .flatMap((slot) => readAvailableSlot(slot) ?? [])
    .toSorted((a, b) => a.startAt.localeCompare(b.startAt))
  return { ...summary, slots }
}

export function readStats(value: unknown): SpeakerStats {
  const record = asRecord(value)
  if (record === null) throw invalidResponseError()
  const byCity = recordList(record, 'byCity').flatMap((entry): CityCount[] => {
    const city = text(entry, 'city')
    const count = integer(entry, 'count')
    return city === null || count === null || count === 0 ? [] : [{ city, country: text(entry, 'country') ?? '', count }]
  })
  return { total: integer(record, 'total') ?? byCity.reduce((sum, entry) => sum + entry.count, 0), byCity }
}

export function readClass(value: unknown): SchoolClass | null {
  const record = asRecord(value)
  if (record === null) return null
  const id = text(record, 'id')
  if (id === null) return null
  return {
    id,
    title: text(record, 'title') ?? 'Classe sans nom',
    fieldOfStudy: text(record, 'fieldOfStudy') ?? '',
    studentCount: integer(record, 'studentCount'),
  }
}


/** Filtres de l'annuaire envoyés au serveur. */
export interface DirectoryFilter {
  city?: string
  country?: string
  sector?: Sector
  format?: MeetingFormat
  q?: string
}

const SCHOOL_KEY = ['school'] as const

export function directoryQuery(filter: DirectoryFilter) {
  return queryOptions({
    queryKey: [...SCHOOL_KEY, 'speakers', filter],
    queryFn: () =>
      fetchAllPages(
        (page) =>
          unwrap(api.GET('/api/school/speakers', { params: { query: { ...filter, page, size: FETCH_PAGE_SIZE } } })),
        readSpeakerSummary,
      ),
  })
}

export function useDirectory(filter: DirectoryFilter, enabled = true) {
  return useQuery({ ...directoryQuery(filter), enabled })
}

/**
 * Nombre d'intervenants par ville parmi ceux réellement chargés (chiffres de la carte sous filtres) : villes
 * comparées sans casse ni accents, pays compris s'il est fourni ; ordre décroissant puis alphabétique.
 */
export function countByCity(speakers: readonly SpeakerSummary[]): CityCount[] {
  const groups = new Map<string, CityCount>()
  for (const speaker of speakers) {
    if (!speaker.city) continue
    const key = `${normalizeName(speaker.city)}|${normalizeName(speaker.country)}`
    const entry = groups.get(key)
    if (entry) entry.count += 1
    else groups.set(key, { city: speaker.city, country: speaker.country, count: 1 })
  }
  return [...groups.values()].toSorted((a, b) => b.count - a.count || a.city.localeCompare(b.city, 'fr'))
}

export function useSpeakerStats() {
  return useQuery({
    queryKey: [...SCHOOL_KEY, 'stats'],
    queryFn: async () => readStats(await unwrap(api.GET('/api/school/speakers/stats'))),
  })
}

export function speakerDetailQuery(id: string) {
  return queryOptions({
    queryKey: [...SCHOOL_KEY, 'speaker', id],
    queryFn: async () =>
      readSpeakerDetail(await unwrap(api.GET('/api/school/speakers/{id}', { params: { path: { id } } }))),
  })
}

export function useSpeakerDetail(id: string) {
  return useQuery(speakerDetailQuery(id))
}

const CLASSES_KEY = [...SCHOOL_KEY, 'classes'] as const

export function useClasses() {
  return useQuery({
    queryKey: CLASSES_KEY,
    queryFn: () =>
      fetchAllPages(
        (page) => unwrap(api.GET('/api/school/classes', { params: { query: { page, size: FETCH_PAGE_SIZE } } })),
        readClass,
      ),
  })
}


export interface NewClass {
  title: string
  fieldOfStudy: string
  studentCount: number
}

export function useCreateClass() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: NewClass) => {
      const created = readClass(await unwrap(api.POST('/api/school/classes', { body })))
      if (created === null) throw invalidResponseError()
      return created
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLASSES_KEY }),
  })
}

export interface NewMeeting {
  classId: string
  slotId: string
  format: MeetingFormat
  place?: string
  message?: string
}

export function useCreateMeeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: NewMeeting) => {
      await unwrap(api.POST('/api/school/meetings', { body }))
    },
    // Créneaux de l'intervenant, annuaire (nombre de créneaux libres), rencontres de l'école.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SCHOOL_KEY }),
  })
}

export function useRefreshSpeaker(id: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: [...SCHOOL_KEY, 'speaker', id] })
}
