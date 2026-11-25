import { screen } from '@testing-library/react'
import type userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { tokenStorage } from '../auth/tokenStorage'
import {
  FAKE_NEW_PASSWORD,
  FAKE_NEW_TOKEN,
  FAKE_PASSWORD,
  FAKE_TOKEN,
  jsonResponse,
  makeMe,
  mockApi,
  recordBodies,
  renderApp,
} from '../test/helpers'

type User = ReturnType<typeof userEvent.setup>

async function fillForm(user: User, confirmation = FAKE_NEW_PASSWORD) {
  await user.type(await screen.findByLabelText(/^Mot de passe actuel/), FAKE_PASSWORD)
  await user.type(screen.getByLabelText(/^Nouveau mot de passe/), FAKE_NEW_PASSWORD)
  await user.type(screen.getByLabelText(/^Confirmer le nouveau mot de passe/), confirmation)
  await user.click(screen.getByRole('button', { name: 'Enregistrer mon mot de passe' }))
}

describe('Changement de mot de passe obligatoire', () => {
  it('stocke le nouveau jeton, relit /api/me et ouvre l’accueil du rôle', async () => {
    let me = makeMe({ mustChangePassword: true })
    const bodies: unknown[] = []
    const fetchMock = mockApi({
      'GET /api/me': () => jsonResponse(200, me),
      'POST /api/me/password': recordBodies(bodies, () => {
        me = makeMe({ mustChangePassword: false })
        return jsonResponse(200, { accessToken: FAKE_NEW_TOKEN, tokenType: 'Bearer', expiresIn: 28_800 })
      }),
    })
    const { router, user } = renderApp('/mot-de-passe-obligatoire', { token: true })

    await fillForm(user)

    expect(await screen.findByRole('heading', { name: 'Bonjour Lycée des Tisserands !' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/ecole')
    expect(bodies).toEqual([{ currentPassword: FAKE_PASSWORD, newPassword: FAKE_NEW_PASSWORD }])
    expect(tokenStorage.get()).toBe(FAKE_NEW_TOKEN)

    const lastMe = fetchMock.mock.calls.map(([request]) => request).findLast((r) => r.url.endsWith('/api/me'))
    expect(lastMe?.headers.get('Authorization')).toBe(`Bearer ${FAKE_NEW_TOKEN}`)
  })

  it('affiche l’erreur du serveur sous le mot de passe actuel', async () => {
    mockApi({
      'GET /api/me': () => jsonResponse(200, makeMe({ mustChangePassword: true })),
      'POST /api/me/password': () =>
        jsonResponse(400, {
          code: 'VALIDATION_ERROR',
          message: 'Requête invalide',
          fieldErrors: [{ field: 'currentPassword', message: 'Mot de passe actuel incorrect.' }],
        }),
    })
    const { router, user } = renderApp('/mot-de-passe-obligatoire', { token: true })

    await fillForm(user)

    expect(await screen.findByLabelText(/^Mot de passe actuel/)).toHaveAccessibleDescription(
      'Mot de passe actuel incorrect.',
    )
    expect(router.state.location.pathname).toBe('/mot-de-passe-obligatoire')
    expect(tokenStorage.get()).toBe(FAKE_TOKEN)
  })

  it('vérifie la confirmation côté client', async () => {
    const fetchMock = mockApi({ 'GET /api/me': () => jsonResponse(200, makeMe({ mustChangePassword: true })) })
    const { user } = renderApp('/mot-de-passe-obligatoire', { token: true })

    await fillForm(user, 'autre-valeur-factice')

    expect(await screen.findByText('Les deux mots de passe ne sont pas identiques.')).toBeInTheDocument()
    expect(fetchMock.mock.calls.map(([request]) => new URL(request.url).pathname)).not.toContain('/api/me/password')
  })

  it('est réservée aux comptes qui doivent changer de mot de passe', async () => {
    mockApi({ 'GET /api/me': () => jsonResponse(200, makeMe()) })
    const { router } = renderApp('/mot-de-passe-obligatoire', { token: true })

    expect(await screen.findByRole('heading', { name: 'Bonjour Lycée des Tisserands !' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/ecole')
  })
})
