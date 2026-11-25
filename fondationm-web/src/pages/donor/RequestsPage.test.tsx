import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { donorMe, donorRequestJson, setupDonor } from '../../test/donorFixtures'
import { errorResponse, jsonResponse, makeMe, mockApi, renderApp } from '../../test/helpers'
import { freezeNow } from '../../test/speakerFixtures'

beforeEach(freezeNow)
afterEach(() => {
  vi.useRealTimers()
})

const OPEN = donorRequestJson({ id: 'r-open', subject: 'Bilan des rencontres à Saint-Louis', createdAt: '2026-11-12T09:00:00+01:00' })
const ANSWERED = donorRequestJson({
  id: 'r-done',
  subject: 'Liste des établissements accompagnés',
  message: 'Pourriez-vous m’envoyer la liste ?',
  status: 'ANSWERED',
  response: 'Vous la trouverez dans votre rapport d’impact.',
  createdAt: '2026-10-25T09:00:00+01:00',
  answeredAt: '2026-10-28T09:00:00+01:00',
})

function noop() {
  // Remplacé quand le POST simulé est reçu.
}

async function list() {
  return within(await screen.findByRole('list', { name: 'Mes requêtes' }))
}

function panel() {
  return within(screen.getByRole('region', { name: /^(Requête choisie|Nouvelle requête)$/ }))
}

async function fill(user: ReturnType<typeof renderApp>['user'], subject: string, message: string) {
  await user.type(await screen.findByLabelText(/^Objet/), subject)
  await user.type(screen.getByLabelText(/^Message/), message)
}

describe('Mes requêtes du donateur (W4-requetes)', () => {
  it('liste les requêtes (plus récente d’abord) avec la pastille des OPEN et deux états seulement', async () => {
    setupDonor({ requests: [ANSWERED, OPEN] })
    const { user } = renderApp('/donateur/requetes', { token: true })

    const items = (await list()).getAllByRole('button')
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Bilan des rencontres à Saint-Louis'),
      expect.stringContaining('Liste des établissements accompagnés'),
    ])
    expect(items[0]).toHaveTextContent('12 novEnvoyée')
    expect(items[0]).toHaveTextContent('En attente de réponse')
    expect(items[1]).toHaveTextContent('Réponse reçue')
    const [sidebar] = screen.getAllByRole('navigation', { name: 'Navigation principale' })
    if (sidebar === undefined) throw new Error('Navigation absente')
    expect(await within(sidebar).findByRole('link', { name: 'Mes requêtes 1 en attente' })).toHaveAttribute('href', '/donateur/requetes')

    expect(panel().getByText('La Fondation M n\'a pas encore répondu. Sa réponse s\'affichera ici.')).toBeInTheDocument()
    expect(within(panel().getByRole('list', { name: 'Suivi de la requête' })).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Envoyée', 'Traitée'])
    await user.click(items[1] ?? document.body)
    expect(panel().getByText('Vous la trouverez dans votre rapport d’impact.')).toBeInTheDocument()
    expect(panel().getByText('Fondation M · 28 oct')).toBeInTheDocument()
    expect(screen.queryByText(/Samirath|En cours|par e-mail/)).not.toBeInTheDocument()
  })

  it('refuse un envoi vide, compte les caractères et envoie le texte sans espaces autour', async () => {
    const { bodies } = setupDonor({ requests: [OPEN] })
    const { user, router } = renderApp('/donateur/requetes?vue=nouvelle', { token: true })

    await user.click(await screen.findByRole('button', { name: 'Envoyer à la Fondation' }))
    expect(await screen.findByText('Ajoutez un objet et un message pour envoyer votre requête.')).toBeInTheDocument()
    expect(bodies).toEqual([])

    await fill(user, '  Visiter une classe ', ' Bonjour, est-ce possible ?  ')
    expect(screen.getByText('21 / 150')).toBeInTheDocument()
    expect(screen.getByText('29 / 2000')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Envoyer à la Fondation' }))

    expect(await screen.findByText('Votre requête est partie. La Fondation M vous répondra ici.')).toBeInTheDocument()
    expect(bodies).toEqual([{ subject: 'Visiter une classe', message: 'Bonjour, est-ce possible ?' }])
    const search = new URLSearchParams(router.state.location.search)
    expect(search.get('vue')).toBeNull()
    expect(search.get('requete')).toBe('d1000000-0000-4000-8000-000000000001')
    expect(panel().getByRole('heading', { name: 'Visiter une classe' })).toBeInTheDocument()
    expect((await list()).getAllByRole('button')[0]).toHaveAttribute('aria-pressed', 'true')
  })

  it('désactive le bouton pendant l’envoi : un seul POST', async () => {
    let release: () => void = noop
    const posts: unknown[] = []
    const created = donorRequestJson({ id: 'r-new', subject: 'Objet', message: 'Message', createdAt: '2026-11-24T08:00:00+01:00' })
    const setup = setupDonor({
      extra: {
        'POST /api/donor/requests': async (request) => {
          posts.push(await request.json())
          return new Promise<Response>((resolve) => {
            release = () => {
              setup.store.requests.unshift(created)
              resolve(jsonResponse(201, created))
            }
          })
        },
      },
    })
    const { user } = renderApp('/donateur/requetes?vue=nouvelle', { token: true })

    await fill(user, 'Objet', 'Message')
    const sendButton = screen.getByRole('button', { name: 'Envoyer à la Fondation' })
    await user.click(sendButton)
    expect(sendButton).toBeDisabled()
    await user.click(sendButton)
    expect(posts).toHaveLength(1)
    release()
    expect(await screen.findByText('Votre requête est partie. La Fondation M vous répondra ici.')).toBeInTheDocument()
  })

  it('affiche l’erreur de champ du serveur sous le champ et garde le texte', async () => {
    setupDonor({
      extra: {
        'POST /api/donor/requests': () =>
          jsonResponse(400, { code: 'VALIDATION_ERROR', message: 'Requête invalide', fieldErrors: [{ field: 'subject', message: 'Objet trop long.' }] }),
      },
    })
    const { user } = renderApp('/donateur/requetes?vue=nouvelle', { token: true })

    await fill(user, 'Objet', 'Mon message')
    await user.click(screen.getByRole('button', { name: 'Envoyer à la Fondation' }))
    expect(await screen.findByText('Objet trop long.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Objet/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/^Message/)).toHaveValue('Mon message')
  })

  it('retient la requête relue après un échec seulement si objet, message et date correspondent', async () => {
    const { store, calls } = setupDonor({
      requests: [OPEN],
      extra: {
        'POST /api/donor/requests': () => {
          // La requête est créée mais la réponse se perd.
          store.requests.unshift(donorRequestJson({ id: 'r-lost', subject: 'Visite', message: 'Est-ce possible ?', createdAt: '2026-11-24T08:00:00+01:00' }))
          return errorResponse(500, 'SERVER_ERROR')
        },
      },
    })
    const { user, router } = renderApp('/donateur/requetes?vue=nouvelle', { token: true })

    await fill(user, 'Visite', 'Est-ce possible ?')
    await user.click(screen.getByRole('button', { name: 'Envoyer à la Fondation' }))
    expect(await screen.findByText('Votre requête est partie. La Fondation M vous répondra ici.')).toBeInTheDocument()
    expect(new URLSearchParams(router.state.location.search).get('requete')).toBe('r-lost')
    expect(calls('POST', '/api/donor/requests')).toHaveLength(1)
  })

  it('en cas de doute, garde le texte avec l’erreur et ne renvoie rien', async () => {
    const { store, calls } = setupDonor({
      requests: [OPEN],
      extra: {
        'POST /api/donor/requests': () => {
          // Même objet, message différent : ce n'est pas la requête envoyée.
          store.requests.unshift(donorRequestJson({ id: 'r-other', subject: 'Visite', message: 'Autre message', createdAt: '2026-11-24T08:00:00+01:00' }))
          return errorResponse(500, 'SERVER_ERROR')
        },
      },
    })
    const { user } = renderApp('/donateur/requetes?vue=nouvelle', { token: true })

    await fill(user, 'Visite', 'Est-ce possible ?')
    await user.click(screen.getByRole('button', { name: 'Envoyer à la Fondation' }))
    expect(await screen.findByText(/Le serveur a rencontré un problème/)).toHaveTextContent('Votre texte est conservé')
    expect(screen.getByLabelText(/^Objet/)).toHaveValue('Visite')
    expect(screen.getByLabelText(/^Message/)).toHaveValue('Est-ce possible ?')
    expect(calls('POST', '/api/donor/requests')).toHaveLength(1)
  })

  it('« Envoyer une nouvelle requête » préremplit « Complément : {objet} », coupé à 150 caractères', async () => {
    const long = donorRequestJson({ id: 'r-long', subject: 'x'.repeat(150) })
    setupDonor({ requests: [long] })
    const { user } = renderApp('/donateur/requetes', { token: true })

    await user.click(await screen.findByRole('button', { name: 'Envoyer une nouvelle requête' }))
    const subject = (await screen.findByLabelText(/^Objet/)) as HTMLInputElement
    expect(subject.value).toHaveLength(150)
    expect(subject.value.startsWith('Complément : xxx')).toBe(true)
    expect(subject.value.endsWith('…')).toBe(true)
  })

  it('ouvre le formulaire depuis un retour avec l’objet prérempli', async () => {
    setupDonor()
    renderApp(`/donateur/requetes?vue=nouvelle&objet=${encodeURIComponent('Retour du 20 octobre à Pikine')}`, { token: true })

    expect(await screen.findByLabelText(/^Objet/)).toHaveValue('Retour du 20 octobre à Pikine')
    expect(screen.getByText('Aucune requête pour l\'instant. Posez votre première question.')).toBeInTheDocument()
  })
})

describe('Espace donateur : navigation et gardes', () => {
  it('montre deux entrées, « Espace donateur » et la carte sans « Mécène depuis »', async () => {
    setupDonor({ requests: [OPEN] })
    renderApp('/donateur/impact', { token: true })

    const [sidebar, bottom] = await screen.findAllByRole('navigation', { name: 'Navigation principale' })
    if (sidebar === undefined || bottom === undefined) throw new Error('Navigation absente')
    expect(within(sidebar).getByRole('link', { name: "Rapport d'impact" })).toHaveAttribute('href', '/donateur/impact')
    expect(within(sidebar).queryByText('Accueil')).not.toBeInTheDocument()
    expect(within(bottom).getAllByRole('listitem')).toHaveLength(2)
    const [aside] = screen.getAllByRole('complementary')
    if (aside === undefined) throw new Error('Barre latérale absente')
    expect(within(aside).getByText('Espace donateur')).toBeInTheDocument()
    expect(within(aside).getByText('Ousmane Diaw')).toBeInTheDocument()
    expect(within(aside).getByText(donorMe.email ?? '')).toBeInTheDocument()
    expect(screen.queryByText(/Mécène depuis|Espace mécène/)).not.toBeInTheDocument()
  })

  it('envoie un donateur au mot de passe obligatoire, et un autre rôle hors de l’espace donateur', async () => {
    mockApi({ 'GET /api/me': () => jsonResponse(200, { ...donorMe, mustChangePassword: true }) })
    const { router } = renderApp('/donateur/impact', { token: true })
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/mot-de-passe-obligatoire'))
  })

  it('renvoie un établissement vers son espace', async () => {
    setupDonor({ me: makeMe() })
    const { router } = renderApp('/donateur/requetes', { token: true })
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/ecole/intervenants'))
  })
})
