import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { jsonResponse, makeMe, mockApi, renderApp } from '../../test/helpers'

describe('Choix du type de compte', () => {
  it('propose les deux inscriptions et la connexion', async () => {
    mockApi({})
    const { router, user } = renderApp('/inscription')

    expect(screen.getByRole('link', { name: /Je représente un établissement/ })).toHaveAttribute(
      'href',
      '/inscription/ecole',
    )
    expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveAttribute('href', '/connexion')

    await user.click(screen.getByRole('link', { name: /Je suis un professionnel/ }))

    expect(await screen.findByRole('heading', { name: 'Créer mon compte intervenant' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/inscription/intervenant')
  })

  it('la connexion de l’établissement mène à son inscription par l’onglet « Créer un compte »', async () => {
    mockApi({})
    const { router, user } = renderApp('/connexion')

    expect(screen.getByText('Se connecter', { selector: '[aria-current="page"]' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Créer un compte' }))

    expect(await screen.findByRole('heading', { name: "Créer le compte de l'établissement" })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/inscription/ecole')
  })

  it.each(['/inscription', '/inscription/ecole', '/inscription/intervenant'])(
    'redirige un utilisateur connecté de %s vers son accueil',
    async (path) => {
      mockApi({ 'GET /api/me': () => jsonResponse(200, makeMe()) })
      const { router } = renderApp(path, { token: true })

      expect(await screen.findByRole('heading', { name: 'Intervenants disponibles' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/ecole/intervenants')
    },
  )
})
