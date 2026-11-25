import { jsonResponse, makeMe, mockApi, pagedHandler } from './helpers'

type Handler = Parameters<typeof mockApi>[0][string]

export const donorMe = makeMe({
  id: '7f1c2a9e-0000-4000-8000-0000000000d0',
  email: 'mecene@exemple.test',
  role: 'DONOR',
  profile: { type: 'DONOR', name: 'Ousmane Diaw' },
})

/** Réponse de `GET /api/donor/impact` (contrat DonorImpactResponse). */
export function impactJson(overrides: Record<string, unknown> = {}) {
  return {
    period: { from: null, to: null },
    completedMeetings: 38,
    distinctClasses: 30,
    distinctSchools: 27,
    distinctSpeakers: 31,
    studentsReached: 1240,
    publishedFeedbacksCount: 3,
    averageRating: { overall: 4.6, school: null, speaker: 4.6 },
    ...overrides,
  }
}

export function donorFeedbackJson(overrides: Record<string, unknown> & { id: string }) {
  return {
    authorRole: 'SPEAKER',
    rating: 4,
    comment: 'Une très belle rencontre.',
    publishedAt: '2026-11-20T10:00:00+01:00',
    meetingStartAt: '2026-11-04T14:00:00+01:00',
    schoolCity: 'Saint-Louis',
    schoolCountry: 'Sénégal',
    ...overrides,
  }
}

export function donorRequestJson(overrides: Record<string, unknown> & { id: string }) {
  return {
    subject: 'Bilan des rencontres à Saint-Louis',
    message: 'Pouvez-vous me partager le bilan ?',
    status: 'OPEN',
    response: null,
    createdAt: '2026-11-12T09:00:00+01:00',
    answeredAt: null,
    ...overrides,
  }
}

export interface DonorSetup {
  impact?: (request: Request) => Response
  feedbacks?: Record<string, unknown>[]
  requests?: Record<string, unknown>[]
  extra?: Record<string, Handler>
  me?: unknown
}

/** Backend simulé de l'espace donateur : impact, retours publiés, requêtes (POST 201 par défaut). */
export function setupDonor({ impact, feedbacks = [], requests = [], extra = {}, me = donorMe }: DonorSetup = {}) {
  const store = { requests: [...requests] }
  const bodies: unknown[] = []
  let next = 0
  const fetchMock = mockApi({
    'GET /api/me': () => jsonResponse(200, me),
    'GET /api/donor/impact': impact ?? (() => jsonResponse(200, impactJson())),
    'GET /api/donor/feedbacks': pagedHandler(() => feedbacks),
    'GET /api/donor/requests': (request) => pagedHandler(() => store.requests)(request),
    'POST /api/donor/requests': async (request) => {
      const body = (await request.json()) as { subject: string; message: string }
      bodies.push(body)
      next += 1
      const created = donorRequestJson({ id: `d1000000-0000-4000-8000-${String(next).padStart(12, '0')}`, ...body, createdAt: '2026-11-24T08:00:00+01:00' })
      store.requests.unshift(created)
      return jsonResponse(201, created)
    },
    ...extra,
  })
  const calls = (method: string, path: string) =>
    fetchMock.mock.calls
      .map(([request]) => request)
      .filter((request) => request.method === method && new URL(request.url).pathname === path)
  const queries = (path: string) => calls('GET', path).map((request) => Object.fromEntries(new URL(request.url).searchParams))
  /** Consultations comptées par le serveur : appels impact + pages 0 des retours publiés. */
  const consultations = () =>
    calls('GET', '/api/donor/impact').length + queries('/api/donor/feedbacks').filter((query) => (query.page ?? '0') === '0').length
  return { store, bodies, fetchMock, calls, queries, consultations }
}
