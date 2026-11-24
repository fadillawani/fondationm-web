import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockApi, renderApp, speakerMe } from '../../test/helpers'
import { AWA, refusedMeeting, setupSchool, speakerJson } from '../../test/schoolFixtures'
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
    expect(nav.getByRole('link', { name: /^Mes rencontres/ })).toHaveAttribute('href', '/ecole/rencontres')
    expect(nav.getByRole('link', { name: 'Mon établissement' })).toHaveAttribute('href', '/ecole/etablissement')
    expect(nav.queryByRole('link', { name: /Retours d'expérience/ })).not.toBeInTheDocument()
    expect(nav.getByText("Retours d'expérience").closest('li')).toHaveTextContent('Bientôt')
    const [aside] = screen.getAllByRole('complementary')
    if (aside === undefined) throw new Error('Barre latérale absente')
    expect(within(aside).getByText('Espace établissement')).toBeInTheDocument()
    expect(within(aside).getByText('Lycée des Tisserands')).toBeInTheDocument()
    expect(within(aside).getByText('Dakar')).toBeInTheDocument()

    // Navigation basse (maquette) : 4 entrées aux libellés courts, sans « Déconnexion ».
    const [, bottom] = screen.getAllByRole('navigation', { name: 'Navigation principale' })
    if (bottom === undefined) throw new Error('Navigation basse absente')
    expect(within(bottom).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Intervenants',
      'Rencontres',
      'RetoursBientôt',
      'Établissement',
    ])
    expect(within(bottom).queryByRole('button')).not.toBeInTheDocument()
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
    expect(card.getByText('Prochain créneau')).toBeInTheDocument()
    expect(card.getByText('Lun 30 nov · 9h30')).toBeInTheDocument()
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
    renderApp('/ecole/intervenants', { token: true })

    // Groupe étiqueté (libellé de la maquette : villes par nombre décroissant), qui ne masque pas ses contrôles.
    const map = await screen.findByRole('group', { name: /^Carte du Sénégal/ })
    expect(map).toHaveAccessibleName('Carte du Sénégal : 12 intervenants à Dakar, 4 à Thiès, 3 à Saint-Louis, 1 à Kaolack')
    expect(screen.getByText('21 bénévoles au Sénégal')).toBeInTheDocument()
    expect(screen.getByText("Carte schématique. La taille du cercle indique le nombre d'intervenants dans la ville.")).toBeInTheDocument()

    const cities = within(screen.getByRole('group', { name: 'Choisir une ville' }))
    expect(cities.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Dakar · 12', 'Thiès · 4', 'Saint-Louis · 3', 'Kaolack · 1', 'Mbour · 1',
    ])
    expect(cities.getByRole('button', { name: 'Dakar · 12' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Votre zone')).toBeInTheDocument()
    // Le panneau compte les intervenants réellement listés pour la ville.
    expect(await screen.findByText('2 bénévoles prêts à rencontrer vos élèves')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Intervenants à Dakar' })).toHaveTextContent('Awa Diallo')
  })

  it('fait de chaque ville de la carte un bouton, du nord au sud, villes à 0 comprises', async () => {
    setupSchool()
    renderApp('/ecole/intervenants', { token: true })

    const map = within(await screen.findByRole('group', { name: /^Carte du Sénégal/ }))
    expect(map.getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual([
      'Saint-Louis, 3 intervenants',
      'Louga, 0 intervenant',
      'Thiès, 4 intervenants',
      'Touba, 0 intervenant',
      'Dakar, 12 intervenants, votre ville',
      'Kaolack, 1 intervenant',
      'Tambacounda, 0 intervenant',
      'Ziguinchor, 0 intervenant',
    ])
    const dakar = map.getByRole('button', { name: 'Dakar, 12 intervenants, votre ville' })
    expect(dakar).toHaveAttribute('aria-pressed', 'true')
    expect(dakar).toHaveAttribute('tabindex', '0')
    expect(map.getByRole('button', { name: 'Louga, 0 intervenant' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('synchronise la carte, l’URL, le select, les pastilles, le panneau et les listes', async () => {
    setupSchool()
    const { router, user } = renderApp('/ecole/intervenants', { token: true })
    const map = within(await screen.findByRole('group', { name: /^Carte du Sénégal/ }))

    await user.click(map.getByRole('button', { name: 'Thiès, 4 intervenants' }))
    expect(router.state.location.search).toBe('?zone=Thi%C3%A8s')
    expect(await screen.findByRole('heading', { name: 'À Thiès · 1 intervenant' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Zone' })).toHaveValue('Thiès')
    expect(map.getByRole('button', { name: 'Thiès, 4 intervenants' })).toHaveAttribute('aria-pressed', 'true')
    expect(map.getByRole('button', { name: 'Dakar, 12 intervenants, votre ville' })).toHaveAttribute('aria-pressed', 'false')
    const cities = within(screen.getByRole('group', { name: 'Choisir une ville' }))
    expect(cities.getByRole('button', { name: 'Thiès · 4' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Autre zone · en ligne possible')).toBeInTheDocument()
    expect(await screen.findByRole('list', { name: 'Intervenants à Thiès' })).toHaveTextContent('Moussa Ndiaye')
    // Bouton-filtre de zone (mobile) mis à jour par le même état.
    expect(screen.getByRole('button', { name: 'Thiès' })).toBeInTheDocument()

    // Re-cliquer la ville choisie revient à « ma zone ».
    await user.click(map.getByRole('button', { name: 'Thiès, 4 intervenants' }))
    expect(router.state.location.search).toBe('')
    expect(await screen.findByRole('heading', { name: 'À Dakar · 2 intervenants' })).toBeInTheDocument()
    // Re-cliquer la ville de l'école en « ma zone » ne change rien.
    await user.click(map.getByRole('button', { name: 'Dakar, 12 intervenants, votre ville' }))
    expect(router.state.location.search).toBe('')

    // Une pastille fait la même chose que la carte.
    await user.click(cities.getByRole('button', { name: 'Saint-Louis · 3' }))
    expect(await screen.findByRole('heading', { name: 'À Saint-Louis · 1 intervenant' })).toBeInTheDocument()
    expect(map.getByRole('button', { name: 'Saint-Louis, 3 intervenants' })).toHaveAttribute('aria-pressed', 'true')

    // Le select met la carte à jour.
    await user.selectOptions(screen.getByRole('combobox', { name: 'Zone' }), 'toutes')
    expect(await screen.findByRole('heading', { name: 'Toutes les zones · 4 intervenants' })).toBeInTheDocument()
    expect(map.queryAllByRole('button', { pressed: true })).toHaveLength(0)
    expect(screen.getByText('Choisissez une ville sur la carte ou ci-dessous.')).toBeInTheDocument()
  })

  it('choisit une ville au clavier (Entrée, Espace), y compris une ville à 0', async () => {
    setupSchool()
    const { router, user } = renderApp('/ecole/intervenants', { token: true })
    const map = within(await screen.findByRole('group', { name: /^Carte du Sénégal/ }))

    map.getByRole('button', { name: 'Saint-Louis, 3 intervenants' }).focus()
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('heading', { name: 'À Saint-Louis · 1 intervenant' })).toBeInTheDocument()

    await user.tab()
    expect(map.getByRole('button', { name: 'Louga, 0 intervenant' })).toHaveFocus()
    await user.keyboard(' ')
    expect(router.state.location.search).toBe('?zone=Louga')
    expect(await screen.findByRole('heading', { name: 'À Louga · 0 intervenant' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Zone' })).toHaveValue('Louga')
    expect(screen.getByText('Aucun bénévole pour ces critères.')).toBeInTheDocument()
  })

  it('compte les villes de la carte sous les filtres, à partir de l’annuaire filtré', async () => {
    const { queries } = setupSchool()
    renderApp('/ecole/intervenants?secteur=FINANCE', { token: true })

    const map = within(await screen.findByRole('group', { name: /^Carte du Sénégal/ }))
    expect(await map.findByRole('button', { name: 'Thiès, 1 intervenant' })).toBeInTheDocument()
    expect(map.getByRole('button', { name: 'Dakar, 0 intervenant, votre ville' })).toBeInTheDocument()
    expect(map.getByRole('button', { name: 'Saint-Louis, 0 intervenant' })).toBeInTheDocument()
    expect(screen.getAllByText('1 intervenant correspond à vos critères').length).toBeGreaterThan(0)
    expect(screen.queryByText(/bénévoles au Sénégal/)).not.toBeInTheDocument()
    const cities = within(screen.getByRole('group', { name: 'Choisir une ville' }))
    expect(cities.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Thiès · 1', 'Dakar · 0', 'Saint-Louis · 0', 'Kaolack · 0', 'Mbour · 0',
    ])
    // Requête sans ville, avec les filtres.
    expect(queries('/api/school/speakers')).toContainEqual({ sector: 'FINANCE', page: '0', size: '100' })
  })

  it('mène de « et {n} autres personnes » à la liste de la ville, focus compris', async () => {
    const dakar = Array.from({ length: 6 }, (_, index) =>
      speakerJson({ id: `e0000000-0000-4000-8000-00000000010${index}`, fullName: `Personne ${index + 1}` }),
    )
    setupSchool({ speakers: dakar })
    const { user } = renderApp('/ecole/intervenants', { token: true })

    const link = await screen.findByRole('link', { name: 'et 2 autres personnes' })
    expect(link).toHaveAttribute('href', '#liste-ville')
    expect(within(screen.getByRole('list', { name: 'Intervenants à Dakar' })).getAllByRole('listitem')).toHaveLength(4)
    await user.click(link)
    expect(screen.getByRole('heading', { name: 'À Dakar · 6 intervenants' })).toHaveFocus()
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

    const status = (await screen.findByText(/Choisissez un autre intervenant pour cette classe/)).closest('[role="status"]')
    expect(status).toHaveTextContent(
      "Votre demande à Moussa Ndiaye (Terminale S2, 26 nov) a été refusée par l'intervenant. Choisissez un autre intervenant pour cette classe.",
    )
    expect(status).toHaveTextContent('Moussa Ndiaye a refusé votre demande pour la Terminale S2.')
    expect(screen.getByRole('link', { name: 'Voir la demande' })).toHaveAttribute(
      'href',
      '/ecole/rencontres?rencontre=b1000000-0000-4000-8000-000000000001&mois=2026-11',
    )
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
