import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { errorResponse, foundationMe, jsonResponse, makeMe, mockApi, pagedHandler, renderApp } from '../../../test/helpers'
import { freezeNow } from '../../../test/speakerFixtures'

beforeEach(freezeNow)
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const CODE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/

function request(id: string, overrides: Record<string, unknown>) {
  return {
    id: `d8000000-0000-4000-8000-00000000000${id}`,
    donor: { id: 'a8000000-0000-4000-8000-000000000001', name: 'M. Diaw' },
    subject: `Objet ${id}`,
    message: `Message ${id}`,
    status: 'OPEN',
    response: null,
    createdAt: '2026-11-12T09:00:00+01:00',
    answeredAt: null,
    ...overrides,
  }
}

const OLD_OPEN = request('1', { subject: 'Bilan des rencontres à Saint-Louis', createdAt: '2026-11-10T09:00:00+01:00' })
const NEW_OPEN = request('2', { subject: 'Financer plus de rencontres agricoles', donor: { name: 'Groupe Sahel Invest' }, createdAt: '2026-11-20T09:00:00+01:00' })
const ANSWERED = request('3', {
  subject: 'Liste des établissements accompagnés',
  status: 'ANSWERED',
  response: 'Vous la trouverez dans votre espace.',
  createdAt: '2026-11-22T09:00:00+01:00',
  answeredAt: '2026-11-23T09:00:00+01:00',
})

const DIAW = 'a8000000-0000-4000-8000-000000000001'
const SAHEL = 'a8000000-0000-4000-8000-000000000002'

interface Options {
  requests?: Record<string, unknown>[]
  extra?: Parameters<typeof mockApi>[0]
}

function setup({ requests = [OLD_OPEN, ANSWERED, NEW_OPEN], extra = {} }: Options = {}) {
  const store = {
    requests: [...requests],
    consultations: [
      { donorId: DIAW, name: 'M. Diaw', lastConsultedAt: '2026-11-12T10:00:00+01:00', consultationCount: 3 },
      { donorId: SAHEL, name: 'Groupe Sahel Invest', lastConsultedAt: null, consultationCount: 0 },
    ],
    donors: [{ id: DIAW, email: 'diaw@exemple.test', role: 'DONOR', status: 'VALIDATED' }],
  }
  const bodies: { key: string; body: unknown }[] = []
  const handlers: Parameters<typeof mockApi>[0] = {
    'GET /api/me': () => jsonResponse(200, foundationMe),
    'GET /api/foundation/donor-requests': pagedHandler(() => store.requests),
    'GET /api/foundation/donor-consultations': pagedHandler(() => store.consultations),
    'GET /api/foundation/donors': pagedHandler(() => store.donors),
    'POST /api/foundation/donors': async (req) => {
      const body = (await req.json()) as { name: string; email: string; password: string }
      bodies.push({ key: 'create', body })
      const created = { id: 'a8000000-0000-4000-8000-000000000009', email: body.email, role: 'DONOR', status: 'VALIDATED' }
      store.donors.push(created)
      store.consultations.push({ donorId: created.id, name: body.name, lastConsultedAt: null, consultationCount: 0 })
      return jsonResponse(201, created)
    },
    [`POST /api/foundation/accounts/${DIAW}/password`]: async (req) => {
      bodies.push({ key: 'password', body: await req.json() })
      return new Response(null, { status: 204 })
    },
  }
  for (const entry of store.requests) {
    handlers[`POST /api/foundation/donor-requests/${String(entry.id)}/answer`] = async (req) => {
      const body = (await req.json()) as { response: string }
      bodies.push({ key: `answer ${String(entry.id)}`, body })
      const index = store.requests.findIndex((item) => item.id === entry.id)
      const updated = { ...store.requests[index], status: 'ANSWERED', response: body.response, answeredAt: '2026-11-24T08:00:00+01:00' }
      store.requests[index] = updated
      return jsonResponse(200, updated)
    }
  }
  const fetchMock = mockApi({ ...handlers, ...extra })
  return { store, bodies, fetchMock }
}

async function list() {
  return within(await screen.findByRole('list', { name: 'Requêtes des donateurs' }))
}

function conversation() {
  return within(screen.getByRole('region', { name: 'Conversation' }))
}

describe('Requêtes donateurs', () => {
  it('liste les nouvelles d’abord, puis par date décroissante, et compte les onglets', async () => {
    setup()
    renderApp('/fondation/requetes', { token: true })

    const items = (await list()).getAllByRole('button')
    expect(items.map((item) => item.textContent)).toEqual([
      'Groupe Sahel Invest · 20 novNouvelleFinancer plus de rencontres agricoles',
      'M. Diaw · 10 novNouvelleBilan des rencontres à Saint-Louis',
      'M. Diaw · 22 novTraitéeListe des établissements accompagnés',
    ])
    expect(screen.getAllByText('Donateurs').length).toBeGreaterThan(0)
    expect(screen.getByRole('tab', { name: 'Requêtes · 3' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByRole('tab', { name: 'Donateurs · 2' })).toBeInTheDocument()
  })

  it('affiche la pastille des requêtes ouvertes dans la navigation', async () => {
    setup()
    renderApp('/fondation/requetes', { token: true })

    const [sidebar] = await screen.findAllByRole('navigation', { name: 'Navigation principale' })
    if (sidebar === undefined) throw new Error('Navigation absente')
    expect(await within(sidebar).findByRole('link', { name: /^Requêtes donateurs 2/ })).toHaveAttribute('href', '/fondation/requetes')
  })

  it('montre une requête répondue avec la bulle de la Fondation, sans formulaire', async () => {
    setup()
    const { user } = renderApp('/fondation/requetes', { token: true })

    await user.click((await list()).getByRole('button', { name: /Liste des établissements/ }))
    expect(conversation().getByText('Vous la trouverez dans votre espace.')).toBeInTheDocument()
    expect(conversation().getByText('Fondation M · 23 nov')).toBeInTheDocument()
    expect(conversation().getByText('Requête traitée. La réponse est visible dans l’espace de M. Diaw.')).toBeInTheDocument()
    expect(conversation().queryByRole('form', { name: 'Répondre à la requête' })).not.toBeInTheDocument()
  })

  it('refuse une réponse vide, puis envoie la réponse et passe la requête en « Traitée »', async () => {
    const { bodies } = setup()
    const { user } = renderApp(`/fondation/requetes?requete=${OLD_OPEN.id}`, { token: true })
    await list()

    const form = within(conversation().getByRole('form', { name: 'Répondre à la requête' }))
    expect(form.getByText('Votre réponse sera visible dans l’espace de M. Diaw. Vous ne pourrez plus la modifier.')).toBeInTheDocument()
    await user.type(form.getByLabelText('Votre réponse'), '   ')
    await user.click(form.getByRole('button', { name: 'Envoyer la réponse' }))
    expect(form.getByText('Écrivez votre réponse avant de l’envoyer.')).toBeInTheDocument()
    expect(bodies).toEqual([])

    await user.clear(form.getByLabelText('Votre réponse'))
    await user.type(form.getByLabelText('Votre réponse'), '  Bonjour, voici le bilan.  ')
    expect(form.getByText('28 / 2000')).toBeInTheDocument()
    await user.click(form.getByRole('button', { name: 'Envoyer la réponse' }))

    expect(await conversation().findByRole('status')).toHaveTextContent('Requête traitée. La réponse est visible dans l’espace de M. Diaw.')
    expect(conversation().getByText('Bonjour, voici le bilan.')).toBeInTheDocument()
    expect(bodies).toEqual([{ key: `answer ${OLD_OPEN.id}`, body: { response: 'Bonjour, voici le bilan.' } }])
  })

  it('affiche l’erreur du serveur à l’envoi', async () => {
    setup({ extra: { [`POST /api/foundation/donor-requests/${OLD_OPEN.id}/answer`]: () => jsonResponse(409, { code: 'ALREADY_ANSWERED', message: 'Cette requête a déjà reçu une réponse.' }) } })
    const { user } = renderApp(`/fondation/requetes?requete=${OLD_OPEN.id}`, { token: true })
    await list()

    await user.type(conversation().getByLabelText('Votre réponse'), 'Bonjour.')
    await user.click(conversation().getByRole('button', { name: 'Envoyer la réponse' }))
    expect(await conversation().findByRole('alert')).toHaveTextContent('Cette requête a déjà reçu une réponse.')
  })

  it('ouvre le détail plein écran sur téléphone avec « Retour à la liste »', async () => {
    setup()
    const { router, user } = renderApp('/fondation/requetes', { token: true })

    await user.click((await list()).getByRole('button', { name: /Bilan des rencontres/ }))
    expect(router.state.location.search).toBe(`?requete=${OLD_OPEN.id}`)
    await user.click(conversation().getByRole('button', { name: 'Retour à la liste' }))
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('renvoie un autre rôle vers son espace', async () => {
    setup({ extra: { 'GET /api/me': () => jsonResponse(200, makeMe()) } })
    const { router } = renderApp('/fondation/requetes', { token: true })

    await waitFor(() => expect(router.state.location.pathname).toBe('/ecole/intervenants'))
  })
})

async function openDonors(path = '/fondation/requetes?onglet=donateurs') {
  const rendered = renderApp(path, { token: true })
  await screen.findByRole('list', { name: 'Comptes donateurs' })
  return rendered
}

describe('Donateurs', () => {
  it('liste les donateurs, leurs consultations, l’e-mail quand l’identifiant correspond, et filtre', async () => {
    setup()
    const { user } = await openDonors()

    const donors = within(screen.getByRole('list', { name: 'Comptes donateurs' }))
    const [diaw, sahel] = donors.getAllByRole('listitem')
    expect(diaw).toHaveTextContent('M. Diaw')
    expect(diaw).toHaveTextContent('diaw@exemple.test')
    expect(diaw).toHaveTextContent('Dernière consultation le 12 novembre 2026')
    expect(diaw).toHaveTextContent('3 consultations')
    expect(sahel).toHaveTextContent('Jamais consulté')
    expect(sahel).toHaveTextContent('0 consultation')
    expect(sahel).not.toHaveTextContent('@')

    await user.click(screen.getByRole('button', { name: 'Jamais consultés' }))
    expect(donors.getAllByRole('listitem')).toHaveLength(1)
  })

  it('crée un compte donateur et affiche sa fiche d’accès une seule fois', async () => {
    const { bodies } = setup()
    const { user } = await openDonors()

    await user.click(screen.getByRole('button', { name: 'Créer un compte donateur' }))
    const form = within(screen.getByRole('form', { name: 'Créer un compte donateur' }))
    expect(form.getByText(/Aucun e-mail n’est envoyé/)).toBeInTheDocument()
    await user.click(form.getByRole('button', { name: 'Créer le compte' }))
    expect(form.getByText('Indiquez le nom du donateur ou de l’organisation.')).toBeInTheDocument()

    await user.type(form.getByLabelText(/^Nom du donateur/), 'Fondation Teranga')
    await user.type(form.getByLabelText(/^E-mail/), 'contact@teranga.test')
    await user.click(form.getByRole('button', { name: 'Créer le compte' }))

    const sheet = within(await screen.findByRole('region', { name: "Fiche d'accès" }))
    const sent = bodies.find((entry) => entry.key === 'create')?.body as { password: string; name: string; email: string }
    expect(sent).toMatchObject({ name: 'Fondation Teranga', email: 'contact@teranga.test' })
    expect(sent.password).toMatch(CODE)
    expect(sheet.getByText(sent.password)).toBeInTheDocument()
    expect(sheet.getByText('contact@teranga.test')).toBeInTheDocument()
    expect(screen.getByText('Imprimez la fiche avant de quitter cette page : le code ne sera plus affiché.')).toBeInTheDocument()
    const stored = [localStorage, sessionStorage].flatMap((storage) =>
      Array.from({ length: storage.length }, (_, index) => storage.getItem(storage.key(index) ?? '') ?? ''),
    )
    expect(stored.some((value) => value.includes(sent.password))).toBe(false)

    const printed: string[] = []
    vi.spyOn(window, 'print').mockImplementation(() => {
      printed.push(document.querySelector('.fiches-impression')?.textContent ?? '')
    })
    await user.click(sheet.getByRole('button', { name: 'Imprimer la fiche' }))
    expect(printed[0]).toContain(sent.password)
    expect(screen.queryByText(/Imprimez la fiche avant de quitter/)).not.toBeInTheDocument()
  })

  it('signale une adresse déjà utilisée', async () => {
    setup({ extra: { 'POST /api/foundation/donors': () => jsonResponse(409, { code: 'EMAIL_ALREADY_USED', message: 'x', fieldErrors: [] }) } })
    const { user } = await openDonors()

    await user.click(screen.getByRole('button', { name: 'Créer un compte donateur' }))
    const form = within(screen.getByRole('form', { name: 'Créer un compte donateur' }))
    await user.type(form.getByLabelText(/^Nom du donateur/), 'M. Diaw')
    await user.type(form.getByLabelText(/^E-mail/), 'diaw@exemple.test')
    await user.click(form.getByRole('button', { name: 'Créer le compte' }))
    expect(await form.findByText('Cette adresse e-mail est déjà utilisée par un compte.')).toBeInTheDocument()
  })

  it('garde la fiche si la liste ne se recharge pas après la création', async () => {
    let failing = false
    const { bodies, store } = setup()
    mockApi({
      'GET /api/me': () => jsonResponse(200, foundationMe),
      'GET /api/foundation/donor-requests': pagedHandler(() => store.requests),
      'GET /api/foundation/donors': pagedHandler(() => store.donors),
      'GET /api/foundation/donor-consultations': (req) => (failing ? errorResponse(500, 'SERVER_ERROR') : pagedHandler(() => store.consultations)(req)),
      'POST /api/foundation/donors': async (req) => {
        const body = (await req.json()) as { password: string }
        bodies.push({ key: 'create', body })
        failing = true
        return jsonResponse(201, { id: 'a8000000-0000-4000-8000-000000000009', email: 'contact@teranga.test', role: 'DONOR' })
      },
    })
    const { user } = await openDonors()

    await user.click(screen.getByRole('button', { name: 'Créer un compte donateur' }))
    const form = within(screen.getByRole('form', { name: 'Créer un compte donateur' }))
    await user.type(form.getByLabelText(/^Nom du donateur/), 'Fondation Teranga')
    await user.type(form.getByLabelText(/^E-mail/), 'contact@teranga.test')
    await user.click(form.getByRole('button', { name: 'Créer le compte' }))

    const code = (bodies.at(-1)?.body as { password: string } | undefined)?.password ?? 'absent'
    expect(await screen.findByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: "Fiche d'accès" })).getByText(code)).toBeInTheDocument()
  })

  it('crée un nouveau code après confirmation', async () => {
    const { bodies } = setup()
    const { user } = await openDonors()

    await user.click(screen.getByRole('button', { name: 'Nouveau code pour M. Diaw' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Nouveau code pour M. Diaw ?' }))
    expect(dialog.getByText('L’ancien code ne fonctionnera plus.')).toBeInTheDocument()
    await user.click(dialog.getByRole('button', { name: 'Créer un nouveau code' }))

    const sheet = within(await screen.findByRole('region', { name: "Fiche d'accès" }))
    const sent = bodies.find((entry) => entry.key === 'password')?.body as { newPassword: string }
    expect(sent.newPassword).toMatch(CODE)
    expect(sheet.getByText(sent.newPassword)).toBeInTheDocument()
    expect(sheet.getByText('diaw@exemple.test')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Voir la fiche de M. Diaw' })).toBeInTheDocument()
  })

  it('garde les codes en changeant d’onglet', async () => {
    setup()
    const { user } = await openDonors()

    await user.click(screen.getByRole('button', { name: 'Nouveau code pour M. Diaw' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Nouveau code pour M. Diaw ?' })).getByRole('button', { name: 'Créer un nouveau code' }))
    await screen.findByRole('region', { name: "Fiche d'accès" })
    await user.click(screen.getByRole('tab', { name: /^Requêtes/ }))
    await user.click(screen.getByRole('tab', { name: /^Donateurs/ }))
    expect(screen.getByRole('region', { name: "Fiche d'accès" })).toBeInTheDocument()
  })
})
