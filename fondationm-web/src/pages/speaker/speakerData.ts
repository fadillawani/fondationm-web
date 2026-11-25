import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '../../api/client'
import { errorFromException, invalidResponseError } from '../../api/errors'
import { asRecord, integer, oneOf, recordList, text, type WireRecord } from '../../api/wire'

export const SLOT_STATUSES = ['AVAILABLE', 'CONFIRMED'] as const
export const SLOT_FORMATS = ['IN_PERSON', 'ONLINE', 'BOTH'] as const
export const MEETING_STATUSES = ['PENDING', 'CONFIRMED', 'REFUSED', 'CANCELLED', 'COMPLETED'] as const
export const DECISIONS = ['PENDING', 'VALIDATED', 'REFUSED'] as const
export const CLOSERS = ['SPEAKER', 'FOUNDATION', 'SYSTEM'] as const
export const MEETING_FORMATS = ['IN_PERSON', 'ONLINE'] as const

export type SlotStatus = (typeof SLOT_STATUSES)[number]
export type SlotFormats = (typeof SLOT_FORMATS)[number]
export type MeetingStatus = (typeof MEETING_STATUSES)[number]
export type Decision = (typeof DECISIONS)[number]
export type Closer = (typeof CLOSERS)[number]
export type MeetingFormat = (typeof MEETING_FORMATS)[number]

/** Taille demandée ; le serveur peut la plafonner (on suit alors `totalPages` qu'il renvoie). */
export const FETCH_PAGE_SIZE = 100
/** Limite de sécurité du parcours des pages. */
export const MAX_PAGES = 25

export interface Slot {
  id: string
  startAt: string
  endAt: string
  status: SlotStatus
  formats: SlotFormats
}

export interface Meeting {
  id: string
  status: MeetingStatus
  myDecision: Decision | null
  schoolName: string
  schoolCity: string
  schoolCountry: string
  classTitle: string
  studentCount: number | null
  slot: { id: string | null; startAt: string; endAt: string } | null
  closedBy: Closer | null
  reason: string | null
  createdAt: string | null
  format: MeetingFormat | null
  place: string | null
  message: string | null
}

export interface Collection<T> {
  items: T[]
  /** true si la limite de MAX_PAGES a été atteinte avant la dernière page. */
  truncated: boolean
}

export function readSlot(value: unknown): Slot | null {
  const record = asRecord(value)
  if (record === null) return null
  const id = text(record, 'id')
  const startAt = text(record, 'startAt')
  const endAt = text(record, 'endAt')
  const status = oneOf(SLOT_STATUSES, text(record, 'status'))
  if (id === null || startAt === null || endAt === null || status === null) return null
  return { id, startAt, endAt, status, formats: oneOf(SLOT_FORMATS, text(record, 'formats')) ?? 'BOTH' }
}

function readMeetingSlot(record: WireRecord | null): Meeting['slot'] {
  if (record === null) return null
  const startAt = text(record, 'startAt')
  const endAt = text(record, 'endAt')
  if (startAt === null || endAt === null) return null
  return { id: text(record, 'id'), startAt, endAt }
}

export function readMeeting(value: unknown): Meeting | null {
  const record = asRecord(value)
  if (record === null) return null
  const id = text(record, 'id')
  const status = oneOf(MEETING_STATUSES, text(record, 'status'))
  if (id === null || status === null) return null
  const school = asRecord(record.school)
  const schoolClass = asRecord(record.schoolClass)
  return {
    id,
    status,
    myDecision: oneOf(DECISIONS, text(record, 'myDecision')),
    schoolName: (school && text(school, 'name')) ?? 'Établissement',
    schoolCity: (school && text(school, 'city')) ?? '',
    schoolCountry: (school && text(school, 'country')) ?? '',
    classTitle: (schoolClass && text(schoolClass, 'title')) ?? '',
    studentCount: schoolClass && integer(schoolClass, 'studentCount'),
    slot: readMeetingSlot(asRecord(record.slot)),
    closedBy: oneOf(CLOSERS, text(record, 'closedBy')),
    reason: text(record, 'reason'),
    createdAt: text(record, 'createdAt'),
    format: oneOf(MEETING_FORMATS, text(record, 'format')),
    place: text(record, 'place'),
    message: text(record, 'message'),
  }
}

/** Parcourt toutes les pages (au plus MAX_PAGES). */
async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<unknown>,
  readItem: (value: unknown) => T | null,
): Promise<Collection<T>> {
  const items: T[] = []
  let page = 0
  let totalPages = 1
  while (page < totalPages && page < MAX_PAGES) {
    const record = asRecord(await fetchPage(page))
    if (record === null) throw invalidResponseError()
    const content = recordList(record, 'content')
    for (const entry of content) {
      const item = readItem(entry)
      if (item !== null) items.push(item)
    }
    totalPages = integer(record, 'totalPages') ?? (content.length === 0 ? 0 : page + 1)
    page += 1
  }
  return { items, truncated: page < totalPages }
}

const SPEAKER_KEY = ['speaker'] as const

export const slotsQuery = queryOptions({
  queryKey: [...SPEAKER_KEY, 'slots'],
  queryFn: () =>
    fetchAllPages(
      (page) =>
        unwrap(api.GET('/api/speaker/slots', { params: { query: { includePast: false, page, size: FETCH_PAGE_SIZE } } })),
      readSlot,
    ),
})

export const meetingsQuery = queryOptions({
  queryKey: [...SPEAKER_KEY, 'meetings'],
  queryFn: () =>
    fetchAllPages(
      (page) => unwrap(api.GET('/api/speaker/meetings', { params: { query: { page, size: FETCH_PAGE_SIZE } } })),
      readMeeting,
    ),
})

export function useSlots() {
  return useQuery(slotsQuery)
}

export function useMeetings(enabled = true) {
  return useQuery({ ...meetingsQuery, enabled })
}

/** Demande qui attend MA réponse. */
export function awaitsMyAnswer(meeting: Meeting): boolean {
  return meeting.status === 'PENDING' && meeting.myDecision === 'PENDING'
}

export function usePendingRequestCount(enabled: boolean): number | undefined {
  const meetings = useMeetings(enabled)
  return meetings.data?.items.filter(awaitsMyAnswer).length
}

export function errorCode(error: unknown): string {
  return errorFromException(error).code
}

export function isConflict(error: unknown): boolean {
  return errorFromException(error).status === 409
}

function useSpeakerMutation<T, R>(action: (variables: T) => Promise<R>) {
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: SPEAKER_KEY })
  return useMutation({
    mutationFn: action,
    onSuccess: refresh,
    onError: (error) => {
      if (isConflict(error)) void refresh()
    },
  })
}

export interface NewSlot {
  startAt: string
  endAt: string
  formats: SlotFormats
}

export function useCreateSlot() {
  return useSpeakerMutation(async (body: NewSlot) => readSlot(await unwrap(api.POST('/api/speaker/slots', { body }))))
}

export function useDeleteSlot() {
  return useSpeakerMutation(async (id: string) => {
    await unwrap(api.DELETE('/api/speaker/slots/{id}', { params: { path: { id } } }))
  })
}

export function useAcceptMeeting() {
  return useSpeakerMutation(async (id: string) =>
    readMeeting(await unwrap(api.POST('/api/speaker/meetings/{id}/accept', { params: { path: { id } } }))),
  )
}

export function useRefuseMeeting() {
  return useSpeakerMutation(async ({ id, reason }: { id: string; reason: string }) =>
    readMeeting(
      await unwrap(api.POST('/api/speaker/meetings/{id}/refuse', { params: { path: { id } }, body: { reason } })),
    ),
  )
}
