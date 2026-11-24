import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, meetingJson, recordBodies, renderApp } from '../../test/helpers'
import {
  REQUEST_A,
  REQUEST_B,
  SYSTEM_REFUSED,
  defaultData,
  freezeNow,
  setupSpeaker,
  updateMeeting,
} from '../../test/speakerFixtures'

beforeEach(freezeNow)
afterEach(() => {
  vi.useRealTimers()
})

function requests() {
  return within(screen.getByRole('list', { name: 'Demandes' }))
}

async function detail() {
  return within(await screen.findByRole('article'))
}

async function sidebar() {
  const [first] = await screen.findAllByRole('navigation', { name: 'Navigation principale' })
  if (first === undefined) throw new Error('Barre latérale absente')
  return within(first)
}

function factValue(scope: ReturnType<typeof within>, label: string): string | null {
  return scope.getByText(label, { selector: 'dt' }).nextElementSibling?.textContent ?? null
}

describe('Demandes reçues — onglets et détail', () => {
  it('répartit les demandes par onglet', async () => {
    setupSpeaker()
    const { router, user } = renderApp('/intervenant/demandes', { token: true })

    expect(await screen.findByRole('tab', { name: 'À traiter · 2' })).toHaveAttribute('aria-selected', 'true')
    expect(requests().getAllByRole('button').map((row) => row.textContent)).toEqual([
      expect.stringContaining('Lycée des Tisserands'),
      expect.stringContaining('Collège Les Baobabs'),
    ])
    expect(requests().getAllByRole('button')[0]).toHaveTextContent('Ven 27 nov · 14h00')
    expect(requests().getAllByRole('button')[0]).toHaveTextContent('Terminale S2 · 32 élèves · dakar')

    await user.click(screen.getByRole('tab', { name: 'Acceptées · 2' }))
    expect(requests().getAllByRole('button').map((row) => row.textContent)).toEqual([
      expect.stringContaining('Centre de formation Saint-Louis'),
      expect.stringContaining('Lycée Blaise Diagne'),
    ])
    expect(router.state.location.search).toBe('?onglet=acceptees')

    await user.click(screen.getByRole('tab', { name: 'Refusées ou annulées · 2' }))
    expect(requests().getAllByRole('button')).toHaveLength(2)

    await user.click(screen.getByRole('tab', { name: 'Toutes · 6' }))
    expect(requests().getAllByRole('button')).toHaveLength(6)
  })

  it('affiche telle quelle une demande en ligne ancienne', async () => {
    const data = defaultData()
    setupSpeaker({ ...data, meetings: data.meetings.map((meeting) => (meeting.id === REQUEST_A.id ? { ...meeting, format: 'ONLINE' } : meeting)) })
    renderApp('/intervenant/demandes', { token: true })

    const card = await detail()
    expect(card.getByRole('heading', { name: 'Lycée des Tisserands' })).toBeInTheDocument()
    expect(factValue(card, 'Format souhaité')).toBe('En ligne')
  })

  it('affiche le détail, la zone, le mot de l’école et les deux demandes sur le même créneau', async () => {
    setupSpeaker()
    const { user } = renderApp('/intervenant/demandes', { token: true })

    const card = await detail()
    expect(card.getByText('Demande envoyée le 22 novembre')).toBeInTheDocument()
    expect(card.getByRole('heading', { name: 'Lycée des Tisserands' })).toBeInTheDocument()
    expect(card.getByText('Dans votre zone')).toBeInTheDocument()
    expect(factValue(card, 'Créneau demandé')).toBe('Vendredi 27 novembre, 14h00 – 15h00')
    // En classe seulement (F6.1) : pas de « Format souhaité » pour une demande en classe.
    expect(card.queryByText('Format souhaité', { selector: 'dt' })).not.toBeInTheDocument()
    expect(factValue(card, 'Classe')).toBe('Terminale S2')
    expect(factValue(card, 'Élèves')).toBe('32 élèves')
    expect(card.getByRole('region', { name: "Le mot de l'école" })).toHaveTextContent(
      'Nos élèves rêvent de comprendre comment fonctionne internet.',
    )
    expect(card.getByText(/Une autre école demande aussi ce créneau/)).toBeInTheDocument()
    expect(requests().getAllByText('2 demandes sur ce créneau')).toHaveLength(2)

    await user.click(requests().getByRole('button', { name: /Collège Les Baobabs/ }))
    const other = await detail()
    expect(other.queryByText('Dans votre zone')).not.toBeInTheDocument()
    expect(other.queryByText('Élèves', { selector: 'dt' })).not.toBeInTheDocument()
  })

  it('n’affiche ni noms d’élèves ni coordonnées, même si le serveur en envoyait', async () => {
    const leaky = {
      ...REQUEST_A,
      students: [{ firstName: 'Prénom-Factice', lastName: 'Nom-Factice' }],
      referent: { email: 'referent-factice@ecole.test', phone: '+221 70 000 00 09' },
      school: { name: 'Lycée des Tisserands', city: 'Dakar', country: 'Sénégal', phone: '+221 70 000 00 08' },
    }
    setupSpeaker({ slots: [], meetings: [leaky] })
    renderApp('/intervenant/demandes', { token: true })

    await detail()
    const text = document.body.textContent ?? ''
    for (const secret of ['Prénom-Factice', 'Nom-Factice', 'referent-factice@ecole.test', '+221 70 000 00 09', '+221 70 000 00 08']) {
      expect(text).not.toContain(secret)
    }
    expect(screen.getByText(/Les noms des élèves et les coordonnées du référent ne sont jamais affichés/)).toBeInTheDocument()
  })

  it('affiche une demande refusée par le système', async () => {
    setupSpeaker()
    const { user } = renderApp('/intervenant/demandes?onglet=refusees', { token: true })

    await user.click(await screen.findByRole('button', { name: /Collège de Rufisque/ }))
    const card = await detail()
    expect(card.getByRole('region', { name: 'Refusée automatiquement · créneau pris' })).toHaveTextContent(
      'Une rencontre a été confirmée avec une autre école sur ce créneau.',
    )
    expect(card.queryByRole('button', { name: 'Accepter' })).not.toBeInTheDocument()
  })

  it('ouvre la demande indiquée dans l’URL', async () => {
    setupSpeaker()
    renderApp(`/intervenant/demandes?onglet=toutes&demande=${SYSTEM_REFUSED.id}`, { token: true })

    expect((await detail()).getByRole('heading', { name: 'Collège de Rufisque' })).toBeInTheDocument()
  })

  it('pagine les demandes par 20', async () => {
    const many = Array.from({ length: 23 }, (_, index) =>
      meetingJson({
        id: `d0000000-0000-4000-8000-${String(index + 100).padStart(12, '0')}`,
        school: { name: `École ${String(index + 1).padStart(2, '0')}`, city: 'Dakar', country: 'Sénégal' },
        slot: { id: `c0000000-0000-4000-8000-${String(index + 100).padStart(12, '0')}`, startAt: `2026-12-${String(index + 1).padStart(2, '0')}T10:00:00+01:00`, endAt: `2026-12-${String(index + 1).padStart(2, '0')}T11:00:00+01:00` },
      }),
    )
    // Le serveur plafonne la taille à 10 : toutes les pages sont parcourues.
    const { calls } = setupSpeaker({ slots: [], meetings: many }, {}, { maxSize: 10 })
    const { user } = renderApp('/intervenant/demandes', { token: true })

    expect(await screen.findByRole('tab', { name: 'À traiter · 23' })).toBeInTheDocument()
    expect(calls('GET', '/api/speaker/meetings')).toHaveLength(3)
    expect(requests().getAllByRole('button')).toHaveLength(20)
    const pagination = within(screen.getByRole('navigation', { name: 'Pages de demandes' }))
    expect(pagination.getByText('Page 1 sur 2')).toBeInTheDocument()

    await user.click(pagination.getByRole('button', { name: 'Suivant' }))
    expect(await screen.findByText('Page 2 sur 2')).toBeInTheDocument()
    expect(requests().getAllByRole('button')).toHaveLength(3)
  })
})

describe('Demandes reçues — actions', () => {
  it('accepte une demande : appel, bloc de résultat, liste et badge mis à jour', async () => {
    const { store, calls } = setupSpeaker(defaultData(), {
      [`POST /api/speaker/meetings/${REQUEST_A.id}/accept`]: () => {
        updateMeeting(store, REQUEST_A.id, { myDecision: 'VALIDATED' })
        return jsonResponse(200, { ...REQUEST_A, myDecision: 'VALIDATED' })
      },
    })
    const { user } = renderApp('/intervenant/demandes', { token: true })

    await user.click((await detail()).getByRole('button', { name: 'Accepter' }))

    expect(await screen.findByRole('status', { name: 'Merci, votre accord est enregistré' })).toHaveTextContent(
      'La Fondation M donne aussi son avis. Dès que vous êtes tous les deux d’accord, la rencontre est confirmée',
    )
    expect(calls('POST', `/api/speaker/meetings/${REQUEST_A.id}/accept`)).toHaveLength(1)
    await waitFor(() => expect(requests().getAllByRole('button')).toHaveLength(1))
    expect(screen.getByRole('tab', { name: 'À traiter · 1' })).toBeInTheDocument()
    expect((await sidebar()).getByRole('link', { name: 'Demandes reçues 1 en attente' })).toBeInTheDocument()
    expect((await detail()).getByRole('heading', { name: 'Collège Les Baobabs' })).toBeInTheDocument()
  })

  it('exige un motif pour refuser, puis refuse avec motif', async () => {
    const bodies: unknown[] = []
    const { store } = setupSpeaker(defaultData(), {
      [`POST /api/speaker/meetings/${REQUEST_B.id}/refuse`]: recordBodies(bodies, () => {
        updateMeeting(store, REQUEST_B.id, { status: 'REFUSED', myDecision: 'REFUSED', closedBy: 'SPEAKER' })
        return jsonResponse(200, { ...REQUEST_B, status: 'REFUSED', myDecision: 'REFUSED', closedBy: 'SPEAKER' })
      }),
    })
    const { user } = renderApp(`/intervenant/demandes?demande=${REQUEST_B.id}`, { token: true })

    const card = await detail()
    await user.click(card.getByRole('button', { name: 'Refuser' }))
    const field = card.getByLabelText(/^Un mot pour expliquer \?/)
    await user.type(field, '   ')
    await user.click(card.getByRole('button', { name: 'Confirmer le refus' }))
    expect(field).toHaveAccessibleDescription('Expliquez en quelques mots pourquoi vous refusez.')
    expect(bodies).toEqual([])

    await user.clear(field)
    await user.type(field, ' Je suis en déplacement cette semaine. ')
    await user.click(card.getByRole('button', { name: 'Confirmer le refus' }))

    expect(await screen.findByRole('status', { name: 'Vous avez refusé cette demande' })).toHaveTextContent(
      'Aucun motif donné. L’école peut choisir un autre intervenant.',
    )
    expect(bodies).toEqual([{ reason: 'Je suis en déplacement cette semaine.' }])
  })

  it('affiche l’erreur de validation du motif sous le champ', async () => {
    setupSpeaker(defaultData(), {
      [`POST /api/speaker/meetings/${REQUEST_A.id}/refuse`]: () =>
        jsonResponse(400, {
          code: 'VALIDATION_ERROR',
          message: 'Requête invalide',
          fieldErrors: [{ field: 'reason', message: 'Le motif est obligatoire.' }],
        }),
    })
    const { user } = renderApp('/intervenant/demandes', { token: true })

    const card = await detail()
    await user.click(card.getByRole('button', { name: 'Refuser' }))
    await user.type(card.getByLabelText(/^Un mot pour expliquer/), 'Motif factice')
    await user.click(card.getByRole('button', { name: 'Confirmer le refus' }))

    expect(await card.findByText('Le motif est obligatoire.')).toBeInTheDocument()
    expect(card.getByLabelText(/^Un mot pour expliquer/)).toHaveAccessibleDescription('Le motif est obligatoire.')
  })

  it('signale une demande déjà traitée (409) et recharge', async () => {
    const { store, calls } = setupSpeaker(defaultData(), {
      [`POST /api/speaker/meetings/${REQUEST_A.id}/accept`]: () => {
        updateMeeting(store, REQUEST_A.id, { status: 'REFUSED', closedBy: 'FOUNDATION', reason: 'Motif factice.' })
        return jsonResponse(409, { code: 'INVALID_STATUS_TRANSITION', message: 'Transition invalide.', fieldErrors: [] })
      },
    })
    const { user } = renderApp('/intervenant/demandes', { token: true })

    const card = await detail()
    const before = calls('GET', '/api/speaker/meetings').length
    await user.click(card.getByRole('button', { name: 'Accepter' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Cette demande a déjà été traitée.')
    await waitFor(() => expect(calls('GET', '/api/speaker/meetings').length).toBeGreaterThan(before))
    await waitFor(() => expect(requests().getAllByRole('button')).toHaveLength(1))
  })

  it('signale un créneau passé (SLOT_PASSED) et recharge', async () => {
    setupSpeaker(defaultData(), {
      [`POST /api/speaker/meetings/${REQUEST_A.id}/accept`]: () =>
        jsonResponse(409, { code: 'SLOT_PASSED', message: 'Créneau passé.', fieldErrors: [] }),
    })
    const { user } = renderApp('/intervenant/demandes', { token: true })

    await user.click((await detail()).getByRole('button', { name: 'Accepter' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ce créneau est déjà passé.')
  })
})
