import { screen } from '@testing-library/react'
import type userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import {
  FAKE_PASSWORD,
  jsonResponse,
  makeMe,
  mockApi,
  recordBodies,
  renderApp,
  tokenResponse,
} from '../../test/helpers'

type User = ReturnType<typeof userEvent.setup>

const pendingSpeaker = makeMe({
  email: 'intervenante@pro.test',
  role: 'SPEAKER',
  status: 'PENDING',
  profile: { type: 'SPEAKER', fullName: 'Awa Diallo', jobTitle: 'Ingénieure réseaux', city: 'Dakar', country: 'Sénégal' },
})

async function fillSpeakerForm(user: User, { withSkills = true } = {}) {
  await user.type(screen.getByLabelText(/^Prénom et nom/), 'Awa Diallo')
  await user.type(screen.getByLabelText(/^Votre métier/), 'Ingénieure réseaux')
  await user.selectOptions(screen.getByLabelText(/^Votre secteur/), 'DIGITAL')
  await user.type(screen.getByLabelText(/^Pays/), 'Sénégal')
  await user.type(screen.getByLabelText(/^Zone \(ville\)/), 'Dakar')
  if (withSkills) {
    await user.click(screen.getByRole('button', { name: 'Réseaux' }))
    await user.click(screen.getByRole('button', { name: 'Cybersécurité' }))
    await user.type(screen.getByLabelText('Ajouter une autre compétence'), 'Radio mobile{Enter}')
  }
  await user.type(screen.getByLabelText(/^E-mail/), 'intervenante@pro.test')
  await user.type(screen.getByLabelText(/^Téléphone/), '77 000 00 00')
  await user.type(screen.getByLabelText(/^Mot de passe/), FAKE_PASSWORD)
  await user.click(screen.getByLabelText(/J'accepte la charte des intervenants/))
}

function submit(user: User) {
  return user.click(screen.getByRole('button', { name: 'Envoyer ma demande' }))
}

describe('Inscription intervenant', () => {
  it('valide les champs obligatoires, les compétences et la charte', async () => {
    const fetchMock = mockApi({})
    const { user } = renderApp('/inscription/intervenant')

    await submit(user)

    expect(await screen.findByText('Indiquez votre prénom et votre nom.')).toBeInTheDocument()
    expect(screen.getByText('Indiquez votre métier.')).toBeInTheDocument()
    expect(screen.getByText("Choisissez votre secteur d'activité.")).toBeInTheDocument()
    expect(screen.getByText('Choisissez au moins une compétence.')).toBeInTheDocument()
    expect(screen.getByText('Vous devez accepter la charte pour envoyer votre demande.')).toBeInTheDocument()
    expect(screen.queryByText('Indiquez la structure.')).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('exige au moins une compétence', async () => {
    const fetchMock = mockApi({})
    const { user } = renderApp('/inscription/intervenant')

    await fillSpeakerForm(user, { withSkills: false })
    await submit(user)

    expect(await screen.findByText('Choisissez au moins une compétence.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('inscrit l’intervenant avec ses compétences et ouvre la page d’attente', async () => {
    const registerBodies: unknown[] = []
    const fetchMock = mockApi({
      'POST /api/auth/register/speaker': recordBodies(registerBodies, () => jsonResponse(201, pendingSpeaker)),
      'POST /api/auth/login': tokenResponse,
      'GET /api/me': () => jsonResponse(200, pendingSpeaker),
    })
    const { router, user } = renderApp('/inscription/intervenant')

    await fillSpeakerForm(user)
    await submit(user)

    expect(await screen.findByRole('heading', { name: 'Merci Awa, les jeunes vont avoir de la chance' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/compte-en-attente')
    expect(registerBodies).toEqual([
      {
        fullName: 'Awa Diallo',
        jobTitle: 'Ingénieure réseaux',
        sector: 'DIGITAL',
        country: 'Sénégal',
        city: 'Dakar',
        skills: ['Réseaux', 'Cybersécurité', 'Radio mobile'],
        email: 'intervenante@pro.test',
        phone: '77 000 00 00',
        password: FAKE_PASSWORD,
        charterAccepted: true,
      },
    ])
    const calledUrls = fetchMock.mock.calls.map(([request]) => new URL(request.url).pathname)
    expect(calledUrls).not.toContain('/api/speaker/profile/skills')
  })

  it('affiche EMAIL_ALREADY_USED (409) sous le champ e-mail', async () => {
    mockApi({
      'POST /api/auth/register/speaker': () =>
        jsonResponse(409, {
          code: 'EMAIL_ALREADY_USED',
          message: 'Cette adresse e-mail est déjà utilisée.',
          fieldErrors: [],
        }),
    })
    const { router, user } = renderApp('/inscription/intervenant')

    await fillSpeakerForm(user)
    await submit(user)

    expect(await screen.findByLabelText(/^E-mail/)).toHaveAccessibleDescription(
      'Cette adresse e-mail est déjà utilisée.',
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/inscription/intervenant')
  })
})
