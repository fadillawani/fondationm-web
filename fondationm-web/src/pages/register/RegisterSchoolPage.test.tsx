import { screen } from '@testing-library/react'
import type userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import {
  FAKE_PASSWORD,
  errorResponse,
  jsonResponse,
  makeMe,
  mockApi,
  recordBodies,
  renderApp,
  tokenResponse,
} from '../../test/helpers'

type User = ReturnType<typeof userEvent.setup>

const pendingSchool = makeMe({ status: 'PENDING' })

async function fillSchoolForm(user: User) {
  await user.type(screen.getByLabelText(/^Nom de l'établissement/), 'Lycée des Tisserands')
  await user.selectOptions(screen.getByLabelText(/^Type/), 'HIGH_SCHOOL')
  await user.type(screen.getByLabelText(/^Pays/), 'Sénégal')
  await user.type(screen.getByLabelText(/^Zone \(ville\)/), 'Dakar')
  await user.type(screen.getByLabelText(/^Fonction/), 'Proviseure')
  await user.type(screen.getByLabelText(/^E-mail professionnel/), 'referent@ecole.test')
  await user.type(screen.getByLabelText(/^Téléphone/), '+221 77 000 00 00')
  await user.type(screen.getByLabelText(/^Mot de passe/), FAKE_PASSWORD)
  await user.click(screen.getByLabelText(/J'accepte la charte des rencontres/))
}

function submit(user: User) {
  return user.click(screen.getByRole('button', { name: 'Envoyer la demande de compte' }))
}

describe('Inscription établissement', () => {
  it('valide les champs obligatoires et la charte avant tout appel', async () => {
    const fetchMock = mockApi({})
    const { user } = renderApp('/inscription/ecole')

    await submit(user)

    expect(await screen.findByText("Indiquez le nom de l'établissement.")).toBeInTheDocument()
    expect(screen.getByText("Choisissez le type d'établissement.")).toBeInTheDocument()
    expect(screen.getByText('Indiquez votre fonction.')).toBeInTheDocument()
    expect(screen.getByText('Indiquez un numéro de téléphone.')).toBeInTheDocument()
    expect(screen.getByText('8 caractères minimum.')).toBeInTheDocument()
    expect(screen.getByText('Vous devez accepter la charte pour envoyer votre demande.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuse l’envoi tant que la charte n’est pas cochée', async () => {
    const fetchMock = mockApi({})
    const { user } = renderApp('/inscription/ecole')

    await fillSchoolForm(user)
    await user.click(screen.getByLabelText(/J'accepte la charte des rencontres/))
    await submit(user)

    expect(await screen.findByText('Vous devez accepter la charte pour envoyer votre demande.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('inscrit l’établissement, connecte automatiquement et ouvre la page d’attente', async () => {
    const registerBodies: unknown[] = []
    const loginBodies: unknown[] = []
    mockApi({
      'POST /api/auth/register/school': recordBodies(registerBodies, () => jsonResponse(201, pendingSchool)),
      'POST /api/auth/login': recordBodies(loginBodies, tokenResponse),
      'GET /api/me': () => jsonResponse(200, pendingSchool),
    })
    const { router, user } = renderApp('/inscription/ecole')

    await fillSchoolForm(user)
    await submit(user)

    expect(
      await screen.findByRole('heading', { name: 'Merci Lycée des Tisserands, votre demande est bien arrivée' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/compte-en-attente')
    expect(registerBodies).toEqual([
      {
        schoolName: 'Lycée des Tisserands',
        schoolType: 'HIGH_SCHOOL',
        country: 'Sénégal',
        city: 'Dakar',
        referentRole: 'Proviseure',
        email: 'referent@ecole.test',
        phone: '+221 77 000 00 00',
        password: FAKE_PASSWORD,
        charterAccepted: true,
      },
    ])
    expect(loginBodies).toEqual([{ email: 'referent@ecole.test', password: FAKE_PASSWORD }])
  })

  it('affiche les fieldErrors du serveur sous les champs concernés', async () => {
    mockApi({
      'POST /api/auth/register/school': () =>
        jsonResponse(400, {
          code: 'VALIDATION_ERROR',
          message: 'Requête invalide',
          fieldErrors: [{ field: 'phone', message: 'Numéro de téléphone refusé par le serveur.' }],
        }),
    })
    const { user } = renderApp('/inscription/ecole')

    await fillSchoolForm(user)
    await submit(user)

    expect(await screen.findByLabelText(/^Téléphone/)).toHaveAccessibleDescription(
      'Numéro de téléphone refusé par le serveur.',
    )
  })

  it('affiche un e-mail déjà utilisé (409 sans fieldErrors) sous le champ e-mail', async () => {
    mockApi({
      'POST /api/auth/register/school': () =>
        jsonResponse(409, { code: 'EMAIL_ALREADY_USED', message: 'Cette adresse e-mail est déjà utilisée.', fieldErrors: [] }),
    })
    const { user } = renderApp('/inscription/ecole')

    await fillSchoolForm(user)
    await submit(user)

    expect(await screen.findByLabelText(/^E-mail professionnel/)).toHaveAccessibleDescription(
      'Cette adresse e-mail est déjà utilisée.',
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('affiche une alerte pour une autre erreur du serveur', async () => {
    mockApi({ 'POST /api/auth/register/school': () => errorResponse(503, 'SERVER_ERROR') })
    const { user } = renderApp('/inscription/ecole')

    await fillSchoolForm(user)
    await submit(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('Le serveur a rencontré un problème.')
  })

  it('renvoie vers la connexion si la connexion automatique échoue', async () => {
    mockApi({
      'POST /api/auth/register/school': () => jsonResponse(201, pendingSchool),
      'POST /api/auth/login': () => errorResponse(500, 'SERVER_ERROR'),
    })
    const { router, user } = renderApp('/inscription/ecole')

    await fillSchoolForm(user)
    await submit(user)

    expect(await screen.findByText('Compte créé. Connectez-vous pour suivre votre demande.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/connexion')
  })
})
