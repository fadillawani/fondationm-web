import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { errorResponse, jsonResponse, renderApp } from '../../../test/helpers'
import {
  CANCELLED,
  COMPLETED,
  DEFAULT_FOUNDATION_MEETINGS,
  REQUEST_SOR,
  TO_MARK,
  UPCOMING,
  foundationMeetingJson,
  setupFoundationMeetings,
} from '../../../test/foundationMeetingsFixtures'
import { freezeNow } from '../../../test/speakerFixtures'

beforeEach(freezeNow)
afterEach(() => {
  vi.useRealTimers()
})

function panel() {
  return within(screen.getByRole('complementary', { name: 'Détail de la rencontre' }))
}

async function calendar() {
  return within(await screen.findByRole('table', { name: 'Calendrier de Novembre 2026' }))
}

describe('Rencontres (Fondation)', () => {
  it('signale la rencontre passée encore confirmée et la sélectionne par défaut', async () => {
    setupFoundationMeetings()
    renderApp('/fondation/rencontres', { token: true })

    const banner = within(await screen.findByRole('region', { name: 'Rencontres à marquer' }))
    expect(banner.getByText(/1 rencontre passée/)).toBeInTheDocument()
    expect(banner.getByText(/est encore « confirmée »\. Ont-elles bien eu lieu \?/)).toBeInTheDocument()
    expect(banner.getByRole('button', { name: '17 nov · Kaffrine × Awa' })).toBeInTheDocument()

    expect(screen.getAllByText('Suivi').length).toBeGreaterThan(0)
    expect(panel().getByRole('heading', { name: 'Lycée de Kaffrine (Kaffrine)' })).toBeInTheDocument()
    expect(panel().getByText('À marquer')).toBeInTheDocument()
    expect(panel().getByText(/La date est passée\. La rencontre a-t-elle bien eu lieu \?/)).toBeInTheDocument()
    expect(panel().getByText('En classe · Salle 4')).toBeInTheDocument()
  })

  it('accorde le bandeau au pluriel', async () => {
    const second = foundationMeetingJson({
      ...TO_MARK,
      id: 'f7000000-0000-4000-8000-0000000000b1',
      start: '2026-11-10T10:00:00+01:00',
      end: '2026-11-10T11:00:00+01:00',
      school: { name: 'Lycée de Bambey', city: 'Bambey', country: 'Sénégal' },
    })
    setupFoundationMeetings({ meetings: [TO_MARK, second] })
    renderApp('/fondation/rencontres', { token: true })

    const banner = within(await screen.findByRole('region', { name: 'Rencontres à marquer' }))
    expect(banner.getByText(/2 rencontres passées/)).toBeInTheDocument()
    expect(banner.getByText(/sont encore « confirmées »/)).toBeInTheDocument()
    expect(banner.getAllByRole('button')).toHaveLength(2)
  })

  it('affiche les pastilles du calendrier, dont « 2 demandes » sur un même créneau', async () => {
    setupFoundationMeetings()
    const { user } = renderApp('/fondation/rencontres', { token: true })
    const table = await calendar()

    expect(table.getByRole('button', { name: /17 novembre 2026, 10h00, Lycée de Kaffrine avec Awa Sarr, Confirmée, à marquer/ })).toHaveTextContent(
      '10h00 · Kaffrine × Awa',
    )
    const group = table.getByRole('button', { name: /2 demandes \(Lycée de Sor, Lycée de Grand-Yoff\) avec Amadou Baila, En attente/ })
    expect(group).toHaveTextContent('10h00 · 2 demandes × Amadou')
    const cancelled = table.getByRole('button', { name: /Lycée de Kolda .*Annulée/ })
    expect(cancelled.className).toContain('line-through')
    expect(within(screen.getByRole('list', { name: 'Légende' })).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'En attente',
      'Confirmée',
      'À marquer',
      'Réalisée',
      'Annulée / refusée',
    ])

    await user.click(group)
    expect(panel().getByRole('heading', { name: 'Lycée de Sor · Lycée de Grand-Yoff' })).toBeInTheDocument()
    expect(panel().getByText('Terminale S2 (32) ou Première S1 (41)')).toBeInTheDocument()
    expect(panel().getByText("Selon l'école retenue")).toBeInTheDocument()
    expect(panel().getByRole('link', { name: 'Donner mon avis sur la demande' })).toHaveAttribute(
      'href',
      `/fondation/demandes?demande=${REQUEST_SOR.id}`,
    )
  })

  it('marque une rencontre passée « Réalisée », recharge et ouvre les retours', async () => {
    const { bodies, calls } = setupFoundationMeetings()
    const { user } = renderApp('/fondation/rencontres', { token: true })
    await calendar()
    const before = calls('GET', '/api/foundation/meetings').length

    await user.click(panel().getByRole('button', { name: 'Marquer « Réalisée »' }))

    expect(await panel().findByText(/C'est noté ! Les retours d'expérience de l'école et de l'intervenant sont maintenant ouverts\./)).toBeInTheDocument()
    expect(bodies).toEqual([{ key: `complete ${TO_MARK.id}`, body: null }])
    expect(await panel().findAllByText('À rédiger')).toHaveLength(2)
    expect(calls('GET', '/api/foundation/feedbacks').map((request) => new URL(request.url).searchParams.get('meetingId'))).toContain(TO_MARK.id)
    await waitFor(() => expect(calls('GET', '/api/foundation/meetings').length).toBeGreaterThan(before))
    expect(screen.queryByRole('region', { name: 'Rencontres à marquer' })).not.toBeInTheDocument()
  })

  it('affiche l’erreur du serveur si « Réalisée » est refusé', async () => {
    setupFoundationMeetings({
      extra: { [`POST /api/foundation/meetings/${TO_MARK.id}/complete`]: () => jsonResponse(409, { code: 'MEETING_NOT_PAST', message: 'La rencontre n’est pas encore passée.' }) },
    })
    const { user } = renderApp('/fondation/rencontres', { token: true })
    await calendar()

    await user.click(panel().getByRole('button', { name: 'Marquer « Réalisée »' }))
    expect(await panel().findByRole('alert')).toHaveTextContent('La rencontre n’est pas encore passée.')
  })

  it('annule une rencontre à venir sans motif (chaîne vide), sans proposer « Réalisée »', async () => {
    const { bodies } = setupFoundationMeetings()
    const { user } = renderApp(`/fondation/rencontres?rencontre=${UPCOMING.id}`, { token: true })
    await calendar()

    expect(panel().getByText("Les deux parties ont validé. Vous pouvez encore l'annuler en cas d'imprévu.")).toBeInTheDocument()
    expect(panel().queryByRole('button', { name: 'Marquer « Réalisée »' })).not.toBeInTheDocument()
    await user.click(panel().getByRole('button', { name: 'Marquer « Annulée »' }))
    const form = within(screen.getByRole('form', { name: 'Annuler la rencontre' }))
    expect(form.getByRole('button', { name: 'Retour' })).toBeInTheDocument()
    await user.click(form.getByRole('button', { name: "Confirmer l'annulation" }))

    expect(await panel().findByText('Annulée par la Fondation M.')).toBeInTheDocument()
    expect(bodies).toEqual([{ key: `cancel ${UPCOMING.id}`, body: { reason: '' } }])
  })

  it('annule avec un motif et affiche l’erreur du serveur le cas échéant', async () => {
    const { bodies } = setupFoundationMeetings()
    const { user } = renderApp(`/fondation/rencontres?rencontre=${UPCOMING.id}`, { token: true })
    await calendar()

    await user.click(panel().getByRole('button', { name: 'Marquer « Annulée »' }))
    await user.type(screen.getByLabelText(/^Pourquoi l'annuler \?/), ' Lycée fermé ce jour-là. ')
    await user.click(screen.getByRole('button', { name: "Confirmer l'annulation" }))

    expect(await panel().findByText('Annulée par la Fondation M : Lycée fermé ce jour-là.')).toBeInTheDocument()
    expect(bodies).toEqual([{ key: `cancel ${UPCOMING.id}`, body: { reason: 'Lycée fermé ce jour-là.' } }])
  })

  it('montre l’erreur d’annulation du serveur', async () => {
    setupFoundationMeetings({
      extra: { [`POST /api/foundation/meetings/${UPCOMING.id}/cancel`]: () => errorResponse(500, 'SERVER_ERROR') },
    })
    const { user } = renderApp(`/fondation/rencontres?rencontre=${UPCOMING.id}`, { token: true })
    await calendar()

    await user.click(panel().getByRole('button', { name: 'Marquer « Annulée »' }))
    await user.click(screen.getByRole('button', { name: "Confirmer l'annulation" }))
    expect(await panel().findByRole('alert')).toHaveTextContent('Le serveur a rencontré un problème.')
  })

  it('affiche les retours d’une rencontre réalisée, ou « Retours indisponibles »', async () => {
    setupFoundationMeetings({
      feedbacks: [
        { id: 'r1', meeting: { id: COMPLETED.id }, authorRole: 'SCHOOL', status: 'SUBMITTED' },
        { id: 'r2', meeting: { id: COMPLETED.id }, authorRole: 'SPEAKER', status: 'PUBLISHED' },
      ],
    })
    renderApp(`/fondation/rencontres?rencontre=${COMPLETED.id}&mois=2026-11`, { token: true })
    await calendar()

    expect(await panel().findByText('Soumis')).toBeInTheDocument()
    expect(panel().getByText('Validé')).toBeInTheDocument()
    expect(panel().getByRole('link', { name: "Voir les retours d'expérience" })).toHaveAttribute(
      'href',
      `/fondation/retours?onglet=tous&rencontre=${COMPLETED.id}`,
    )
  })

  it('affiche « Retours indisponibles » et « Réessayer » si les retours ne se chargent pas', async () => {
    setupFoundationMeetings({ extra: { 'GET /api/foundation/feedbacks': () => errorResponse(500, 'SERVER_ERROR') } })
    renderApp(`/fondation/rencontres?rencontre=${COMPLETED.id}`, { token: true })
    await calendar()

    expect(await panel().findAllByText('Retours indisponibles')).toHaveLength(2)
    expect(panel().getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
    expect(panel().getByRole('heading', { name: 'Lycée de Sor (Saint-Louis)' })).toBeInTheDocument()
  })

  it('propose un calendrier compact (mobile) et une note pour une rencontre annulée', async () => {
    setupFoundationMeetings()
    const { user } = renderApp('/fondation/rencontres', { token: true })

    const compact = within(await screen.findByRole('table', { name: 'Calendrier compact de Novembre 2026' }))
    await user.click(compact.getByRole('button', { name: /^12 : 15h00 · Kolda × Amadou, Annulée/ }))
    expect(panel().getByRole('heading', { name: 'Lycée de Kolda (Kolda)' })).toBeInTheDocument()
    expect(panel().getByText('Annulée par la Fondation M.')).toBeInTheDocument()
    expect(CANCELLED.reason).toBe('')
    expect(DEFAULT_FOUNDATION_MEETINGS).toHaveLength(9)
  })
})
