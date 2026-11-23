import { act, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { api } from '../api/client'
import { tokenStorage } from '../auth/tokenStorage'
import { errorResponse, jsonResponse, makeMe, mockApi, renderApp, speakerMe } from '../test/helpers'

describe('Gardes de routes', () => {
  it('renvoie vers la connexion sans jeton', async () => {
    const fetchMock = mockApi({})
    const { router } = renderApp('/ecole')

    expect(await screen.findByRole('heading', { name: 'Bon retour parmi nous' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/connexion')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('renvoie un mauvais rôle vers l’accueil de son propre rôle', async () => {
    mockApi({ 'GET /api/me': () => jsonResponse(200, speakerMe) })
    const { router } = renderApp('/ecole', { token: true })

    expect(await screen.findByRole('heading', { name: 'Bonjour Awa Diallo !' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/intervenant')
  })

  it('renvoie un compte validé hors de la page d’attente', async () => {
    mockApi({ 'GET /api/me': () => jsonResponse(200, makeMe()) })
    const { router } = renderApp('/compte-en-attente', { token: true })

    expect(await screen.findByRole('heading', { name: /^Bonjour/ })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/ecole')
  })

  it('déconnecte et affiche « Session expirée » sur un 401', async () => {
    mockApi({ 'GET /api/me': () => errorResponse(401, 'UNAUTHENTICATED') })
    const { router, queryClient } = renderApp('/ecole', { token: true })

    expect(await screen.findByText('Votre session a expiré. Merci de vous reconnecter.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/connexion')
    expect(tokenStorage.get()).toBeNull()
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })

  it('efface le jeton et le cache à la déconnexion', async () => {
    mockApi({ 'GET /api/me': () => jsonResponse(200, makeMe()) })
    const { router, queryClient, user } = renderApp('/ecole', { token: true })

    await user.click(await screen.findByRole('button', { name: 'Se déconnecter' }))

    expect(await screen.findByRole('heading', { name: 'Bon retour parmi nous' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/connexion')
    expect(tokenStorage.get()).toBeNull()
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    expect(screen.queryByText(/Session expirée/)).not.toBeInTheDocument()
  })

  it('redirige vers le changement de mot de passe sur PASSWORD_CHANGE_REQUIRED', async () => {
    let me = makeMe()
    mockApi({
      'GET /api/me': () => jsonResponse(200, me),
      'GET /api/school/dashboard': () => errorResponse(403, 'PASSWORD_CHANGE_REQUIRED'),
    })
    const { router } = renderApp('/ecole', { token: true })
    await screen.findByRole('heading', { name: /^Bonjour/ })

    me = makeMe({ mustChangePassword: true })
    await act(() => api.GET('/api/school/dashboard'))

    expect(
      await screen.findByRole('heading', { name: 'Choisissez votre mot de passe' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/mot-de-passe-obligatoire')
  })

  it('redirige vers la page du statut sur ACCOUNT_NOT_VALIDATED', async () => {
    let me = makeMe()
    mockApi({
      'GET /api/me': () => jsonResponse(200, me),
      'GET /api/school/dashboard': () => errorResponse(403, 'ACCOUNT_NOT_VALIDATED'),
    })
    const { router } = renderApp('/ecole', { token: true })
    await screen.findByRole('heading', { name: /^Bonjour/ })

    me = makeMe({ status: 'PENDING' })
    await act(() => api.GET('/api/school/dashboard'))

    expect(await screen.findByRole('heading', { name: 'Merci Lycée des Tisserands, votre demande est bien arrivée' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/compte-en-attente')
  })
})
