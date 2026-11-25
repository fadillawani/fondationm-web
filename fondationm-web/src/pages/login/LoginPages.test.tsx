import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { tokenStorage } from '../../auth/tokenStorage'
import {
  FAKE_PASSWORD,
  errorResponse,
  foundationMe,
  jsonResponse,
  makeMe,
  mockApi,
  pagedHandler,
  recordBodies,
  renderApp,
  speakerMe,
  tokenResponse,
} from '../../test/helpers'

const studentMe = makeMe({
  email: 'khadija.ba.sor@eleve.fondationm.sn',
  role: 'STUDENT',
  profile: { type: 'STUDENT', name: 'Khadija Ba' },
})

const speakerHandlers = {
  'GET /api/speaker/slots': pagedHandler(() => []),
  'GET /api/speaker/meetings': pagedHandler(() => []),
}

describe('Connexions par persona', () => {
  it.each([
    ['/connexion/fondation', 'Connectez-vous avec votre adresse de la Fondation.', 'Se connecter'],
    ['/connexion/donateur', "Utilisez l'accès remis par la Fondation M.", 'Se connecter'],
    ['/connexion/eleve', "Utilise l'identifiant et le code de ta fiche d'accès.", 'Entrer'],
  ])('%s affiche les textes de sa maquette et renvoie vers la connexion école / intervenant', (path, subtitle, button) => {
    mockApi({})
    renderApp(path)

    expect(screen.getByText(subtitle)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: button })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveAttribute('href', '/connexion')
    expect(screen.getByText(/Vous êtes une école ou un intervenant/)).toBeInTheDocument()
  })

  it('relie la connexion de l’établissement aux autres espaces', () => {
    mockApi({})
    renderApp('/connexion')

    const links = within(screen.getByRole('navigation', { name: 'Autres espaces de connexion' }))
    expect(links.getByRole('link', { name: 'Intervenant' })).toHaveAttribute('href', '/connexion/intervenant')
    expect(links.getByRole('link', { name: 'Équipe Fondation M' })).toHaveAttribute('href', '/connexion/fondation')
    expect(links.getByRole('link', { name: 'Mécène' })).toHaveAttribute('href', '/connexion/donateur')
    expect(links.getByRole('link', { name: 'Élève' })).toHaveAttribute('href', '/connexion/eleve')
    expect(screen.getByRole('link', { name: 'Créer un compte' })).toHaveAttribute('href', '/inscription/ecole')
  })

  it('propose à l’intervenant ses onglets et le lien vers l’établissement', () => {
    mockApi({})
    renderApp('/connexion/intervenant')

    const tabs = within(screen.getByRole('navigation', { name: 'Connexion ou inscription' }))
    expect(tabs.getByText('Se connecter')).toHaveAttribute('aria-current', 'page')
    expect(tabs.getByRole('link', { name: 'Devenir intervenant' })).toHaveAttribute('href', '/inscription/intervenant')
    const links = within(screen.getByRole('navigation', { name: 'Autres espaces de connexion' }))
    expect(links.getByRole('link', { name: 'Établissement' })).toHaveAttribute('href', '/connexion')
    expect(links.queryByRole('link', { name: 'Intervenant' })).not.toBeInTheDocument()
  })

  it('l’onglet « Se connecter » de l’inscription intervenant mène à sa connexion', () => {
    mockApi({})
    renderApp('/inscription/intervenant')

    expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveAttribute('href', '/connexion/intervenant')
  })

  it('redirige selon le rôle réel du compte, quelle que soit la page', async () => {
    mockApi({
      'POST /api/auth/login': tokenResponse,
      'GET /api/me': () => jsonResponse(200, speakerMe),
      ...speakerHandlers,
    })
    const { router, user } = renderApp('/connexion/donateur')

    await user.type(screen.getByLabelText(/^E-mail/), 'intervenante@pro.test')
    await user.type(screen.getByLabelText(/^Mot de passe/), FAKE_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(await screen.findByRole('heading', { name: 'Mon agenda' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/intervenant/agenda')
  })

  it('complète l’identifiant de l’élève avec le domaine des élèves', async () => {
    const bodies: unknown[] = []
    mockApi({
      'POST /api/auth/login': recordBodies(bodies, tokenResponse),
      'GET /api/me': () => jsonResponse(200, studentMe),
    })
    const { router, user } = renderApp('/connexion/eleve')

    await user.type(screen.getByLabelText(/^Identifiant/), ' khadija.ba.sor ')
    await user.type(screen.getByLabelText(/^Code d’accès ou mot de passe/), FAKE_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Entrer' }))

    expect(await screen.findByRole('heading', { name: /^Bonjour/ })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/eleve')
    expect(bodies).toEqual([{ email: 'khadija.ba.sor@eleve.fondationm.sn', password: FAKE_PASSWORD }])
  })

  it('envoie tel quel un identifiant d’élève qui contient « @ »', async () => {
    const bodies: unknown[] = []
    mockApi({ 'POST /api/auth/login': recordBodies(bodies, () => errorResponse(401, 'INVALID_CREDENTIALS')) })
    const { user } = renderApp('/connexion/eleve')

    await user.type(screen.getByLabelText(/^Identifiant/), 'khadija@lycee.test')
    await user.type(screen.getByLabelText(/^Code d’accès ou mot de passe/), FAKE_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Entrer' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou mot de passe incorrect.')
    expect(bodies).toEqual([{ email: 'khadija@lycee.test', password: FAKE_PASSWORD }])
  })

  it('valide les champs de l’élève en le tutoyant, sans contrôle de format', async () => {
    const fetchMock = mockApi({})
    const { user } = renderApp('/connexion/eleve')

    await user.click(screen.getByRole('button', { name: 'Entrer' }))

    expect(await screen.findByText('Indique ton identifiant.')).toBeInTheDocument()
    expect(screen.getByText('Indique ton code d’accès ou ton mot de passe.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Code d’accès ou mot de passe/)).toHaveAccessibleDescription(
      'Première connexion ? Tu choisiras ton mot de passe juste après. Indique ton code d’accès ou ton mot de passe.',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('renvoie un utilisateur connecté vers son espace', async () => {
    mockApi({ 'GET /api/me': () => jsonResponse(200, foundationMe), 'GET /api/foundation/accounts': pagedHandler(() => []) })
    const { router } = renderApp('/connexion/eleve', { token: true })

    expect(await screen.findByRole('heading', { level: 1, name: "Bonjour l'équipe" })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/fondation/tableau-de-bord')
  })

  it('ramène une session expirée sur la connexion de la persona', async () => {
    mockApi({
      'GET /api/me': () => jsonResponse(200, speakerMe),
      'GET /api/speaker/slots': () => errorResponse(401, 'UNAUTHENTICATED'),
      'GET /api/speaker/meetings': pagedHandler(() => []),
    })
    const { router } = renderApp('/intervenant/agenda', { token: true })

    expect(await screen.findByText('Votre session a expiré. Merci de vous reconnecter.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/connexion/intervenant')
    expect(tokenStorage.get()).toBeNull()
  })

  it('ramène l’élève sur sa connexion après la déconnexion', async () => {
    mockApi({ 'GET /api/me': () => jsonResponse(200, studentMe) })
    const { router, user } = renderApp('/eleve', { token: true })

    await user.click(await screen.findByRole('button', { name: 'Se déconnecter' }))

    expect(await screen.findByRole('heading', { name: 'Content de te voir !' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/connexion/eleve')
  })
})
