import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { tokenStorage } from '../../auth/tokenStorage'
import { donorMe } from '../../test/donorFixtures'
import { FakeXhr, SECURE_URL, SIGNATURE, imageFile } from '../../test/fakeXhr'
import { FAKE_NEW_PASSWORD, FAKE_NEW_TOKEN, FAKE_PASSWORD, FAKE_TOKEN, errorResponse, foundationMe, jsonResponse, makeMe, mockApi, renderApp } from '../../test/helpers'
import { studentMe } from '../../test/studentFixtures'

type Handler = Parameters<typeof mockApi>[0][string]

const SPEAKER_PROFILE = {
  type: 'SPEAKER',
  fullName: 'Awa Diallo',
  jobTitle: 'Ingénieure réseaux',
  organization: 'Sonatel',
  sector: 'DIGITAL',
  motivation: 'Montrer les métiers du numérique.',
  phone: '+221 70 000 00 02',
  city: 'Dakar',
  country: 'Sénégal',
  skills: ['Réseaux', 'Cybersécurité'],
  photoUrl: null as string | null,
}

const SCHOOL_PROFILE = {
  type: 'SCHOOL',
  schoolName: 'Lycée des Tisserands',
  city: 'Dakar',
  country: 'Sénégal',
  schoolType: 'HIGH_SCHOOL',
  referentRole: 'Proviseure',
  phone: '+221 70 000 00 01',
  photoUrl: null as string | null,
}

beforeEach(() => {
  FakeXhr.install()
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn<() => string>(() => 'blob:apercu'), revokeObjectURL: vi.fn<() => void>() }))
})
afterEach(() => {
  vi.useRealTimers()
})

/** Backend simulé du profil : `/api/me`, signature, PUT et DELETE de la photo, PATCH et PUT des profils. */
function setup(role: 'SPEAKER' | 'SCHOOL', extra: Record<string, Handler> = {}) {
  const profile = { ...(role === 'SPEAKER' ? SPEAKER_PROFILE : SCHOOL_PROFILE) }
  const bodies: { key: string; body: unknown }[] = []
  const me = () => makeMe({ role, email: role === 'SPEAKER' ? 'intervenante@pro.test' : 'referent@ecole.test', profile: profile as never })
  const record = (key: string) => async (request: Request) => {
    const text = await request.text()
    bodies.push({ key, body: text ? JSON.parse(text) : null })
  }
  const fetchMock = mockApi({
    'GET /api/me': () => jsonResponse(200, me()),
    'POST /api/me/photo/signature': () => jsonResponse(200, SIGNATURE),
    'PUT /api/me/photo': async (request) => {
      await record('PUT photo')(request)
      profile.photoUrl = (bodies.at(-1)?.body as { photoUrl: string } | undefined)?.photoUrl ?? null
      return jsonResponse(200, profile)
    },
    'DELETE /api/me/photo': () => {
      bodies.push({ key: 'DELETE photo', body: null })
      profile.photoUrl = null
      return new Response(null, { status: 204 })
    },
    'PATCH /api/speaker/profile': async (request) => {
      await record('PATCH speaker')(request)
      Object.assign(profile, bodies.at(-1)?.body)
      return jsonResponse(200, profile)
    },
    'PUT /api/speaker/profile/skills': async (request) => {
      await record('PUT skills')(request)
      Object.assign(profile, bodies.at(-1)?.body)
      return jsonResponse(200, profile)
    },
    'PATCH /api/school/profile': async (request) => {
      await record('PATCH school')(request)
      Object.assign(profile, bodies.at(-1)?.body)
      return jsonResponse(200, profile)
    },
    ...extra,
  })
  const calls = (method: string, path: string) =>
    fetchMock.mock.calls.map(([request]) => request).filter((request) => request.method === method && new URL(request.url).pathname === path)
  return { profile, bodies, fetchMock, calls }
}

async function choose(file: File) {
  const input = await screen.findByLabelText(/Choisir une image/)
  fireEvent.change(input, { target: { files: [file] } })
}

describe('Mon profil : photo de l’intervenant', () => {
  it('enchaîne signature, envoi à Cloudinary (paramètres signés exacts) puis enregistrement', async () => {
    const { bodies, calls } = setup('SPEAKER')
    const { user } = renderApp('/intervenant/profil', { token: true })

    expect(await screen.findByRole('heading', { level: 1, name: 'Mon profil' })).toBeInTheDocument()
    expect(screen.getByText('Votre photo sera visible des établissements avec lesquels vous êtes en relation, et des élèves de la classe concernée.')).toBeInTheDocument()
    await choose(imageFile('moi.jpg', 'image/jpeg'))
    expect(await screen.findByRole('img', { name: 'Aperçu : moi.jpg' })).toHaveClass('object-cover')
    await user.click(screen.getByRole('button', { name: 'Enregistrer la photo' }))

    await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(1))
    const xhr = FakeXhr.last()
    expect(xhr.url).toBe('https://api.cloudinary.com/v1_1/nuage-de-test/image/upload')
    expect(xhr.headers).toEqual({})
    expect(xhr.fields()).toEqual({
      file: 'fichier:moi.jpg',
      api_key: SIGNATURE.apiKey,
      timestamp: String(SIGNATURE.timestamp),
      signature: SIGNATURE.signature,
      public_id: SIGNATURE.publicId,
      asset_folder: SIGNATURE.assetFolder,
      overwrite: 'true',
      invalidate: 'true',
      allowed_formats: SIGNATURE.allowedFormats,
      transformation: SIGNATURE.transformation,
    })
    expect(screen.getByRole('button', { name: /Enregistrer la photo/ })).toBeDisabled()
    xhr.progress(1024, 2048)
    expect(await screen.findByText('Envoi : 50 %')).toBeInTheDocument()
    xhr.respond(200, { secure_url: SECURE_URL })

    expect(await screen.findByText('Photo enregistrée.')).toBeInTheDocument()
    expect(bodies).toEqual([{ key: 'PUT photo', body: { photoUrl: SECURE_URL } }])
    expect(calls('POST', '/api/me/photo/signature')).toHaveLength(1)
    expect(await screen.findByRole('img', { name: 'Votre photo actuelle' })).toHaveAttribute('src', SECURE_URL)
  })

  it('refuse un fichier invalide sans rien demander au serveur', async () => {
    const { calls } = setup('SPEAKER')
    renderApp('/intervenant/profil', { token: true })

    await choose(imageFile('anim.gif', 'image/gif'))
    expect(await screen.findByText('Choisissez une image JPG, PNG ou WebP.')).toBeInTheDocument()
    await choose(imageFile('lourd.jpg', 'image/jpeg', 'jpg', 5 * 1024 * 1024 + 1))
    expect(await screen.findByText('L’image dépasse 5 Mo.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enregistrer la photo' })).not.toBeInTheDocument()
    expect(calls('POST', '/api/me/photo/signature')).toHaveLength(0)
    expect(FakeXhr.instances).toHaveLength(0)
  })

  it('signale chaque étape en échec : signature (429), envoi expiré, enregistrement refusé puis réessayé', async () => {
    let signatureFails = true
    const { bodies } = setup('SPEAKER', {
      'POST /api/me/photo/signature': () => (signatureFails ? errorResponse(429, 'RATE_LIMITED') : jsonResponse(200, SIGNATURE)),
    })
    const { user } = renderApp('/intervenant/profil', { token: true })

    await choose(imageFile('moi.jpg', 'image/jpeg'))
    await user.click(await screen.findByRole('button', { name: 'Enregistrer la photo' }))
    const signing = await screen.findByRole('alert')
    expect(signing).toHaveTextContent('L’envoi n’a pas pu être préparé.')
    expect(signing).toHaveTextContent('Trop de tentatives. Patientez un peu avant de réessayer.')
    expect(FakeXhr.instances).toHaveLength(0)

    signatureFails = false
    FakeXhr.autoRespond = (xhr) => xhr.respond(400, { error: { message: 'Stale request - reported time is too old' } })
    await user.click(screen.getByRole('button', { name: 'Enregistrer la photo' }))
    expect(await screen.findByText('Le délai est dépassé, recommencez.')).toBeInTheDocument()
    expect(bodies).toEqual([])
    expect(FakeXhr.instances).toHaveLength(1)
  })

  it('garde l’image envoyée si l’enregistrement échoue et ne renvoie que le PUT', async () => {
    let saveFails = true
    const { bodies } = setup('SPEAKER', {
      'PUT /api/me/photo': async (request) => {
        bodies.push({ key: 'PUT photo', body: await request.json() })
        return saveFails
          ? jsonResponse(400, { code: 'VALIDATION_ERROR', message: 'Requête invalide', fieldErrors: [{ field: 'photoUrl', message: 'Adresse refusée.' }] })
          : jsonResponse(200, SPEAKER_PROFILE)
      },
    })
    const { user } = renderApp('/intervenant/profil', { token: true })

    FakeXhr.autoRespond = (xhr) => xhr.respond(200, { secure_url: SECURE_URL })
    await choose(imageFile('moi.jpg', 'image/jpeg'))
    await user.click(await screen.findByRole('button', { name: 'Enregistrer la photo' }))
    expect(await screen.findByText('La photo n’a pas pu être enregistrée.')).toBeInTheDocument()

    saveFails = false
    await user.click(screen.getByRole('button', { name: 'Réessayer l’enregistrement' }))
    expect(await screen.findByText('Photo enregistrée.')).toBeInTheDocument()
    expect(FakeXhr.instances).toHaveLength(1)
    expect(bodies.map((entry) => entry.body)).toEqual([{ photoUrl: SECURE_URL }, { photoUrl: SECURE_URL }])
  })

  it('annule l’envoi en cours : aucun enregistrement', async () => {
    const { bodies } = setup('SPEAKER')
    const { user } = renderApp('/intervenant/profil', { token: true })

    await choose(imageFile('moi.jpg', 'image/jpeg'))
    await user.click(await screen.findByRole('button', { name: 'Enregistrer la photo' }))
    await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(1))
    await user.click(screen.getByRole('button', { name: 'Annuler l’envoi' }))
    expect(FakeXhr.last().aborted).toBe(true)
    expect(await screen.findByText('Envoi annulé.')).toBeInTheDocument()
    expect(bodies).toEqual([])
  })

  it('retire la photo après confirmation (focus sur « Annuler ») et revient aux initiales', async () => {
    const { profile, bodies } = setup('SPEAKER')
    profile.photoUrl = SECURE_URL
    const { user } = renderApp('/intervenant/profil', { token: true })

    expect(await screen.findByRole('img', { name: 'Votre photo actuelle' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retirer la photo' }))
    const dialog = await screen.findByRole('dialog', { name: 'Retirer votre photo ?' })
    expect(within(dialog).getByRole('button', { name: 'Annuler' })).toHaveFocus()
    await user.click(within(dialog).getByRole('button', { name: 'Retirer' }))
    expect(await screen.findByText('Photo retirée.')).toBeInTheDocument()
    expect(bodies).toEqual([{ key: 'DELETE photo', body: null }])
    await vi.waitFor(() => expect(screen.queryByRole('img', { name: 'Votre photo actuelle' })).not.toBeInTheDocument())
  })
})

describe('Mon profil : informations', () => {
  it('intervenant : n’envoie que les champs modifiés, et les compétences par leur propre PUT', async () => {
    const { bodies } = setup('SPEAKER')
    const { user } = renderApp('/intervenant/profil', { token: true })

    const job = await screen.findByLabelText(/^Votre métier/)
    await user.clear(job)
    await user.type(job, 'Architecte réseaux')
    await user.click(screen.getByRole('button', { name: 'Enregistrer mon profil' }))
    expect(await screen.findByText('Profil enregistré.')).toBeInTheDocument()
    expect(bodies).toEqual([{ key: 'PATCH speaker', body: { jobTitle: 'Architecte réseaux' } }])

    await user.click(screen.getByRole('button', { name: 'Cybersécurité' }))
    await user.click(screen.getByRole('button', { name: 'Enregistrer mon profil' }))
    await vi.waitFor(() => expect(bodies.at(-1)).toEqual({ key: 'PUT skills', body: { skills: ['Réseaux'] } }))
    expect(bodies.filter((entry) => entry.key === 'PATCH speaker')).toHaveLength(1)
  })

  it('intervenant : refuse un métier vide et un téléphone mal formé sans rien envoyer', async () => {
    const { bodies } = setup('SPEAKER')
    const { user } = renderApp('/intervenant/profil', { token: true })

    await user.clear(await screen.findByLabelText(/^Votre métier/))
    await user.type(screen.getByLabelText(/^Téléphone/), 'abc')
    await user.click(screen.getByRole('button', { name: 'Enregistrer mon profil' }))
    expect(await screen.findByText('Indiquez votre métier.')).toBeInTheDocument()
    expect(screen.getByText('De 6 à 30 caractères : chiffres, espaces et + ( ) . - uniquement.')).toBeInTheDocument()
    expect(bodies).toEqual([])
  })

  it('école : logo sans recadrage (object-contain) et PATCH partiel du profil', async () => {
    const { bodies } = setup('SCHOOL')
    const { user } = renderApp('/ecole/profil', { token: true })

    expect(await screen.findByText('Votre logo sera visible des intervenants et de la Fondation M avec qui vous préparez des rencontres.')).toBeInTheDocument()
    await choose(imageFile('logo.png', 'image/png', 'png'))
    expect(await screen.findByRole('img', { name: 'Aperçu : logo.png' })).toHaveClass('object-contain')

    const role = screen.getByLabelText(/^Fonction/)
    await user.clear(role)
    await user.type(role, 'Censeur')
    await user.click(screen.getByRole('button', { name: 'Enregistrer le profil' }))
    expect(await screen.findByText('Profil enregistré.')).toBeInTheDocument()
    expect(bodies).toEqual([{ key: 'PATCH school', body: { referentRole: 'Censeur' } }])
  })

  it.each([
    ['DONOR', donorMe, '/donateur/profil', 'Ousmane Diaw'],
    ['STUDENT', studentMe, '/eleve/profil', 'Khadija Ba'],
    ['FOUNDATION', foundationMe, '/fondation/profil', 'equipe@fondation.test'],
  ])('%s : lecture seule, sans photo ni enregistrement de profil', async (_role, me, path, shown) => {
    const fetchMock = mockApi({ 'GET /api/me': () => jsonResponse(200, me) })
    renderApp(path, { token: true })

    expect(await screen.findByRole('heading', { level: 1, name: 'Mon profil' })).toBeInTheDocument()
    expect(screen.getAllByText(shown).length).toBeGreaterThan(0)
    expect(screen.queryByLabelText(/Choisir une image/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Enregistrer (mon|le) profil/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Changer le mot de passe' })).toBeInTheDocument()
    expect(fetchMock.mock.calls.every(([request]) => request.method === 'GET')).toBe(true)
  })
})

describe('Mon profil : mot de passe', () => {
  it('remplace le jeton, reste sur la page et n’envoie plus rien avec l’ancien jeton', async () => {
    const { fetchMock } = setup('SPEAKER', {
      'POST /api/me/password': () => jsonResponse(200, { accessToken: FAKE_NEW_TOKEN, tokenType: 'Bearer', expiresIn: 28_800 }),
    })
    const { user, router } = renderApp('/intervenant/profil', { token: true })

    await user.type(await screen.findByLabelText(/^Mot de passe actuel/), FAKE_PASSWORD)
    await user.type(screen.getByLabelText(/^Nouveau mot de passe/), FAKE_NEW_PASSWORD)
    await user.type(screen.getByLabelText(/^Confirmer le nouveau mot de passe/), FAKE_NEW_PASSWORD)
    const before = fetchMock.mock.calls.length
    await user.click(screen.getByRole('button', { name: 'Changer le mot de passe' }))

    expect(await screen.findByText('Votre mot de passe est modifié.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/intervenant/profil')
    expect(tokenStorage.get()).toBe(FAKE_NEW_TOKEN)
    const after = fetchMock.mock.calls.slice(before).map(([request]) => request)
    const passwordIndex = after.findIndex((request) => new URL(request.url).pathname === '/api/me/password')
    expect(after[passwordIndex]?.headers.get('Authorization')).toBe(`Bearer ${FAKE_TOKEN}`)
    const later = after.slice(passwordIndex + 1)
    expect(later.length).toBeGreaterThan(0)
    expect(later.every((request) => request.headers.get('Authorization') === `Bearer ${FAKE_NEW_TOKEN}`)).toBe(true)
  })

  it('montre l’erreur du serveur sous le mot de passe actuel', async () => {
    setup('SPEAKER', {
      'POST /api/me/password': () =>
        jsonResponse(400, { code: 'VALIDATION_ERROR', message: 'Requête invalide', fieldErrors: [{ field: 'currentPassword', message: 'Mot de passe actuel incorrect.' }] }),
    })
    const { user } = renderApp('/intervenant/profil', { token: true })

    await user.type(await screen.findByLabelText(/^Mot de passe actuel/), FAKE_PASSWORD)
    await user.type(screen.getByLabelText(/^Nouveau mot de passe/), FAKE_NEW_PASSWORD)
    await user.type(screen.getByLabelText(/^Confirmer le nouveau mot de passe/), FAKE_NEW_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Changer le mot de passe' }))
    expect(await screen.findByText('Mot de passe actuel incorrect.')).toBeInTheDocument()
  })
})

describe('Mon profil : accès', () => {
  it('propose « Mon profil » dans la barre latérale et dans le menu de l’avatar', async () => {
    setup('SCHOOL')
    const { user } = renderApp('/ecole/profil', { token: true })

    const [sidebar] = await screen.findAllByRole('complementary')
    expect(within(sidebar ?? document.body).getByRole('link', { name: 'Mon profil' })).toHaveAttribute('href', '/ecole/profil')
    await user.click(screen.getByRole('button', { name: /Menu du compte/ }))
    expect(screen.getAllByRole('link', { name: 'Mon profil' })).toHaveLength(2)
  })
})
