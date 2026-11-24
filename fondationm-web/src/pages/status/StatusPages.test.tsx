import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { jsonResponse, makeMe, mockApi, renderApp } from '../../test/helpers'

const pendingSchool = makeMe({
  status: 'PENDING',
  createdAt: '2026-11-20T12:00:00Z',
  profile: {
    type: 'SCHOOL',
    schoolName: 'Lycée des Tisserands',
    schoolType: 'HIGH_SCHOOL',
    city: 'Dakar',
    country: 'Sénégal',
    referentRole: 'Proviseure',
    phone: '+221 77 000 00 00',
  },
})

describe('Page « Compte en attente »', () => {
  it('affiche la frise et le récapitulatif de la demande', async () => {
    mockApi({ 'GET /api/me': () => jsonResponse(200, pendingSchool) })
    renderApp('/compte-en-attente', { token: true })

    expect(
      await screen.findByRole('heading', { name: 'Merci Lycée des Tisserands, votre demande est bien arrivée' }),
    ).toBeInTheDocument()

    expect(screen.getByText('Compte en attente')).toBeInTheDocument()
    const steps = within(screen.getByRole('list', { name: 'Étapes de validation du compte' })).getAllByRole('listitem')
    expect(steps).toHaveLength(4)
    // createdAt 12:00 UTC, fuseau des tests UTC+1.
    expect(steps[0]).toHaveTextContent('Demande envoyéeTerminé · 20 nov, 13h00')
    expect(steps[1]).toHaveTextContent('VérificationEn cours par la Fondation M')
    expect(steps[1]).toHaveAttribute('aria-current', 'step')
    expect(steps[2]).toHaveTextContent('Compte validéÀ venir')
    expect(steps[3]).toHaveTextContent('Première rencontreÀ venir · choisissez un intervenant')

    const summary = screen.getByRole('region', { name: 'Votre demande' })
    expect(summary).toHaveTextContent('Lycée des Tisserands (lycée)')
    expect(summary).toHaveTextContent('Sénégal · Dakar')
    expect(summary).toHaveTextContent('Proviseure')
    expect(summary).toHaveTextContent('referent@ecole.test · +221 77 000 00 00')
    expect(screen.getByRole('region', { name: 'En attendant' })).toHaveTextContent('Demandez à vos élèves quels métiers les font rêver')
    // Aucune promesse d'e-mail (le backend n'en envoie pas).
    expect(screen.queryByText(/nous vous écrirons|e-mail de bienvenue|recevrez un e-mail/i)).not.toBeInTheDocument()
  })

  it('adapte les textes pour un intervenant (maquette W2-E7)', async () => {
    mockApi({
      'GET /api/me': () =>
        jsonResponse(
          200,
          makeMe({
            role: 'SPEAKER',
            status: 'PENDING',
            createdAt: '2026-11-13T10:52:00Z',
            profile: {
              type: 'SPEAKER',
              fullName: 'Awa Diallo',
              jobTitle: 'Ingénieure réseaux',
              organization: 'Sonatel',
              city: 'Dakar',
              country: 'Sénégal',
              skills: ['Réseaux', 'Fibre optique'],
            },
          }),
        ),
    })
    renderApp('/compte-en-attente', { token: true })

    expect(await screen.findByRole('heading', { name: 'Merci Awa, les jeunes vont avoir de la chance' })).toBeInTheDocument()
    expect(screen.getByText('Compte en attente de validation')).toBeInTheDocument()
    expect(screen.getByText('Awa Diallo · intervenant')).toBeInTheDocument()
    const steps = within(screen.getByRole('list', { name: 'Étapes de validation du compte' })).getAllByRole('listitem')
    expect(steps[0]).toHaveTextContent('Terminé · 13 nov, 11h52')
    expect(steps[3]).toHaveTextContent('Vos créneauxÀ venir · publiez vos disponibilités')
    const profile = screen.getByRole('region', { name: 'Votre profil' })
    expect(profile).toHaveTextContent('Awa Diallo, ingénieure réseaux')
    expect(profile).toHaveTextContent('Sonatel')
    expect(profile).toHaveTextContent('Sénégal · Dakar')
    expect(within(profile).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Réseaux', 'Fibre optique'])
    expect(screen.getByRole('region', { name: 'En attendant' })).toHaveTextContent('Repensez à vos 17 ans')
  })

  it('reste sur la page si le statut n’a pas changé', async () => {
    mockApi({ 'GET /api/me': () => jsonResponse(200, pendingSchool) })
    const { router, user } = renderApp('/compte-en-attente', { token: true })

    await user.click(await screen.findByRole('button', { name: 'Actualiser mon statut' }))

    expect(await screen.findByText(/toujours en cours de vérification/)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/compte-en-attente')
  })

  it('redirige vers l’accueil quand « Actualiser » renvoie VALIDATED', async () => {
    let me = pendingSchool
    mockApi({ 'GET /api/me': () => jsonResponse(200, me) })
    const { router, user } = renderApp('/compte-en-attente', { token: true })
    const refresh = await screen.findByRole('button', { name: 'Actualiser mon statut' })

    me = { ...pendingSchool, status: 'VALIDATED' }
    await user.click(refresh)

    expect(await screen.findByRole('heading', { name: 'Intervenants disponibles' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/ecole/intervenants')
  })

  it('est réservée aux comptes PENDING', async () => {
    mockApi({ 'GET /api/me': () => jsonResponse(200, makeMe({ status: 'REJECTED' })) })
    const { router } = renderApp('/compte-en-attente', { token: true })

    expect(await screen.findByRole('heading', { name: 'Votre demande n’a pas pu être acceptée' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/compte-refuse')
  })
})

describe('Page « Compte refusé »', () => {
  it('affiche le motif indiqué par la Fondation', async () => {
    mockApi({
      'GET /api/me': () =>
        jsonResponse(200, makeMe({ status: 'REJECTED', rejectionReason: 'Établissement hors zone du programme.' })),
    })
    renderApp('/compte-refuse', { token: true })

    const reason = await screen.findByRole('region', { name: 'Motif indiqué par la Fondation M' })
    expect(reason).toHaveTextContent('Établissement hors zone du programme.')
    expect(screen.getByRole('link', { name: 'contact@fondationm.sn' })).toHaveAttribute(
      'href',
      'mailto:contact@fondationm.sn',
    )
    expect(screen.getAllByRole('button', { name: 'Se déconnecter' }).length).toBeGreaterThan(0)
  })

  it('est réservée aux comptes REJECTED', async () => {
    mockApi({ 'GET /api/me': () => jsonResponse(200, makeMe()) })
    const { router } = renderApp('/compte-refuse', { token: true })

    expect(await screen.findByRole('heading', { name: 'Intervenants disponibles' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/ecole/intervenants')
  })
})
