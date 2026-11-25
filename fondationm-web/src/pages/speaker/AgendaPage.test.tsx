import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { errorResponse, jsonResponse, makeMe, mockApi, recordBodies, renderApp } from '../../test/helpers'
import { FREE_SLOT, defaultData, freezeNow, setupSpeaker } from '../../test/speakerFixtures'

beforeEach(freezeNow)
afterEach(() => {
  vi.useRealTimers()
})

async function calendar() {
  return within(await screen.findByRole('table', { name: /^Calendrier de/ }))
}

function panel() {
  return within(screen.getByRole('region', { name: 'Détail' }))
}

async function sidebar() {
  const [first] = await screen.findAllByRole('navigation', { name: 'Navigation principale' })
  if (first === undefined) throw new Error('Barre latérale absente')
  return within(first)
}

describe('Espace intervenant — navigation', () => {
  it('redirige /intervenant vers /intervenant/agenda', async () => {
    setupSpeaker()
    const { router } = renderApp('/intervenant', { token: true })

    expect(await screen.findByRole('heading', { name: 'Mon agenda', level: 1 })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/intervenant/agenda')
  })

  it('affiche les entrées, le badge des demandes à traiter et la carte utilisateur', async () => {
    setupSpeaker()
    renderApp('/intervenant/agenda', { token: true })

    const nav = await sidebar()
    expect(nav.getByRole('link', { name: 'Mon agenda' })).toHaveAttribute('href', '/intervenant/agenda')
    expect(await nav.findByRole('link', { name: 'Demandes reçues 2 en attente' })).toHaveAttribute(
      'href',
      '/intervenant/demandes',
    )
    expect(nav.queryByRole('link', { name: /Mon impact/ })).not.toBeInTheDocument()
    expect(nav.getByText('Mon impact').closest('li')).toHaveTextContent('Bientôt')
    expect(screen.getByText('Espace intervenant')).toBeInTheDocument()
    expect(screen.getByText('Awa Diallo')).toBeInTheDocument()
    expect(screen.getByText('Ingénieure réseaux · Dakar')).toBeInTheDocument()
    // 4 entrées au plus dans la navigation basse : pas de bouton « Plus ».
    expect(screen.queryByRole('button', { name: 'Plus' })).not.toBeInTheDocument()
  })

  it('refuse l’accès à un utilisateur d’un autre rôle', async () => {
    mockApi({ 'GET /api/me': () => jsonResponse(200, makeMe()) })
    const { router } = renderApp('/intervenant/agenda', { token: true })

    expect(await screen.findByRole('heading', { name: 'Bonjour Lycée des Tisserands !' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/ecole')
  })
})

describe('Mon agenda', () => {
  it('affiche le mois avec un élément de chaque statut, la légende et le bandeau des demandes', async () => {
    setupSpeaker()
    renderApp('/intervenant/agenda', { token: true })

    const grid = await calendar()
    expect(screen.getByText('Bonjour Awa')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Novembre 2026' })).toBeInTheDocument()
    expect(grid.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim',
    ])
    expect(grid.getByRole('button', { name: 'Libre, Jeudi 26 novembre, 10h00 – 11h30' })).toHaveTextContent('10h00Libre')
    expect(grid.getByRole('button', { name: 'Demandé, Vendredi 27 novembre, 14h00 – 15h00' })).toBeInTheDocument()
    expect(
      grid.getByRole('button', { name: 'Confirmé, Lundi 30 novembre, 9h00 – 10h00, Lycée Blaise Diagne' }),
    ).toBeInTheDocument()
    expect(
      grid.getByRole('button', { name: 'Réalisé, Mardi 10 novembre, 9h00 – 10h00, Centre de formation Saint-Louis' }),
    ).toBeInTheDocument()
    expect(
      grid.getByRole('button', { name: 'Annulé ou refusé, Jeudi 12 novembre, 15h00 – 16h00, Lycée de Thiès' }),
    ).toBeInTheDocument()
    // « + Créneau » seulement sur les jours à venir.
    expect(grid.getByRole('button', { name: 'Publier un créneau le mercredi 25 novembre 2026' })).toBeInTheDocument()
    expect(grid.queryByRole('button', { name: 'Publier un créneau le lundi 23 novembre 2026' })).not.toBeInTheDocument()
    expect(grid.getByRole('button', { name: /^mardi 24 novembre 2026, aujourd'hui/ })).toHaveAttribute('aria-current', 'date')

    const legend = within(screen.getByRole('list', { name: 'Légende' }))
    expect(legend.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Libre (disponible)', 'Demandé', 'Confirmé', 'Réalisé', 'Annulé ou refusé',
    ])

    const banner = within(screen.getByRole('region', { name: 'Demandes en attente' }))
    expect(banner.getByText("2 demandes d'écoles attendent votre réponse")).toBeInTheDocument()
    expect(banner.getByRole('link', { name: 'Répondre' })).toHaveAttribute('href', '/intervenant/demandes')
  })

  it('navigue entre les mois', async () => {
    setupSpeaker()
    const { router, user } = renderApp('/intervenant/agenda', { token: true })
    await calendar()

    await user.click(screen.getByRole('button', { name: 'Mois suivant' }))
    expect(await screen.findByRole('heading', { name: 'Décembre 2026' })).toBeInTheDocument()
    expect((await calendar()).queryByRole('button', { name: /^Libre/ })).not.toBeInTheDocument()
    expect(router.state.location.search).toBe('?mois=2026-12')

    await user.click(screen.getByRole('button', { name: 'Mois précédent' }))
    await user.click(screen.getByRole('button', { name: 'Mois précédent' }))
    expect(await screen.findByRole('heading', { name: 'Octobre 2026' })).toBeInTheDocument()
    // Mois passé : aucun bouton de publication.
    expect((await calendar()).queryByRole('button', { name: /^Publier un créneau le/ })).not.toBeInTheDocument()
  })

  it('liste les éléments à venir pour le téléphone', async () => {
    setupSpeaker()
    renderApp('/intervenant/agenda', { token: true })

    const days = within(await screen.findByRole('list', { name: 'Prochains jours' }))
    expect(days.getAllByRole('heading').map((heading) => heading.textContent)).toEqual([
      'Jeudi 26 novembre',
      'Vendredi 27 novembre',
      'Lundi 30 novembre',
    ])
  })

  it('publie un créneau avec formats et décalage horaire, puis recharge', async () => {
    const bodies: unknown[] = []
    const { store, calls } = setupSpeaker(defaultData(), {
      'POST /api/speaker/slots': recordBodies(bodies, () => {
        const created = { ...FREE_SLOT, id: 'c0000000-0000-4000-8000-000000000009', startAt: '2026-11-25T10:00:00+01:00', endAt: '2026-11-25T11:30:00+01:00', formats: 'IN_PERSON' }
        store.slots = [...store.slots, created]
        return jsonResponse(201, created)
      }),
    })
    const { user } = renderApp('/intervenant/agenda', { token: true })

    await user.click((await calendar()).getByRole('button', { name: 'Publier un créneau le mercredi 25 novembre 2026' }))
    const form = within(panel().getByRole('form', { name: 'Publier un créneau' }))
    expect(form.getByText('Publier un créneau ce jour-là · Mercredi 25 novembre')).toBeInTheDocument()
    expect(form.getByRole('button', { name: 'Les deux' })).toHaveAttribute('aria-pressed', 'true')
    expect(form.getByText(/Visible par toutes les écoles, celles de Dakar en premier/)).toBeInTheDocument()

    const slotCallsBefore = calls('GET', '/api/speaker/slots').length
    await user.selectOptions(form.getByLabelText(/^De/), '10:00')
    await user.selectOptions(form.getByLabelText(/^À/), '11:30')
    await user.click(form.getByRole('button', { name: 'En classe' }))
    await user.click(form.getByRole('button', { name: 'Publier ce créneau' }))

    expect(await form.findByText('Créneau publié. Les écoles peuvent le voir dès maintenant.')).toBeInTheDocument()
    expect(bodies).toEqual([
      { startAt: '2026-11-25T10:00:00+01:00', endAt: '2026-11-25T11:30:00+01:00', formats: 'IN_PERSON' },
    ])
    await waitFor(() => expect(calls('GET', '/api/speaker/slots').length).toBeGreaterThan(slotCallsBefore))
    expect(
      await (await calendar()).findByRole('button', { name: 'Libre, Mercredi 25 novembre, 10h00 – 11h30' }),
    ).toBeInTheDocument()
  })

  it('affiche SLOT_OVERLAP sous le formulaire', async () => {
    setupSpeaker(defaultData(), {
      'POST /api/speaker/slots': () =>
        jsonResponse(409, { code: 'SLOT_OVERLAP', message: 'Chevauchement.', fieldErrors: [] }),
    })
    const { user } = renderApp('/intervenant/agenda', { token: true })

    await user.click((await calendar()).getByRole('button', { name: 'Publier un créneau le jeudi 26 novembre 2026' }))
    const form = within(panel().getByRole('form', { name: 'Publier un créneau' }))
    await user.selectOptions(form.getByLabelText(/^De/), '11:00')
    await user.selectOptions(form.getByLabelText(/^À/), '12:00')
    await user.click(form.getByRole('button', { name: 'Publier ce créneau' }))

    expect(await form.findByRole('alert')).toHaveTextContent('Ce créneau chevauche un de vos créneaux existants.')
  })

  it('valide la durée et l’heure de début côté client', async () => {
    const { calls } = setupSpeaker()
    const { user } = renderApp('/intervenant/agenda', { token: true })
    await calendar()

    // Aujourd'hui (8h00) : le panneau du jour propose le formulaire.
    const form = within(panel().getByRole('form', { name: 'Publier un créneau' }))
    const submit = form.getByRole('button', { name: 'Publier ce créneau' })

    await user.selectOptions(form.getByLabelText(/^De/), '07:00')
    await user.selectOptions(form.getByLabelText(/^À/), '07:00')
    await user.click(submit)
    expect(await form.findByText("L'heure de début doit être à venir.")).toBeInTheDocument()
    expect(form.getByText('La fin doit être après le début.')).toBeInTheDocument()

    await user.selectOptions(form.getByLabelText(/^De/), '09:00')
    await user.selectOptions(form.getByLabelText(/^À/), '17:15')
    await user.click(submit)
    expect(await form.findByText('Un créneau dure de 15 minutes à 8 heures.')).toBeInTheDocument()

    expect(calls('POST', '/api/speaker/slots')).toHaveLength(0)
  })

  it('retire un créneau libre après confirmation', async () => {
    const { store, calls } = setupSpeaker(defaultData(), {
      [`DELETE /api/speaker/slots/${FREE_SLOT.id}`]: () => {
        store.slots = store.slots.filter((slot) => slot.id !== FREE_SLOT.id)
        return new Response(null, { status: 204 })
      },
    })
    const { user } = renderApp('/intervenant/agenda', { token: true })

    await user.click((await calendar()).getByRole('button', { name: 'Libre, Jeudi 26 novembre, 10h00 – 11h30' }))
    const detail = panel()
    expect(detail.getByRole('heading', { name: 'Créneau libre · Jeudi 26 novembre, 10h00 – 11h30' })).toBeInTheDocument()
    expect(detail.getByText('En classe ou en ligne')).toBeInTheDocument()
    await user.click(detail.getByRole('button', { name: 'Retirer ce créneau' }))

    const dialog = within(screen.getByRole('dialog', { name: 'Retirer ce créneau ?' }))
    expect(calls('DELETE', `/api/speaker/slots/${FREE_SLOT.id}`)).toHaveLength(0)
    await user.click(dialog.getByRole('button', { name: 'Retirer' }))

    expect(await panel().findByText('Créneau retiré.')).toBeInTheDocument()
    expect(calls('DELETE', `/api/speaker/slots/${FREE_SLOT.id}`)).toHaveLength(1)
    await waitFor(async () =>
      expect((await calendar()).queryByRole('button', { name: /^Libre, Jeudi 26 novembre/ })).not.toBeInTheDocument(),
    )
  })

  it('explique pourquoi un créneau ne peut pas être retiré', async () => {
    setupSpeaker(defaultData(), {
      [`DELETE /api/speaker/slots/${FREE_SLOT.id}`]: () => errorResponse(409, 'SLOT_HAS_PENDING_MEETINGS'),
    })
    const { user } = renderApp('/intervenant/agenda', { token: true })

    await user.click((await calendar()).getByRole('button', { name: 'Libre, Jeudi 26 novembre, 10h00 – 11h30' }))
    await user.click(panel().getByRole('button', { name: 'Retirer ce créneau' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Retirer' }))

    expect(await panel().findByRole('alert')).toHaveTextContent(
      'Ce créneau a reçu une demande en attente : il ne peut plus être retiré.',
    )
  })

  it('détaille un créneau demandé et une rencontre refusée', async () => {
    setupSpeaker()
    const { user } = renderApp('/intervenant/agenda', { token: true })
    const grid = await calendar()

    await user.click(grid.getByRole('button', { name: 'Demandé, Vendredi 27 novembre, 14h00 – 15h00' }))
    const requests = within(panel().getByRole('list', { name: 'Demandes sur ce créneau' }))
    expect(requests.getAllByRole('listitem')).toHaveLength(2)
    expect(requests.getByRole('link', { name: 'Répondre à Lycée des Tisserands' })).toHaveAttribute(
      'href',
      '/intervenant/demandes?onglet=a-traiter&demande=d0000000-0000-4000-8000-000000000001',
    )
    expect(panel().getByText(/l'autre demande est refusée automatiquement/)).toBeInTheDocument()

    await user.click(grid.getByRole('button', { name: /^Annulé ou refusé, Jeudi 12 novembre/ }))
    expect(panel().getByText('Refusée par la Fondation M')).toBeInTheDocument()
    expect(panel().getByText('La classe a déjà une rencontre ce mois-ci.')).toBeInTheDocument()
  })
})
