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

    const steps = within(screen.getByRole('list', { name: 'Avancement de votre demande' })).getAllByRole('listitem')
    expect(steps).toHaveLength(4)
    expect(steps[0]).toHaveTextContent(/Demande envoyée\s*Terminé\s*20 novembre 2026/)
    expect(steps[1]).toHaveTextContent(/Vérification\s*En cours\s*En cours par la Fondation M/)
    expect(steps[2]).toHaveTextContent(/Compte validé\s*À venir/)
    expect(steps[3]).toHaveTextContent(/Première rencontre\s*À venir/)

    const summary = screen.getByRole('region', { name: 'Votre demande' })
    expect(summary).toHaveTextContent('Lycée des Tisserands · Lycée')
    expect(summary).toHaveTextContent('Dakar, Sénégal')
    expect(summary).toHaveTextContent('Proviseure')
    expect(summary).toHaveTextContent('referent@ecole.test · +221 77 000 00 00')
    expect(screen.getByRole('region', { name: 'En attendant' })).toBeInTheDocument()
    expect(screen.queryByText(/e-mail vous|nous vous écrirons/i)).not.toBeInTheDocument()
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

    expect(await screen.findByRole('heading', { name: 'Bonjour Lycée des Tisserands !' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/ecole')
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

    expect(await screen.findByRole('heading', { name: 'Bonjour Lycée des Tisserands !' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/ecole')
  })
})
