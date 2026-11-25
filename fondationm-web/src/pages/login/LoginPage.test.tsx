import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { onApiEvent, type ApiEvent } from '../../api/events'
import { tokenStorage } from '../../auth/tokenStorage'
import {
  FAKE_TOKEN,
  accountsHandler,
  errorResponse,
  fillLoginForm,
  jsonResponse,
  makeMe,
  mockApi,
  pagedHandler,
  renderApp,
  speakerMe,
  tokenResponse,
} from '../../test/helpers'

describe('Connexion', () => {
  it('connecte un référent d’établissement et l’envoie sur son accueil', async () => {
    const fetchMock = mockApi({
      'POST /api/auth/login': tokenResponse,
      'GET /api/me': () => jsonResponse(200, makeMe()),
    })
    const { router, user } = renderApp('/connexion')

    await fillLoginForm(user)

    expect(await screen.findByRole('heading', { name: 'Intervenants disponibles' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/ecole/intervenants')
    expect(tokenStorage.get()).toBe(FAKE_TOKEN)

    const meRequest = fetchMock.mock.calls.map(([request]) => request).find((r) => r.url.endsWith('/api/me'))
    expect(meRequest?.headers.get('Authorization')).toBe(`Bearer ${FAKE_TOKEN}`)
  })

  it('connecte un intervenant et l’envoie sur son accueil', async () => {
    mockApi({
      'POST /api/auth/login': tokenResponse,
      'GET /api/me': () => jsonResponse(200, speakerMe),
      'GET /api/speaker/slots': pagedHandler(() => []),
      'GET /api/speaker/meetings': pagedHandler(() => []),
    })
    const { router, user } = renderApp('/connexion')

    await fillLoginForm(user)

    // L'accueil de l'intervenant redirige vers son agenda (lot F3).
    expect(await screen.findByRole('heading', { name: 'Mon agenda' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/intervenant/agenda')
  })

  it('envoie un compte PENDING sur la page d’attente', async () => {
    mockApi({
      'POST /api/auth/login': tokenResponse,
      'GET /api/me': () => jsonResponse(200, makeMe({ status: 'PENDING' })),
    })
    const { router, user } = renderApp('/connexion')

    await fillLoginForm(user)

    expect(await screen.findByRole('heading', { name: 'Merci Lycée des Tisserands, votre demande est bien arrivée' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/compte-en-attente')
  })

  it('envoie un compte REJECTED sur la page de refus avec le motif', async () => {
    mockApi({
      'POST /api/auth/login': tokenResponse,
      'GET /api/me': () =>
        jsonResponse(200, makeMe({ status: 'REJECTED', rejectionReason: 'Établissement hors zone.' })),
    })
    const { user } = renderApp('/connexion')

    await fillLoginForm(user)

    expect(await screen.findByRole('heading', { name: 'Votre demande n’a pas pu être acceptée' })).toBeInTheDocument()
    expect(screen.getByText('Établissement hors zone.')).toBeInTheDocument()
  })

  it('envoie un compte avec mustChangePassword sur la page de changement obligatoire', async () => {
    mockApi({
      'POST /api/auth/login': tokenResponse,
      'GET /api/me': () => jsonResponse(200, makeMe({ mustChangePassword: true })),
    })
    const { router, user } = renderApp('/connexion')

    await fillLoginForm(user)

    expect(
      await screen.findByRole('heading', { name: 'Choisissez votre mot de passe' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/mot-de-passe-obligatoire')
  })

  it('affiche le délai d’attente en cas de RATE_LIMITED', async () => {
    mockApi({
      'POST /api/auth/login': () => errorResponse(429, 'RATE_LIMITED', { 'Retry-After': '30' }),
    })
    const { user } = renderApp('/connexion')

    await fillLoginForm(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('Trop de tentatives, réessayez dans 30 secondes.')
    expect(tokenStorage.get()).toBeNull()
  })

  it('affiche une erreur de formulaire sur INVALID_CREDENTIALS sans déconnexion automatique', async () => {
    mockApi({ 'POST /api/auth/login': () => errorResponse(401, 'INVALID_CREDENTIALS') })
    const events: ApiEvent[] = []
    const unsubscribe = onApiEvent((event) => events.push(event))
    const { router, user } = renderApp('/connexion')

    await fillLoginForm(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou mot de passe incorrect.')
    expect(events).toEqual([])
    expect(router.state.location.state).toBeNull()
    expect(screen.queryByText(/Session expirée/)).not.toBeInTheDocument()
    unsubscribe()
  })

  it('affiche les fieldErrors sous les champs concernés', async () => {
    mockApi({
      'POST /api/auth/login': () =>
        jsonResponse(400, {
          code: 'VALIDATION_ERROR',
          message: 'Requête invalide',
          fieldErrors: [{ field: 'email', message: 'Ce domaine e-mail est refusé.' }],
        }),
    })
    const { user } = renderApp('/connexion')

    await fillLoginForm(user)

    expect(await screen.findByLabelText(/^E-mail/)).toHaveAccessibleDescription(
      'Ce domaine e-mail est refusé.',
    )
    expect(screen.getByLabelText(/^E-mail/)).toHaveAttribute('aria-invalid', 'true')
  })

  it('signale un serveur injoignable et propose de réessayer', async () => {
    mockApi({
      'POST /api/auth/login': () => Promise.reject(new TypeError('Failed to fetch')),
    })
    const { user } = renderApp('/connexion')

    await fillLoginForm(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de joindre le serveur.')
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })

  it('accepte un /api/me avec profile null (FOUNDATION) et redirige vers /fondation', async () => {
    mockApi({
      'POST /api/auth/login': tokenResponse,
      'GET /api/foundation/accounts': accountsHandler(() => []),
      'GET /api/me': () =>
        jsonResponse(200, {
          id: '7f1c2a9e-0000-4000-8000-000000000009',
          email: 'equipe@fondation.test',
          role: 'FOUNDATION',
          status: 'VALIDATED',
          rejectionReason: null,
          createdAt: '2026-09-01T08:00:00Z',
          profile: null,
          mustChangePassword: false,
        }),
    })
    const { router, user } = renderApp('/connexion')

    await fillLoginForm(user)

    // /fondation redirige vers les comptes à valider (lot F2).
    expect(await screen.findByRole('heading', { name: 'Comptes à valider' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/fondation/comptes')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('accepte un /api/me avec rejectionReason null (SCHOOL PENDING) et redirige vers /compte-en-attente', async () => {
    mockApi({
      'POST /api/auth/login': tokenResponse,
      'GET /api/me': () =>
        jsonResponse(200, {
          id: '7f1c2a9e-0000-4000-8000-000000000010',
          email: 'referent@ecole.test',
          role: 'SCHOOL',
          status: 'PENDING',
          rejectionReason: null,
          createdAt: '2026-11-20T12:00:00Z',
          profile: {
            type: 'SCHOOL',
            schoolName: 'sncorp',
            city: 'Dakar',
            country: 'Sénégal',
            schoolType: 'TRAINING_CENTER',
            referentRole: 'referent',
            phone: null,
            charterAcceptedAt: '2026-11-20T12:00:00Z',
          },
          mustChangePassword: false,
        }),
    })
    const { router, user } = renderApp('/connexion')

    await fillLoginForm(user)

    expect(
      await screen.findByRole('heading', { name: 'Merci sncorp, votre demande est bien arrivée' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/compte-en-attente')
  })

  it('n’affiche pas une exception interne comme une panne réseau', async () => {
    mockApi({
      'POST /api/auth/login': tokenResponse,
      'GET /api/me': () =>
        new Response('<html>pas du JSON</html>', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    })
    const { router, user } = renderApp('/connexion')

    await fillLoginForm(user)

    expect(await screen.findByRole('alert')).toHaveTextContent("Une erreur inattendue s'est produite. Réessayez.")
    expect(screen.queryByText(/Impossible de joindre le serveur/)).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/connexion')
    expect(tokenStorage.get()).toBeNull()
  })

  it('valide les champs avant tout appel réseau', async () => {
    const fetchMock = mockApi({})
    const { user } = renderApp('/connexion')

    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(await screen.findByText('Indiquez votre adresse e-mail.')).toBeInTheDocument()
    expect(screen.getByText('Indiquez votre mot de passe.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
