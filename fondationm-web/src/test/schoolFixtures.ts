import { jsonResponse, makeMe, mockApi, pagedHandler } from './helpers'

/** Établissement validé de Dakar (Sénégal). */
export const schoolFullMe = makeMe({
  profile: {
    type: 'SCHOOL',
    schoolName: 'Lycée des Tisserands',
    city: 'Dakar',
    country: 'Sénégal',
    schoolType: 'HIGH_SCHOOL',
    referentRole: 'Proviseure',
  },
})

/** Intervenant de l'annuaire ; `formats` est propre au test (filtre `format` simulé). */
export type SpeakerJson = Record<string, unknown> & { id: string; fullName: string; formats: readonly string[] }

export function speakerJson(overrides: Partial<SpeakerJson> & { id: string; fullName: string }): SpeakerJson {
  return {
    city: 'Dakar',
    country: 'Sénégal',
    skills: [],
    availableSlotsCount: 1,
    nextSlotStartAt: '2026-11-30T09:30:00+01:00',
    jobTitle: null,
    organization: null,
    sector: null,
    motivation: null,
    formats: ['IN_PERSON', 'ONLINE'],
    ...overrides,
  }
}

export const AWA = speakerJson({
  id: 'e0000000-0000-4000-8000-000000000001',
  fullName: 'Awa Diallo',
  jobTitle: 'Ingénieure réseaux',
  organization: 'Sonatel',
  sector: 'DIGITAL',
  skills: ['Réseaux', 'Cybersécurité', 'Fibre optique', 'Télécoms'],
  availableSlotsCount: 3,
  motivation: 'Montrer aux élèves que les métiers du numérique leur sont ouverts.',
})
export const FATOU = speakerJson({
  id: 'e0000000-0000-4000-8000-000000000002',
  fullName: 'Fatou Sarr',
  jobTitle: 'Sage-femme',
  sector: 'HEALTH',
  skills: ['Santé maternelle'],
  nextSlotStartAt: null,
  availableSlotsCount: 0,
  formats: ['IN_PERSON'],
})
export const MOUSSA = speakerJson({
  id: 'e0000000-0000-4000-8000-000000000003',
  fullName: 'Moussa Ndiaye',
  city: 'Thiès',
  jobTitle: 'Comptable',
  sector: 'FINANCE',
  formats: ['ONLINE'],
})
export const AMINATA = speakerJson({
  id: 'e0000000-0000-4000-8000-000000000004',
  fullName: 'Aminata Ba',
  city: 'Saint-Louis',
  jobTitle: 'Menuisière',
  sector: 'CRAFTS',
  formats: ['IN_PERSON'],
})

export const DEFAULT_SPEAKERS = [AWA, FATOU, MOUSSA, AMINATA]

function normalize(value: unknown): string {
  return typeof value === 'string'
    ? value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    : ''
}

/** GET /api/school/speakers simulé : filtres city, country, sector, format, q, puis pagination. */
export function directoryHandler(speakers: () => readonly SpeakerJson[]) {
  return (request: Request): Response => {
    const query = new URL(request.url).searchParams
    const city = query.get('city')
    const country = query.get('country')
    const sector = query.get('sector')
    const format = query.get('format')
    const q = normalize(query.get('q'))
    const matching = speakers().filter(
      (speaker) =>
        (city === null || normalize(speaker.city) === normalize(city)) &&
        (country === null || normalize(speaker.country) === normalize(country)) &&
        (sector === null || speaker.sector === sector) &&
        (format === null || speaker.formats.includes(format)) &&
        (q === '' ||
          [speaker.fullName, speaker.jobTitle, ...(Array.isArray(speaker.skills) ? speaker.skills : [])].some((value) =>
            normalize(value).includes(q),
          )),
    )
    // Le champ `formats` n'existe pas dans le contrat : il n'est pas renvoyé.
    const items = matching.map(({ formats: _formats, ...speaker }) => speaker)
    return pagedHandler(() => items)(request)
  }
}

export const STATS = {
  total: 21,
  byCity: [
    { city: 'Dakar', country: 'Sénégal', count: 12 },
    { city: 'Thiès', country: 'Sénégal', count: 4 },
    { city: 'Saint-Louis', country: 'Sénégal', count: 3 },
    { city: 'Kaolack', country: 'Sénégal', count: 1 },
    { city: 'Mbour', country: 'Sénégal', count: 1 },
  ],
  bySector: [],
}

export const AWA_SLOTS = [
  { id: 'f0000000-0000-4000-8000-000000000001', startAt: '2026-11-30T09:30:00+01:00', endAt: '2026-11-30T11:00:00+01:00', formats: 'BOTH' },
  { id: 'f0000000-0000-4000-8000-000000000002', startAt: '2026-12-02T14:00:00+01:00', endAt: '2026-12-02T15:00:00+01:00', formats: 'ONLINE' },
  { id: 'f0000000-0000-4000-8000-000000000003', startAt: '2026-12-04T10:00:00+01:00', endAt: '2026-12-04T11:00:00+01:00', formats: 'IN_PERSON' },
]

export const CLASSES = [
  { id: 'a1000000-0000-4000-8000-000000000001', title: 'Terminale S2', fieldOfStudy: 'Scientifique', studentCount: 32, accountsCount: 0 },
  { id: 'a1000000-0000-4000-8000-000000000002', title: 'Première L', fieldOfStudy: 'Littéraire', studentCount: 28, accountsCount: 0 },
]

export function refusedMeeting(overrides: Record<string, unknown> = {}) {
  return {
    id: 'b1000000-0000-4000-8000-000000000001',
    status: 'REFUSED',
    closedBy: 'SPEAKER',
    reason: 'Indisponible.',
    refusedAt: '2026-11-22T10:00:00+01:00',
    speaker: { id: MOUSSA.id, fullName: 'Moussa Ndiaye', city: 'Thiès', country: 'Sénégal', skills: [] },
    schoolClass: { title: 'Terminale S2', studentCount: 32 },
    slot: { id: 'f0000000-0000-4000-8000-000000000009', startAt: '2026-11-26T10:00:00+01:00', endAt: '2026-11-26T11:00:00+01:00' },
    ...overrides,
  }
}

export interface SchoolStore {
  speakers: SpeakerJson[]
  slots: Record<string, unknown>[]
  classes: Record<string, unknown>[]
  refused: Record<string, unknown>[]
}

export function setupSchool(initial: Partial<SchoolStore> = {}, extra: Parameters<typeof mockApi>[0] = {}) {
  const store: SchoolStore = {
    speakers: [...DEFAULT_SPEAKERS],
    slots: [...AWA_SLOTS],
    classes: [...CLASSES],
    refused: [],
    ...initial,
  }
  const fetchMock = mockApi({
    'GET /api/me': () => jsonResponse(200, schoolFullMe),
    'GET /api/school/speakers': directoryHandler(() => store.speakers),
    'GET /api/school/speakers/stats': () => jsonResponse(200, STATS),
    'GET /api/school/meetings': pagedHandler(() => store.refused),
    'GET /api/school/classes': pagedHandler(() => store.classes),
    [`GET /api/school/speakers/${AWA.id}`]: () => {
      const { formats: _formats, ...summary } = AWA
      return jsonResponse(200, { ...summary, slots: store.slots })
    },
    ...extra,
  })
  const calls = (method: string, path: string) =>
    fetchMock.mock.calls.filter(([request]) => request.method === method && new URL(request.url).pathname === path)
  const queries = (path: string) =>
    calls('GET', path).map(([request]) => Object.fromEntries(new URL(request.url).searchParams))
  return { store, fetchMock, calls, queries }
}
