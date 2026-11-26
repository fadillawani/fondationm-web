import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { errorResponse, jsonResponse, makeMe, pagedHandler, renderApp } from '../../../test/helpers'
import { setupFoundationMeetings, type Handler } from '../../../test/foundationMeetingsFixtures'
import { freezeNow } from '../../../test/speakerFixtures'

beforeEach(freezeNow)
afterEach(() => {
  vi.useRealTimers()
})

/** Réponse de `GET /api/foundation/indicators` (contrat FoundationIndicatorsResponse). */
function indicatorsJson(overrides: { snapshot?: boolean; studentsReached?: number } = {}) {
  return {
    period: { from: null, to: null },
    accounts: { schools: { pending: 2, validated: 10, rejected: 1 }, speakers: { pending: 3, validated: 20, rejected: 0 }, donors: 4 },
    meetings: {
      total: 62,
      byStatus: { PENDING: 9, CONFIRMED: 7, COMPLETED: 38, REFUSED: 5, CANCELLED: 3 },
      awaitingFoundation: 6,
      awaitingSpeaker: 5,
    },
    impact: { completedMeetings: 38, distinctClasses: 30, distinctSchools: 27, distinctSpeakers: 12, studentsReached: overrides.studentsReached ?? 1240 },
    feedbacks: { submittedCount: overrides.snapshot ? 4 : 12, publishedCount: 31, averageRating: { overall: 4.33, school: 4.5, speaker: null } },
    donorRequests: { openCount: 1, answeredCount: 3 },
  }
}

const OPEN_REQUEST = {
  id: 'd8000000-0000-4000-8000-000000000001',
  donor: { id: 'a8000000-0000-4000-8000-000000000001', name: 'M. Diaw' },
  subject: 'Bilan des rencontres à Saint-Louis',
  message: 'Pouvez-vous me partager le bilan ?',
  status: 'OPEN',
  response: null,
  createdAt: '2026-11-12T09:00:00+01:00',
  answeredAt: null,
}

function feedback(overrides: Record<string, unknown>) {
  return {
    id: 'fb000000-0000-4000-8000-000000000001',
    meeting: { id: 'm', slotStartAt: '2026-11-04T14:00:00+01:00' },
    school: { name: 'Lycée de Thiaroye', city: 'Dakar', country: 'Sénégal' },
    speaker: { fullName: 'Amadou Baila' },
    authorRole: 'SPEAKER',
    rating: 5,
    comment: 'Une élève m’a demandé si l’on peut être ingénieur en série L.',
    status: 'PUBLISHED',
    publishedAt: '2026-11-20T10:00:00+01:00',
    ...overrides,
  }
}

function setup({ feedbacks = [feedback({})], extra = {} }: { feedbacks?: unknown[]; extra?: Record<string, Handler> } = {}) {
  return setupFoundationMeetings({
    extra: {
      'GET /api/foundation/indicators': (request) => {
        const params = new URL(request.url).searchParams
        const snapshot = !params.has('from')
        return jsonResponse(200, indicatorsJson({ snapshot, studentsReached: params.get('from')?.startsWith('2026-01') ? 3870 : 1240 }))
      },
      'GET /api/foundation/donor-requests': pagedHandler(() => [OPEN_REQUEST]),
      'GET /api/foundation/feedbacks': pagedHandler(() => feedbacks),
      ...extra,
    },
  })
}

async function todo() {
  return within(await screen.findByRole('region', { name: /^À faire/ }))
}

describe('Tableau de bord (Fondation)', () => {
  it('salue l’équipe, date le jour et compte les actions', async () => {
    setup()
    renderApp('/fondation/tableau-de-bord', { token: true })

    expect(await screen.findByRole('heading', { level: 1, name: "Bonjour l'équipe" })).toBeInTheDocument()
    expect(screen.getAllByText('Mardi 24 novembre 2026').length).toBeGreaterThan(0)
    // 5 comptes + 6 demandes + 1 à marquer + 4 retours + 1 requête.
    expect(await screen.findAllByText('17 actions vous attendent. Chaque validation rapproche une classe d’un métier.')).not.toHaveLength(0)
  })

  it('présente les cartes « À faire » avec leurs liens et sous-lignes', async () => {
    setup()
    renderApp('/fondation/tableau-de-bord', { token: true })

    const cards = await todo()
    expect(await cards.findByRole('link', { name: /5\s*comptes à valider\s*2 écoles · 3 intervenants/ })).toHaveAttribute('href', '/fondation/comptes')
    expect(await cards.findByRole('link', { name: /6\s*demandes de rencontre\s*dont 1 en attente depuis 2 jours ou plus/ })).toHaveAttribute(
      'href',
      '/fondation/demandes',
    )
    expect(cards.getByRole('link', { name: /1\s*rencontres à marquer\s*passées, encore « confirmées »/ })).toHaveAttribute('href', '/fondation/rencontres')
    expect(cards.getByRole('link', { name: /4\s*retours à valider\s*avant partage aux donateurs/ })).toHaveAttribute('href', '/fondation/retours')
    expect(await cards.findByRole('link', { name: /1\s*requête donateur\s*M\. Diaw, depuis le 12 novembre/ })).toHaveAttribute('href', '/fondation/requetes')
  })

  it('affiche « Rien à traiter » et la phrase positive sans action', async () => {
    setupFoundationMeetings({
      meetings: [],
      extra: {
        'GET /api/foundation/indicators': () =>
          jsonResponse(200, {
            accounts: { schools: { pending: 0 }, speakers: { pending: 0 } },
            meetings: { byStatus: {}, awaitingFoundation: 0 },
            feedbacks: { submittedCount: 0, publishedCount: 0, averageRating: { overall: null } },
            donorRequests: { openCount: 0 },
          }),
        'GET /api/foundation/donor-requests': pagedHandler(() => []),
        'GET /api/foundation/feedbacks': pagedHandler(() => []),
      },
    })
    renderApp('/fondation/tableau-de-bord', { token: true })

    expect(await screen.findAllByText('Tout est à jour. Chaque validation a déjà rapproché des classes d’un métier.')).not.toHaveLength(0)
    expect((await todo()).getAllByText('Rien à traiter')).toHaveLength(5)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
    expect(screen.getByText('Aucune rencontre confirmée passée')).toBeInTheDocument()
    expect(screen.getByText('Aucune rencontre sur cette période.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /moment/i })).not.toBeInTheDocument()
  })

  it('montre les indicateurs de la période et change de période', async () => {
    const { calls } = setup()
    const { router, user } = renderApp('/fondation/tableau-de-bord', { token: true })

    expect(await screen.findByText('1 240')).toBeInTheDocument()
    expect(screen.getByText('ce trimestre · 27 établissements')).toBeInTheDocument()
    expect(screen.getByText('Effectif déclaré par les écoles, pas un comptage des présents.')).toBeInTheDocument()
    expect(screen.getByText('50 %')).toBeInTheDocument()
    expect(screen.getByText('1 réalisée sur 2 confirmées passées')).toBeInTheDocument()
    expect(screen.getByText('12 à valider')).toBeInTheDocument()
    expect(screen.getAllByText('4,3 / 5').length).toBeGreaterThan(0)
    const queries = calls('GET', '/api/foundation/indicators').map((request) => Object.fromEntries(new URL(request.url).searchParams))
    expect(queries).toContainEqual({})
    expect(queries).toContainEqual({ from: '2026-10-01T00:00:00+01:00', to: '2027-01-01T00:00:00+01:00' })

    const tabs = within(screen.getByRole('tablist', { name: 'Période' }))
    expect(tabs.getByRole('tab', { name: 'Ce trimestre' })).toHaveAttribute('aria-selected', 'true')
    tabs.getByRole('tab', { name: 'Ce trimestre' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(router.state.location.search).toBe('?periode=annee')
    expect(await screen.findByText('3 870')).toBeInTheDocument()
    expect(screen.getByText('depuis janvier · 27 établissements')).toBeInTheDocument()
  })

  it('décrit le graphique (libellé et tableau) et lie les statuts aux rencontres', async () => {
    setup()
    renderApp('/fondation/tableau-de-bord', { token: true })

    expect(await screen.findByRole('img', { name: 'Rencontres par mois : octobre 0, novembre 5 (1 réalisée, 4 prévues), décembre 0' })).toBeInTheDocument()
    const table = within(screen.getByRole('table'))
    expect(table.getByRole('rowheader', { name: 'novembre' }).parentElement).toHaveTextContent('novembre145')
    const status = within(screen.getByRole('region', { name: 'Rencontres par statut' }))
    expect(status.getByRole('link', { name: 'Réalisées : 38' })).toHaveAttribute('href', '/fondation/rencontres')
    expect(status.getAllByRole('link')).toHaveLength(5)
  })

  it('cite le retour publié le plus récent avec un commentaire', async () => {
    setup({
      feedbacks: [
        feedback({ id: 'a', comment: 'Ancien.', publishedAt: '2026-11-01T10:00:00+01:00' }),
        feedback({ id: 'b', comment: '   ', publishedAt: '2026-11-23T10:00:00+01:00' }),
        feedback({
          id: 'c',
          meeting: { id: 'm-thiaroye', slotStartAt: '2026-11-04T14:00:00+01:00' },
          authorRole: 'SCHOOL',
          comment: ['[Classe] 30 présents sur 32', '[Émotions] Fierté', '[Moment marquant] Nos élèves en parlent encore.'].join('\n\n'),
          publishedAt: '2026-11-21T10:00:00+01:00',
        }),
      ],
    })
    renderApp('/fondation/tableau-de-bord', { token: true })

    const moment = within(await screen.findByRole('region', { name: 'Le moment de la semaine' }))
    expect(moment.getByText('« Nos élèves en parlent encore. »')).toBeInTheDocument()
    expect(moment.getByText('Lycée de Thiaroye, après sa rencontre avec Amadou Baila')).toBeInTheDocument()
    expect(moment.getByRole('link', { name: 'Lire les retours' })).toHaveAttribute('href', '/fondation/retours?onglet=tous&rencontre=m-thiaroye')
  })

  it('isole l’erreur d’un bloc et propose « Réessayer »', async () => {
    setup({
      extra: {
        'GET /api/foundation/indicators': (request) =>
          new URL(request.url).searchParams.has('from') ? errorResponse(500, 'SERVER_ERROR') : jsonResponse(200, indicatorsJson({ snapshot: true })),
      },
    })
    renderApp('/fondation/tableau-de-bord', { token: true })

    const kpis = within(await screen.findByRole('region', { name: 'Indicateurs : ce trimestre' }))
    expect(await kpis.findByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
    expect(await (await todo()).findByRole('link', { name: /comptes à valider/ })).toBeInTheDocument()
  })

  it('renvoie un autre rôle vers son espace', async () => {
    setupFoundationMeetings({ me: makeMe() })
    const { router } = renderApp('/fondation/tableau-de-bord', { token: true })

    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/ecole/intervenants'))
  })
})
