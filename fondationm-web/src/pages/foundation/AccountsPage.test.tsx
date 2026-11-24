import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  accountsHandler,
  errorResponse,
  foundationMe,
  jsonResponse,
  makeMe,
  mockApi,
  recordBodies,
  renderApp,
  schoolAccount,
  speakerAccount,
} from '../../test/helpers'

type AccountJson = ReturnType<typeof schoolAccount>

const otherSchool = schoolAccount({
  id: 'a0000000-0000-4000-8000-000000000002',
  email: 'direction@college.test',
  profile: { type: 'SCHOOL', schoolName: 'Collège Les Baobabs', city: 'Thiès', schoolType: 'MIDDLE_SCHOOL' },
})

function setup(initial: AccountJson[], extra: Parameters<typeof mockApi>[0] = {}) {
  const store = { accounts: initial }
  const fetchMock = mockApi({
    'GET /api/me': () => jsonResponse(200, foundationMe),
    'GET /api/foundation/accounts': accountsHandler(() => store.accounts),
    ...extra,
  })
  const listCalls = () =>
    fetchMock.mock.calls.filter(([request]) => new URL(request.url).pathname === '/api/foundation/accounts').length
  return { store, fetchMock, listCalls }
}

function setStatus(store: { accounts: AccountJson[] }, id: string, changes: Partial<AccountJson>) {
  store.accounts = store.accounts.map((account) => (account.id === id ? { ...account, ...changes } : account))
}

async function sidebar() {
  const [first] = await screen.findAllByRole('navigation', { name: 'Navigation principale' })
  if (first === undefined) throw new Error('Barre latérale absente')
  return within(first)
}

function list(name: string | RegExp) {
  return within(screen.getByRole('list', { name }))
}

async function detail() {
  return within(await screen.findByRole('article'))
}

function factValue(scope: ReturnType<typeof within>, label: string): string | null {
  return scope.getByText(label, { selector: 'dt' }).nextElementSibling?.textContent ?? null
}

describe('Espace Fondation — navigation', () => {
  it('redirige /fondation vers /fondation/comptes', async () => {
    setup([])
    const { router } = renderApp('/fondation', { token: true })

    expect(await screen.findByRole('heading', { name: 'Comptes à valider', level: 1 })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/fondation/comptes')
  })

  it('affiche les entrées actives, les entrées « Bientôt », le badge et la carte utilisateur', async () => {
    setup([schoolAccount(), otherSchool, speakerAccount()])
    renderApp('/fondation/comptes', { token: true })

    const nav = await sidebar()
    expect(await nav.findByRole('link', { name: 'Comptes à valider 3 en attente' })).toHaveAttribute(
      'href',
      '/fondation/comptes',
    )
    for (const label of ['Tableau de bord', 'Demandes de rencontre', 'Rencontres', "Retours d'expérience", 'Requêtes donateurs']) {
      expect(nav.queryByRole('link', { name: new RegExp(label) })).not.toBeInTheDocument()
      expect(nav.getByText(label).closest('li')).toHaveTextContent('Bientôt')
    }
    expect(screen.getByText('Pilotage du programme')).toBeInTheDocument()
    expect(screen.getByText('Fondation M')).toBeInTheDocument()
    expect(screen.getByText('equipe@fondation.test')).toBeInTheDocument()
  })

  it('regroupe les entrées désactivées sous « Plus » dans la navigation basse', async () => {
    setup([])
    const { user } = renderApp('/fondation/comptes', { token: true })

    const more = await screen.findByRole('button', { name: 'Plus' })
    expect(more).toHaveAttribute('aria-expanded', 'false')
    await user.click(more)
    expect(more).toHaveAttribute('aria-expanded', 'true')
    expect(within(screen.getByRole('list', { name: 'Autres rubriques' })).getAllByRole('listitem')).toHaveLength(5)
    await user.keyboard('{Escape}')
    expect(more).toHaveAttribute('aria-expanded', 'false')
  })

  it('refuse l’accès à un utilisateur d’un autre rôle', async () => {
    mockApi({ 'GET /api/me': () => jsonResponse(200, makeMe()) })
    const { router } = renderApp('/fondation/comptes', { token: true })

    expect(await screen.findByRole('heading', { name: 'Intervenants disponibles' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/ecole/intervenants')
  })
})

describe('Comptes à valider — listes et détail', () => {
  it('liste les écoles en attente puis les intervenants', async () => {
    const { fetchMock } = setup([schoolAccount(), otherSchool, speakerAccount()])
    const { router, user } = renderApp('/fondation/comptes', { token: true })

    const schools = await screen.findByRole('list', { name: 'Écoles en attente' })
    const rows = within(schools).getAllByRole('button')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Lycée des Tisserands')
    expect(rows[0]).toHaveTextContent('Lycée · Dakar')
    expect(rows[0]).toHaveTextContent('En attente')
    expect(screen.getByRole('tab', { name: 'Écoles · 2' })).toHaveAttribute('aria-selected', 'true')

    const request = fetchMock.mock.calls
      .map(([call]) => new URL(call.url))
      .find((url) => url.pathname === '/api/foundation/accounts' && url.searchParams.get('role') === 'SCHOOL')
    expect(Object.fromEntries(request?.searchParams ?? [])).toEqual({ role: 'SCHOOL', status: 'PENDING', page: '0', size: '20' })

    await user.click(screen.getByRole('tab', { name: 'Intervenants · 1' }))

    const speakers = await screen.findByRole('list', { name: 'Intervenants en attente' })
    expect(within(speakers).getByRole('button')).toHaveTextContent('Ingénieure réseaux · Numérique · Thiès')
    expect(screen.getByText(/la validation n'est pas une sélection/)).toBeInTheDocument()
    expect(router.state.location.search).toBe('?onglet=intervenants')
  })

  it('affiche le détail d’une école', async () => {
    setup([schoolAccount()])
    renderApp('/fondation/comptes', { token: true })

    const card = await detail()
    expect(card.getByText('Établissement · demande envoyée le 20 novembre 2026')).toBeInTheDocument()
    expect(card.getByRole('heading', { name: 'Lycée des Tisserands' })).toBeInTheDocument()
    expect(factValue(card, 'Ville')).toBe('Dakar')
    expect(factValue(card, 'Pays')).toBe('Sénégal')
    expect(factValue(card, "Type d'établissement")).toBe('Lycée')
    expect(factValue(card, 'Fonction du référent')).toBe('Proviseure')
    expect(factValue(card, 'E-mail')).toBe('referent@ecole.test')
    expect(factValue(card, 'Téléphone')).toBe('+221 70 000 00 01')
    expect(factValue(card, 'Charte acceptée le')).toBe('20 novembre 2026')
    expect(card.getByRole('button', { name: 'Valider le compte' })).toBeInTheDocument()
    expect(card.getByRole('button', { name: 'Refuser' })).toBeInTheDocument()
  })

  it('affiche le détail d’un intervenant avec compétences et motivation', async () => {
    setup([speakerAccount()])
    renderApp('/fondation/comptes?onglet=intervenants', { token: true })

    const card = await detail()
    expect(card.getByText('Intervenant · demande envoyée le 21 novembre 2026')).toBeInTheDocument()
    expect(factValue(card, 'Secteur')).toBe('Numérique')
    expect(factValue(card, 'Métier')).toBe('Ingénieure réseaux')
    expect(card.queryByText('Structure', { selector: 'dt' })).not.toBeInTheDocument()
    const skills = within(card.getByRole('region', { name: 'Compétences déclarées' })).getAllByRole('listitem')
    expect(skills.map((item) => item.textContent)).toEqual(['Réseaux', 'Cybersécurité'])
    expect(card.getByRole('region', { name: 'Pourquoi il ou elle veut transmettre' })).toHaveTextContent(
      'Montrer aux élèves que les métiers du numérique leur sont ouverts.',
    )
  })

  it('sélectionne un compte et l’inscrit dans l’URL', async () => {
    setup([schoolAccount(), otherSchool])
    const { router, user } = renderApp('/fondation/comptes', { token: true })

    await user.click(await screen.findByRole('button', { name: /Collège Les Baobabs/ }))

    expect(screen.getByRole('button', { name: /Collège Les Baobabs/ })).toHaveAttribute('aria-current', 'true')
    expect((await detail()).getByRole('heading', { name: 'Collège Les Baobabs' })).toBeInTheDocument()
    expect(router.state.location.search).toBe(`?compte=${otherSchool.id}`)
  })

  it('affiche la liste si le compte de l’URL n’est plus dans la page chargée', async () => {
    setup([schoolAccount()])
    renderApp('/fondation/comptes?compte=inconnu', { token: true })

    expect(await screen.findByRole('list', { name: 'Écoles en attente' })).toBeInTheDocument()
    expect((await detail()).getByRole('heading', { name: 'Lycée des Tisserands' })).toBeInTheDocument()
  })

  it('affiche « Tout est à jour » quand la liste est vide', async () => {
    setup([])
    renderApp('/fondation/comptes', { token: true })

    expect(await screen.findByRole('heading', { name: 'Tout est à jour. Bravo !' })).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('pagine avec « Précédent / Suivant »', async () => {
    const many = Array.from({ length: 25 }, (_, index) =>
      schoolAccount({
        id: `a0000000-0000-4000-8000-${String(index + 100).padStart(12, '0')}`,
        profile: { type: 'SCHOOL', schoolName: `École ${index + 1}` },
      }),
    )
    const { fetchMock } = setup(many)
    const { router, user } = renderApp('/fondation/comptes', { token: true })

    const pagination = within(await screen.findByRole('navigation', { name: 'Pages de comptes' }))
    expect(pagination.getByText('Page 1 sur 2')).toBeInTheDocument()
    expect(pagination.getByRole('button', { name: 'Précédent' })).toBeDisabled()
    expect(list('Écoles en attente').getAllByRole('button')).toHaveLength(20)

    await user.click(pagination.getByRole('button', { name: 'Suivant' }))

    expect(await screen.findByText('Page 2 sur 2')).toBeInTheDocument()
    expect(list('Écoles en attente').getAllByRole('button')).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeDisabled()
    expect(router.state.location.search).toBe('?page=2')
    const pages = fetchMock.mock.calls.map(([call]) => new URL(call.url).searchParams.get('page'))
    expect(pages).toContain('1')
  })

  it('affiche une erreur de chargement avec « Réessayer »', async () => {
    mockApi({
      'GET /api/me': () => jsonResponse(200, foundationMe),
      'GET /api/foundation/accounts': () => errorResponse(500, 'SERVER_ERROR'),
    })
    renderApp('/fondation/comptes', { token: true })

    expect(await screen.findByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })
})

describe('Comptes à valider — actions', () => {
  it('valide un compte : appel, retrait de la liste, badge et sélection mis à jour', async () => {
    const validated: string[] = []
    const { store } = setup([schoolAccount(), otherSchool, speakerAccount()], {
      [`POST /api/foundation/accounts/${schoolAccount().id}/validate`]: (request) => {
        validated.push(new URL(request.url).pathname)
        setStatus(store, schoolAccount().id, { status: 'VALIDATED', decidedAt: '2026-11-24T10:00:00Z' })
        return jsonResponse(200, { ...schoolAccount(), status: 'VALIDATED', decidedAt: '2026-11-24T10:00:00Z' })
      },
    })
    const { user } = renderApp('/fondation/comptes', { token: true })

    const card = await detail()
    await user.click(card.getByRole('button', { name: 'Valider le compte' }))

    const result = await screen.findByRole('status', { name: 'Compte validé' })
    expect(result).toHaveTextContent('Lycée des Tisserands peut maintenant se connecter et utiliser la plateforme.')
    expect(result).toHaveTextContent('Décision du 24 novembre 2026')
    expect(result).not.toHaveTextContent(/e-mail/i)
    expect(validated).toEqual([`/api/foundation/accounts/${schoolAccount().id}/validate`])

    await waitFor(() => expect(list('Écoles en attente').getAllByRole('button')).toHaveLength(1))
    expect(screen.getByRole('tab', { name: 'Écoles · 1' })).toBeInTheDocument()
    expect((await sidebar()).getByRole('link', { name: 'Comptes à valider 2 en attente' })).toBeInTheDocument()
    expect((await detail()).getByRole('heading', { name: 'Collège Les Baobabs' })).toBeInTheDocument()
  })

  it('exige un motif pour refuser, puis refuse avec motif', async () => {
    const bodies: unknown[] = []
    const reason = 'Nous n’avons pas pu vérifier l’établissement.'
    const { store } = setup([schoolAccount()], {
      [`POST /api/foundation/accounts/${schoolAccount().id}/reject`]: recordBodies(bodies, () => {
        setStatus(store, schoolAccount().id, { status: 'REJECTED', rejectionReason: reason })
        return jsonResponse(200, { ...schoolAccount(), status: 'REJECTED', rejectionReason: reason })
      }),
    })
    const { user } = renderApp('/fondation/comptes', { token: true })

    const card = await detail()
    await user.click(card.getByRole('button', { name: 'Refuser' }))
    const field = card.getByLabelText(/^Motif du refus \(transmis à la personne\)/)
    await user.type(field, '   ')
    await user.click(card.getByRole('button', { name: 'Confirmer le refus' }))

    expect(field).toHaveAccessibleDescription('Indiquez le motif du refus : il est transmis à la personne.')
    expect(bodies).toEqual([])

    await user.clear(field)
    await user.type(field, `  ${reason}  `)
    await user.click(card.getByRole('button', { name: 'Confirmer le refus' }))

    const result = await screen.findByRole('status', { name: 'Compte refusé' })
    expect(result).toHaveTextContent(`Motif transmis : « ${reason} »`)
    expect(bodies).toEqual([{ reason }])
    expect(await screen.findByRole('heading', { name: 'Tout est à jour. Bravo !' })).toBeInTheDocument()
  })

  it('affiche l’erreur de validation du serveur sous le champ motif', async () => {
    setup([schoolAccount()], {
      [`POST /api/foundation/accounts/${schoolAccount().id}/reject`]: () =>
        jsonResponse(400, {
          code: 'VALIDATION_ERROR',
          message: 'Requête invalide',
          fieldErrors: [{ field: 'reason', message: 'Le motif est trop long.' }],
        }),
    })
    const { user } = renderApp('/fondation/comptes', { token: true })

    const card = await detail()
    await user.click(card.getByRole('button', { name: 'Refuser' }))
    await user.type(card.getByLabelText(/^Motif du refus/), 'Motif factice')
    await user.click(card.getByRole('button', { name: 'Confirmer le refus' }))

    expect(await card.findByText('Le motif est trop long.')).toBeInTheDocument()
    expect(card.getByLabelText(/^Motif du refus/)).toHaveAccessibleDescription('Le motif est trop long.')
    expect(card.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('signale un compte déjà traité (409) et recharge la liste', async () => {
    const { store, listCalls } = setup([schoolAccount(), otherSchool], {
      [`POST /api/foundation/accounts/${schoolAccount().id}/validate`]: () => {
        setStatus(store, schoolAccount().id, { status: 'VALIDATED' })
        return jsonResponse(409, {
          code: 'INVALID_STATUS_TRANSITION',
          message: 'Transition de statut invalide.',
          fieldErrors: [],
        })
      },
    })
    const { user } = renderApp('/fondation/comptes', { token: true })

    const card = await detail()
    const callsBefore = listCalls()
    await user.click(card.getByRole('button', { name: 'Valider le compte' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ce compte a déjà été traité')
    await waitFor(() => expect(listCalls()).toBeGreaterThan(callsBefore))
    await waitFor(() => expect(list('Écoles en attente').getAllByRole('button')).toHaveLength(1))
    expect(screen.queryByText('Transition de statut invalide.')).not.toBeInTheDocument()
  })

  it('affiche les comptes déjà traités et le motif d’un refus', async () => {
    const rejected = speakerAccount({
      id: 'b0000000-0000-4000-8000-000000000009',
      status: 'REJECTED',
      rejectionReason: 'Profil incomplet : métier non précisé.',
      decidedAt: '2026-11-22T15:00:00Z',
    })
    const { fetchMock } = setup([schoolAccount({ id: 'a0000000-0000-4000-8000-000000000050', status: 'VALIDATED' }), rejected])
    const { user } = renderApp('/fondation/comptes', { token: true })

    await user.click(await screen.findByRole('tab', { name: 'Déjà traités' }))
    expect(await screen.findByRole('list', { name: 'Comptes déjà traités : écoles validés' })).toHaveTextContent('Validé')

    await user.click(screen.getByRole('button', { name: 'Intervenants', pressed: false }))
    await user.click(screen.getByRole('button', { name: 'Refusés' }))

    const rows = await screen.findByRole('list', { name: 'Comptes déjà traités : intervenants refusés' })
    expect(rows).toHaveTextContent('Refusé')
    const card = await detail()
    const result = card.getByRole('region', { name: 'Compte refusé' })
    expect(result).toHaveTextContent('Motif transmis : « Profil incomplet : métier non précisé. »')
    expect(result).toHaveTextContent('Décision du 22 novembre 2026')
    expect(card.queryByRole('button', { name: 'Valider le compte' })).not.toBeInTheDocument()

    const queries = fetchMock.mock.calls.map(([call]) => new URL(call.url).search)
    expect(queries).toContain('?role=SPEAKER&status=REJECTED&page=0&size=20')
  })
})
