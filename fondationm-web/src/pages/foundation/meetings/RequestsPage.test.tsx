import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, makeMe, renderApp } from '../../../test/helpers'
import {
  CANCELLED,
  REFUSED_BY_US,
  REQUEST_SOR,
  REQUEST_YOFF,
  SLOT_TAKEN,
  VALIDATED_BY_US,
  setupFoundationMeetings,
} from '../../../test/foundationMeetingsFixtures'
import { freezeNow } from '../../../test/speakerFixtures'

beforeEach(freezeNow)
afterEach(() => {
  vi.useRealTimers()
})

function list() {
  return within(screen.getByRole('list', { name: /^Demandes :/ }))
}

/** Bloc de résultat de la demande qui vient d'être traitée (au-dessus de la suivante). */
function result() {
  return screen.findByRole('status', { name: 'Demande traitée' })
}

function detail() {
  return within(screen.getByRole('region', { name: 'Détail de la demande' }))
}

async function ready() {
  return within(await screen.findByRole('list', { name: /^Demandes :/ }))
}

describe('Demandes de rencontre (Fondation)', () => {
  it('charge toutes les pages et compte les onglets', async () => {
    const { calls } = setupFoundationMeetings({ maxSize: 4 })
    renderApp('/fondation/demandes', { token: true })

    await ready()
    expect(screen.getByRole('heading', { level: 1, name: 'Demandes de rencontre' })).toBeInTheDocument()
    expect(screen.getAllByText("Avis en parallèle de l'intervenant").length).toBeGreaterThan(0)
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'À traiter · 2',
      'Confirmées · 3',
      'Refusées ou annulées · 3',
      'Toutes · 9',
    ])
    expect(calls('GET', '/api/foundation/meetings').map((request) => new URL(request.url).searchParams.get('page'))).toEqual(['0', '1', '2'])
    expect(calls('GET', '/api/foundation/meetings').every((request) => !new URL(request.url).searchParams.has('awaitingFoundation'))).toBe(true)
  })

  it('affiche les pastilles de navigation « à traiter » et « à marquer »', async () => {
    setupFoundationMeetings()
    renderApp('/fondation/demandes', { token: true })

    const [sidebar] = await screen.findAllByRole('navigation', { name: 'Navigation principale' })
    if (sidebar === undefined) throw new Error('Navigation absente')
    expect(await within(sidebar).findByRole('link', { name: /^Demandes de rencontre 2/ })).toHaveAttribute('href', '/fondation/demandes')
    expect(within(sidebar).getByRole('link', { name: /^Rencontres 1/ })).toHaveAttribute('href', '/fondation/rencontres')
  })

  it('présente la liste : créneau, statut, avis de l’intervenant, attente', async () => {
    setupFoundationMeetings()
    renderApp('/fondation/demandes', { token: true })

    const items = (await ready()).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    const [sor, yoff] = items
    if (!sor || !yoff) throw new Error('Demandes absentes')
    expect(sor).toHaveTextContent('Jeu 26 nov · 10h00')
    expect(sor).toHaveTextContent('En attente')
    expect(sor).toHaveTextContent('Lycée de Sor → Amadou Baila')
    expect(sor).toHaveTextContent('Intervenant : À traiter')
    expect(sor).toHaveTextContent('En attente depuis 4 jours')
    expect(yoff).toHaveTextContent('Intervenant : Validé')
    expect(yoff).not.toHaveTextContent(/depuis/)
  })

  it('affiche le détail et le conflit de créneau', async () => {
    setupFoundationMeetings()
    renderApp(`/fondation/demandes?demande=${REQUEST_SOR.id}`, { token: true })
    await ready()

    const card = detail()
    expect(card.getByText('Envoyée le 20 novembre')).toBeInTheDocument()
    expect(card.getByText('Dakar · Réseaux, Télécoms')).toBeInTheDocument()
    expect(card.getAllByText('Jeudi 26 novembre, 10h00 – 11h30').length).toBeGreaterThan(0)
    expect(card.getByText(/« Nos élèves hésitent/)).toBeInTheDocument()
    expect(card.getByText('Votre avis').nextElementSibling).toHaveTextContent('À traiter')
    expect(
      card.getByText(
        '1 autre demande sur ce créneau (Lycée de Grand-Yoff). Si cette rencontre est confirmée, elle sera refusée automatiquement.',
        { normalizer: (value) => value.replace(/\s+/g, ' ').trim() },
      ),
    ).toBeInTheDocument()
    expect(card.getByRole('button', { name: 'Valider la demande' })).toBeInTheDocument()
  })

  it('valide sans confirmation, recharge la liste et passe à la demande suivante', async () => {
    const { calls, bodies } = setupFoundationMeetings()
    const { router, user } = renderApp('/fondation/demandes', { token: true })
    await ready()
    const before = calls('GET', '/api/foundation/meetings').length

    await user.click(detail().getByRole('button', { name: 'Valider la demande' }))

    const block = await result()
    expect(block).toHaveTextContent('Lycée de Sor → Amadou Baila')
    expect(block).toHaveTextContent('Votre validation est enregistrée')
    expect(block).toHaveTextContent("Il manque l'avis de l'intervenant. La rencontre sera confirmée dès son accord.")
    expect(bodies).toEqual([{ key: `validate ${REQUEST_SOR.id}`, body: null }])
    expect(router.state.location.search).toBe(`?demande=${REQUEST_YOFF.id}`)
    await waitFor(() => expect(calls('GET', '/api/foundation/meetings').length).toBeGreaterThan(before))
    expect(await screen.findByRole('tab', { name: 'À traiter · 1' })).toBeInTheDocument()
  })

  it('refuse sans motif (chaîne vide) et affiche « Aucun motif transmis »', async () => {
    const { bodies } = setupFoundationMeetings()
    const { user } = renderApp(`/fondation/demandes?demande=${REQUEST_YOFF.id}`, { token: true })
    await ready()

    await user.click(detail().getByRole('button', { name: 'Refuser' }))
    const form = within(screen.getByRole('form', { name: 'Refuser la demande' }))
    expect(form.getByLabelText(/^Motif du refus/)).not.toBeRequired()
    await user.type(form.getByLabelText(/^Motif du refus/), '   ')
    await user.click(form.getByRole('button', { name: 'Confirmer le refus' }))

    const block = await result()
    expect(block).toHaveTextContent('Refusée par la Fondation M')
    expect(block).toHaveTextContent("Aucun motif transmis. L'école peut choisir un autre intervenant.")
    expect(bodies).toEqual([{ key: `refuse ${REQUEST_YOFF.id}`, body: { reason: '' } }])
  })

  it('refuse avec un motif, sans espaces autour', async () => {
    const { bodies } = setupFoundationMeetings()
    const { user } = renderApp(`/fondation/demandes?demande=${REQUEST_YOFF.id}`, { token: true })
    await ready()

    await user.click(detail().getByRole('button', { name: 'Refuser' }))
    const form = within(screen.getByRole('form', { name: 'Refuser la demande' }))
    await user.type(form.getByLabelText(/^Motif du refus/), '  Classe déjà rencontrée.  ')
    await user.click(form.getByRole('button', { name: 'Confirmer le refus' }))

    expect(await result()).toHaveTextContent('Motif : « Classe déjà rencontrée. »')
    expect(bodies).toEqual([{ key: `refuse ${REQUEST_YOFF.id}`, body: { reason: 'Classe déjà rencontrée.' } }])
  })

  it.each([
    [{ code: 'INVALID_STATUS_TRANSITION', message: 'x' }, "Cette rencontre a déjà changé d'état. La liste a été rechargée."],
    [{ code: 'QUELQUE_CHOSE', message: 'Le serveur refuse cette décision.' }, 'Le serveur refuse cette décision.'],
  ])('affiche l’erreur du serveur à la validation (%o)', async (body, message) => {
    setupFoundationMeetings({
      extra: { [`POST /api/foundation/meetings/${REQUEST_SOR.id}/validate`]: () => jsonResponse(409, body) },
    })
    const { user } = renderApp(`/fondation/demandes?demande=${REQUEST_SOR.id}`, { token: true })
    await ready()

    await user.click(detail().getByRole('button', { name: 'Valider la demande' }))
    expect(await detail().findByRole('alert')).toHaveTextContent(message)
  })

  it('place sous le champ un motif refusé par le serveur', async () => {
    setupFoundationMeetings({
      extra: {
        [`POST /api/foundation/meetings/${REQUEST_YOFF.id}/refuse`]: () =>
          jsonResponse(400, { code: 'VALIDATION_ERROR', message: 'x', fieldErrors: [{ field: 'reason', message: 'Le motif est obligatoire.' }] }),
      },
    })
    const { user } = renderApp(`/fondation/demandes?demande=${REQUEST_YOFF.id}`, { token: true })
    await ready()

    await user.click(detail().getByRole('button', { name: 'Refuser' }))
    const form = within(screen.getByRole('form', { name: 'Refuser la demande' }))
    await user.click(form.getByRole('button', { name: 'Confirmer le refus' }))
    expect(await form.findByText('Le motif est obligatoire.')).toBeInTheDocument()
  })

  it('range refus, créneau pris et annulations dans « Refusées ou annulées »', async () => {
    setupFoundationMeetings()
    const { router, user } = renderApp('/fondation/demandes', { token: true })
    await ready()

    await user.click(screen.getByRole('tab', { name: 'Refusées ou annulées · 3' }))
    expect(router.state.location.search).toBe('?onglet=refusees')
    const items = list().getAllByRole('button')
    expect(items.map((item) => item.textContent?.match(/Refusée|Créneau pris|Annulée/)?.[0])).toEqual(['Annulée', 'Refusée', 'Créneau pris'])

    await user.click(list().getByRole('button', { name: /Lycée de Rufisque/ }))
    expect(detail().getByText('Refusée automatiquement · créneau pris')).toBeInTheDocument()
    expect(router.state.location.search).toBe(`?onglet=refusees&demande=${SLOT_TAKEN.id}`)

    await user.click(list().getByRole('button', { name: /Lycée de Kolda/ }))
    expect(detail().getByText('Annulée par la Fondation M')).toBeInTheDocument()
    expect(detail().getByText('Aucun motif transmis.')).toBeInTheDocument()
    expect(CANCELLED.reason).toBe('')

    await user.click(list().getByRole('button', { name: /Lycée de Louga/ }))
    expect(detail().getByText(`Motif : « ${String(REFUSED_BY_US.reason)} »`)).toBeInTheDocument()
  })

  it('montre « Votre validation est enregistrée » dans « Toutes »', async () => {
    setupFoundationMeetings()
    renderApp(`/fondation/demandes?onglet=toutes&demande=${VALIDATED_BY_US.id}`, { token: true })
    await ready()

    expect(detail().getByText('Votre validation est enregistrée')).toBeInTheDocument()
    expect(detail().queryByRole('button', { name: 'Valider la demande' })).not.toBeInTheDocument()
  })

  it('ouvre le détail en plein écran sur téléphone, avec « Retour à la liste »', async () => {
    setupFoundationMeetings()
    const { router, user } = renderApp('/fondation/demandes', { token: true })
    await ready()

    await user.click(list().getByRole('button', { name: /Lycée de Grand-Yoff/ }))
    expect(router.state.location.search).toBe(`?demande=${REQUEST_YOFF.id}`)
    await user.click(detail().getByRole('button', { name: 'Retour à la liste' }))
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('renvoie un autre rôle vers son espace', async () => {
    setupFoundationMeetings({ me: makeMe() })
    const { router } = renderApp('/fondation/demandes', { token: true })

    await waitFor(() => expect(router.state.location.pathname).toBe('/ecole/intervenants'))
  })
})
