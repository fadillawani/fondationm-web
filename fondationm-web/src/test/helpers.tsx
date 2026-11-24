import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { vi } from 'vitest'
import type { components } from '../api/schema'
import { tokenStorage } from '../auth/tokenStorage'
import { createQueryClient } from '../lib/queryClient'
import { routes } from '../routes/routes'

type MeResponse = components['schemas']['MeResponse']
type Handler = (request: Request, init?: RequestInit) => Response | Promise<Response>

export const FAKE_TOKEN = 'jeton-factice-de-test'
export const FAKE_NEW_TOKEN = 'nouveau-jeton-factice-de-test'
export const FAKE_PASSWORD = 'valeur-factice'
export const FAKE_NEW_PASSWORD = 'nouvelle-valeur-factice'

export function recordBodies(bodies: unknown[], response: () => Response) {
  return async (request: Request): Promise<Response> => {
    bodies.push(await request.json())
    return response()
  }
}

export function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

export function errorResponse(status: number, code: string, headers: Record<string, string> = {}): Response {
  return jsonResponse(status, { code, message: `Message serveur ${code}`, fieldErrors: [] }, headers)
}

export function tokenResponse(): Response {
  return jsonResponse(200, { accessToken: FAKE_TOKEN, tokenType: 'Bearer', expiresIn: 28_800 })
}

export function hangingResponse(_request: Request, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('Abandon', 'AbortError')))
  })
}

export function makeMe(overrides: Partial<MeResponse> = {}): MeResponse {
  return {
    id: '7f1c2a9e-0000-4000-8000-000000000001',
    email: 'referent@ecole.test',
    role: 'SCHOOL',
    status: 'VALIDATED',
    mustChangePassword: false,
    createdAt: '2026-09-01T08:00:00Z',
    profile: { type: 'SCHOOL', schoolName: 'Lycée des Tisserands' },
    ...overrides,
  }
}

export const speakerMe = makeMe({
  email: 'intervenante@pro.test',
  role: 'SPEAKER',
  profile: { type: 'SPEAKER', fullName: 'Awa Diallo' },
})

export const foundationMe = {
  id: '7f1c2a9e-0000-4000-8000-000000000099',
  email: 'equipe@fondation.test',
  role: 'FOUNDATION',
  status: 'VALIDATED',
  rejectionReason: null,
  createdAt: '2026-09-01T08:00:00Z',
  profile: null,
  mustChangePassword: false,
} as const

type AccountJson = Record<string, unknown> & { id: string; role: string; status: string }

/** Comptes simulés de GET /api/foundation/accounts, filtrés par rôle et statut puis paginés. */
export function accountsHandler(accounts: () => readonly AccountJson[]) {
  return (request: Request): Response => {
    const query = new URL(request.url).searchParams
    const role = query.get('role')
    const status = query.get('status') ?? 'PENDING'
    const page = Number(query.get('page') ?? '0')
    const size = Number(query.get('size') ?? '20')
    const matching = accounts().filter((account) => account.role === role && account.status === status)
    return jsonResponse(200, {
      content: matching.slice(page * size, page * size + size),
      page,
      size,
      totalElements: matching.length,
      totalPages: Math.ceil(matching.length / size),
    })
  }
}

export function schoolAccount(overrides: Partial<AccountJson> = {}): AccountJson {
  return {
    id: 'a0000000-0000-4000-8000-000000000001',
    email: 'referent@ecole.test',
    role: 'SCHOOL',
    status: 'PENDING',
    rejectionReason: null,
    createdAt: '2026-11-20T12:00:00Z',
    decidedAt: null,
    profile: {
      type: 'SCHOOL',
      schoolName: 'Lycée des Tisserands',
      city: 'Dakar',
      country: 'Sénégal',
      schoolType: 'HIGH_SCHOOL',
      referentRole: 'Proviseure',
      phone: '+221 70 000 00 01',
      charterAcceptedAt: '2026-11-20T12:00:00Z',
    },
    ...overrides,
  }
}

export function speakerAccount(overrides: Partial<AccountJson> = {}): AccountJson {
  return {
    id: 'b0000000-0000-4000-8000-000000000001',
    email: 'intervenante@pro.test',
    role: 'SPEAKER',
    status: 'PENDING',
    rejectionReason: null,
    createdAt: '2026-11-21T09:00:00Z',
    decidedAt: null,
    profile: {
      type: 'SPEAKER',
      fullName: 'Awa Diallo',
      city: 'Thiès',
      country: 'Sénégal',
      skills: ['Réseaux', 'Cybersécurité'],
      jobTitle: 'Ingénieure réseaux',
      organization: null,
      sector: 'DIGITAL',
      motivation: 'Montrer aux élèves que les métiers du numérique leur sont ouverts.',
      phone: '+221 70 000 00 02',
      charterAcceptedAt: '2026-11-21T09:00:00Z',
    },
    ...overrides,
  }
}

export function mockApi(handlers: Record<string, Handler>) {
  const fetchMock = vi.fn<(request: Request, init?: RequestInit) => Promise<Response>>(async (request, init) => {
    const key = `${request.method} ${new URL(request.url).pathname}`
    const handler = handlers[key]
    if (handler === undefined) throw new Error(`Appel non simulé : ${key}`)
    return handler(request, init)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

export function renderApp(path: string, options: { token?: boolean; advanceTimers?: (ms: number) => void } = {}) {
  if (options.token === true) tokenStorage.set(FAKE_TOKEN)
  const queryClient = createQueryClient()
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const user = userEvent.setup(options.advanceTimers ? { advanceTimers: options.advanceTimers } : {})

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return { router, queryClient, user }
}

export async function fillLoginForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^E-mail/), 'referent@ecole.test')
  await user.type(screen.getByLabelText(/^Mot de passe/), FAKE_PASSWORD)
  await user.click(screen.getByRole('button', { name: 'Se connecter' }))
}
