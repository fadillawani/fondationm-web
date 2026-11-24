import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockApi, renderApp, speakerMe } from '../../test/helpers'
import { AWA, refusedMeeting, setupSchool } from '../../test/schoolFixtures'
import { freezeNow } from '../../test/speakerFixtures'

beforeEach(freezeNow)
afterEach(() => {
  vi.useRealTimers()
})

async function sidebar() {
  const [first] = await screen.findAllByRole('navigation', { name: 'Navigation principale' })
  if (first === undefined) throw new Error('Barre latérale absente')
  return within(first)
}

function section(name: RegExp) {
  return within(screen.getByRole('region', { name }))
}

function cardNames(scope: ReturnType<typeof within>) {
  return scope.getAllByRole('article').map((card: HTMLElement) => within(card).getByRole('heading').textContent)
}

describe('Espace établissement — navigation', () => {
  it('redirige /ecole vers /ecole/intervenants', async () => {
    setupSchool()
    const { router } = renderApp('/ecole', { token: true })

    expect(await screen.findByRole('heading', { name: 'Intervenants disponibles', level: 1 })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/ecole/intervenants')
  })

  it('affiche les entrées, les entrées « Bientôt » et la carte de l’établissement', async () => {
    setupSchool()
    renderApp('/ecole/intervenants', { token: true })

    const nav = await sidebar()
    expect(nav.getByRole('link', { name: 'Intervenants' })).toHaveAttribute('href', '/ecole/intervenants')
    for (const label of ['Mes rencontres', "Retours d'expérience", 'Mon établissement']) {
      expect(nav.queryByRole('link', { name: new RegExp(label) })).not.toBeInTheDocument()
      expect(nav.getByText(label).closest('li')).toHaveTextContent('Bientôt')
    }
    expect(screen.getByText('Espace établissement')).toBeInTheDocument()
    expect(screen.getByText('Établissement · Dakar')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Plus' })).not.toBeInTheDocument()
  })

  it('refuse l’accès à un utilisateur d’un autre rôle', async () => {
    mockApi({
      'GET /api/me': () => jsonResponse(200, speakerMe),
      'GET /api/speaker/slots': () => jsonResponse(200, { content: [], totalPages: 0 }),
      'GET /api/speaker/meetings': () => jsonResponse(200, { content: [], totalPages: 0 }),
    })
    const { router } = renderApp('/ecole/intervenants', { token: true })

    expect(await screen.findByRole('heading', { name: 'Mon agenda' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/intervenant/agenda')
  })
})

describe('Intervenants disponibles', () => {
  it('affiche ma zone d’abord puis les autres zones disponibles en ligne', async () => {
    const { queries } = setupSchool()
    renderApp('/ecole/intervenants', { token: true })

    expect(await screen.findByRole('heading', { name: 'À Dakar · 2 intervenants' })).toBeInTheDocument()
    expect(cardNames(section(/^À Dakar/))).toEqual(['Awa Diallo', 'Fatou Sarr'])
    expect(await screen.findByRole('heading', { name: 'Autres zones · disponibles en ligne' })).toBeInTheDocument()
    await waitFor(() => expect(cardNames(section(/^Autres zones/))).toEqual(['Moussa Ndiaye']))
    expect(section(/^Autres zones/).getByText('Finance · Thiès')).toBeInTheDocument()

    expect(queries('/api/school/speakers')).toEqual(
      expect.arrayContaining([
        { city: 'Dakar', country: 'Sénégal', page: '0', size: '100' },
        { format: 'ONLINE', page: '0', size: '100' },
      ]),
    )
  })

  it('affiche une carte d’intervenant complète', async () => {
    setupSchool()
    renderApp('/ecole/intervenants', { token: true })

    const card = within(await screen.findByRole('article', { name: 'Awa Diallo' }))
    expect(card.getByText('Numérique')).toBeInTheDocument()
    expect(card.getByText('Ingénieure réseaux')).toBeInTheDocument()
    expect(within(card.getByRole('list', { name: 'Compétences' })).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Réseaux',
      'Cybersécurité',
      'Fibre optique',
    ])
    expect(card.getByText('Prochain créneau · Lun 30 nov · 9h30')).toBeInTheDocument()
    expect(card.getByText('3 créneaux libres')).toBeInTheDocument()
    expect(card.getByRole('link', { name: 'Demander une rencontre à Awa Diallo' })).toHaveAttribute(
      'href',
      `/ecole/intervenants/${AWA.id}/demande`,
    )
    expect(within(screen.getByRole('article', { name: 'Fatou Sarr' })).getByText('Aucun créneau libre pour l’instant')).toBeInTheDocument()
  })

  it('envoie les filtres au serveur et les garde dans l’URL', async () => {
    const { queries } = setupSchool()
    const { router, user } = renderApp('/ecole/intervenants', { token: true })
    await screen.findByRole('heading', { name: 'À Dakar · 2 intervenants' })

    await user.click(within(screen.getByRole('group', { name: 'Secteur' })).getByRole('button', { name: 'Santé' }))
    expect(await screen.findByRole('heading', { name: 'À Dakar · 1 intervenant' })).toBeInTheDocument()
    expect(router.state.location.search).toBe('?secteur=HEALTH')
    expect(queries('/api/school/speakers')).toContainEqual({ city: 'Dakar', country: 'Sénégal', sector: 'HEALTH', page: '0', size: '100' })
    expect(within(screen.getByRole('group', { name: 'Secteur' })).getByRole('button', { name: 'Santé' })).toHaveAttribute('aria-pressed', 'true')

    // « En classe » : la section « Autres zones · disponibles en ligne » disparaît.
    await user.selectOptions(screen.getByRole('combobox', { name: 'Format' }), 'IN_PERSON')
    expect(router.state.location.search).toBe('?secteur=HEALTH&format=IN_PERSON')
    expect(screen.queryByRole('heading', { name: 'Autres zones · disponibles en ligne' })).not.toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Zone' }), 'toutes')
    await user.click(within(screen.getByRole('group', { name: 'Secteur' })).getByRole('button', { name: 'Tous' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Format' }), 'TOUS')
    expect(await screen.findByRole('heading', { name: 'Toutes les zones · 4 intervenants' })).toBeInTheDocument()

    await user.type(screen.getByRole('searchbox', { name: 'Rechercher un intervenant' }), 'comptable{Enter}')
    expect(await screen.findByRole('heading', { name: 'Toutes les zones · 1 intervenant' })).toBeInTheDocument()
    expect(router.state.location.search).toBe('?zone=toutes&q=comptable')
    expect(queries('/api/school/speakers')).toContainEqual({ q: 'comptable', page: '0', size: '100' })
  })

  it('choisit une ville dans la liste de zones', async () => {
    setupSchool()
    const { user } = renderApp('/ecole/intervenants?zone=Thi%C3%A8s', { token: true })

    expect(await screen.findByRole('heading', { name: 'À Thiès · 1 intervenant' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Zone' })).toHaveValue('Thiès')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Zone' }), 'ma-zone')
    expect(await screen.findByRole('heading', { name: 'À Dakar · 2 intervenants' })).toBeInTheDocument()
  })

  it('affiche la carte du réseau, le panneau de la ville et les pastilles', async () => {
    setupSchool()
    const { user } = renderApp('/ecole/intervenants', { token: true })

    const map = await screen.findByRole('img', { name: /^Carte schématique du Sénégal/ })
    expect(map).toHaveAccessibleName(
      'Carte schématique du Sénégal. Saint-Louis : 3 bénévoles, Dakar : 12 bénévoles, Thiès : 4 bénévoles, Kaolack : 1 bénévole.',
    )
    expect(screen.getByText('21 bénévoles au Sénégal')).toBeInTheDocument()
    expect(screen.getByText("Carte schématique. La taille du cercle indique le nombre d'intervenants dans la ville.")).toBeInTheDocument()

    const cities = within(screen.getByRole('group', { name: 'Choisir une ville' }))
    expect(cities.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Dakar · 12', 'Thiès · 4', 'Saint-Louis · 3', 'Kaolack · 1', 'Mbour · 1',
    ])
    expect(cities.getByRole('button', { name: 'Dakar · 12' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Votre zone')).toBeInTheDocument()
    expect(screen.getByText('12 bénévoles prêts à rencontrer vos élèves')).toBeInTheDocument()
    expect(await screen.findByRole('list', { name: 'Intervenants à Dakar' })).toHaveTextContent('Awa Diallo')

    await user.click(cities.getByRole('button', { name: 'Thiès · 4' }))
    expect(cities.getByRole('button', { name: 'Thiès · 4' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Autre zone · en ligne possible')).toBeInTheDocument()
    expect(await screen.findByRole('list', { name: 'Intervenants à Thiès' })).toHaveTextContent('Moussa Ndiaye')
  })

  it('signale la demande refusée récemment par un intervenant', async () => {
    setupSchool({
      refused: [
        refusedMeeting(),
        refusedMeeting({ id: 'b1000000-0000-4000-8000-000000000002', refusedAt: '2026-11-01T10:00:00+01:00', speaker: { fullName: 'Ancien Refus' } }),
        refusedMeeting({ id: 'b1000000-0000-4000-8000-000000000003', closedBy: 'FOUNDATION', speaker: { fullName: 'Refus Fondation' } }),
      ],
    })
    renderApp('/ecole/intervenants', { token: true })

    const text = await screen.findByText(/a été refusée par l'intervenant/)
    expect(text).toHaveTextContent(
      "Votre demande à Moussa Ndiaye (Terminale S2, jeudi 26 novembre) a été refusée par l'intervenant. Choisissez un autre intervenant pour cette classe.",
    )
    expect(screen.getByText('Moussa Ndiaye a refusé votre demande pour la Terminale S2.')).toBeInTheDocument()
    expect(screen.getByText('Voir la demande')).toHaveTextContent('Bientôt')
    expect(screen.queryByText(/Ancien Refus|Refus Fondation/)).not.toBeInTheDocument()
  })

  it('n’affiche pas de bandeau sans refus récent par un intervenant', async () => {
    setupSchool({ refused: [refusedMeeting({ refusedAt: '2026-11-01T10:00:00+01:00' })] })
    renderApp('/ecole/intervenants', { token: true })

    await screen.findByRole('heading', { name: 'À Dakar · 2 intervenants' })
    expect(screen.queryByText(/a été refusée par l'intervenant/)).not.toBeInTheDocument()
  })

  it('ne relance aucune requête sans jeton après la déconnexion', async () => {
    const { fetchMock } = setupSchool()
    const { user } = renderApp('/ecole/intervenants', { token: true })
    await screen.findByRole('heading', { name: 'À Dakar · 2 intervenants' })

    await user.click(screen.getByRole('button', { name: 'Se déconnecter' }))

    expect(await screen.findByRole('heading', { name: 'Bon retour parmi nous' })).toBeInTheDocument()
    expect(screen.queryByText(/Session expirée/)).not.toBeInTheDocument()
    const anonymous = fetchMock.mock.calls.filter(([request]) => !request.headers.has('Authorization'))
    expect(anonymous).toHaveLength(0)
  })
})
