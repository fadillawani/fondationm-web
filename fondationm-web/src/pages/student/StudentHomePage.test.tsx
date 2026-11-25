import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { errorResponse, jsonResponse, makeMe, pagedHandler, renderApp } from '../../test/helpers'
import { freezeNow } from '../../test/speakerFixtures'
import { COMPLETED_RECENT, IN_FIVE_DAYS, OVERDUE, setupStudent, studentMeetingJson, studentWithoutClassMe } from '../../test/studentFixtures'

beforeEach(freezeNow)
afterEach(() => {
  vi.useRealTimers()
})

async function section(name: string) {
  return within(await screen.findByRole('region', { name }))
}

function detail() {
  return within(screen.getByRole('region', { name: 'Rencontre choisie' }))
}

describe('Espace élève (W5-E19)', () => {
  it('salue l’élève, range « À venir » et « Déjà vécues » et montre la rencontre la plus proche', async () => {
    setupStudent()
    const { router } = renderApp('/eleve', { token: true })

    expect(await screen.findByRole('heading', { level: 1, name: 'Salut Khadija !' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/eleve')
    expect((await screen.findAllByText('Demain, ta classe rencontre Awa Sarr, ingénieure data. Une belle occasion de découvrir son métier.')).length).toBeGreaterThan(0)

    const upcoming = (await section('À venir')).getAllByRole('button')
    expect(upcoming.map((row) => row.textContent)).toEqual([
      expect.stringContaining('Awa SarrIngénieure data · 10h00Demain'),
      expect.stringContaining('Moussa Diop9h00Dans 5 jours'),
      expect.stringContaining('Cheikh Sarr10h00Lun 14 déc'),
      expect.stringContaining('Aminata Ba10h00Il y a 4 jours'),
    ])
    expect((await section('Déjà vécues')).getAllByRole('button').map((row) => row.textContent)).toEqual([
      expect.stringContaining('Fatou NdiayeAvocateVécue avec ta classe'),
      expect.stringContaining('Mame Diarra SowVécue avec ta classe'),
    ])
    expect(screen.queryByText(/Fantôme/)).not.toBeInTheDocument()

    expect(upcoming[0]).toHaveAttribute('aria-pressed', 'true')
    expect(detail().getByText('Confirmée')).toBeInTheDocument()
    expect(detail().getByText('Demain · Mercredi 25 novembre')).toBeInTheDocument()
    expect(detail().getByText('10h00 – 11h30 · En classe · Salle 4')).toBeInTheDocument()
    expect(detail().getByText('Ingénieure data · Dakar, Sénégal')).toBeInTheDocument()
    expect(within(detail().getByRole('region', { name: 'Ses compétences' })).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Python', 'Statistiques'])
    expect(detail().getByRole('region', { name: 'Pour te préparer' })).toHaveTextContent('Note deux questions avant la rencontre.')
    expect(detail().getByText('Pas de contact direct avec l\'intervenant : tout passe par ton établissement et la Fondation M.')).toBeInTheDocument()
    expect(screen.queryByText(/Texte écrit pour la Fondation|Son parcours|Prête/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /retour d'expérience/i })).not.toBeInTheDocument()

    const aside = screen.getByRole('complementary', { name: 'Bon à savoir' })
    expect(aside).toHaveTextContent('Ici, tu consultes seulement.')
    expect(aside).toHaveTextContent('Si une rencontre est annulée, elle n\'apparaît plus ici.')
  })

  it('affiche la classe sans établissement, « Espace élève » et aucune navigation basse', async () => {
    setupStudent()
    renderApp('/eleve', { token: true })

    await screen.findByRole('heading', { level: 1, name: 'Salut Khadija !' })
    const navigations = screen.getAllByRole('navigation', { name: 'Navigation principale' })
    expect(navigations).toHaveLength(1)
    expect(within(navigations[0] ?? document.body).getByRole('link', { name: 'Les rencontres de ma classe' })).toHaveAttribute('href', '/eleve')
    const [sidebar] = screen.getAllByRole('complementary')
    if (sidebar === undefined) throw new Error('Barre latérale absente')
    expect(within(sidebar).getByText('Espace élève')).toBeInTheDocument()
    expect(within(sidebar).getByText('Khadija Ba')).toBeInTheDocument()
    expect(within(sidebar).getByText('Terminale S2')).toBeInTheDocument()
    expect(screen.queryByText(/Lycée|eleve\.fondationm\.sn/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Menu du compte/ })).toBeInTheDocument()
  })

  it('montre « En ligne » tel quel, sans lieu ni métier, et fixe la sélection dans l’URL', async () => {
    setupStudent()
    const { user, router } = renderApp('/eleve', { token: true })

    await user.click(await (await section('À venir')).findByRole('button', { name: /Moussa Diop/ }))
    expect(new URLSearchParams(router.state.location.search).get('rencontre')).toBe(IN_FIVE_DAYS.id)
    expect(detail().getByText('9h00 – 10h00 · En ligne')).toBeInTheDocument()
    expect(detail().getByText('Thiès, Sénégal')).toBeInTheDocument()
    expect(detail().queryByRole('region', { name: 'Ses compétences' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Aminata Ba/ }))
    expect(detail().getByText('Confirmée')).toBeInTheDocument()
    expect(detail().getByRole('region', { name: 'En attente de confirmation' })).toHaveTextContent(
      'Cette rencontre était prévue le vendredi 20 novembre. La Fondation M doit encore confirmer qu’elle a bien eu lieu.',
    )

    await user.click(screen.getByRole('button', { name: /Fatou Ndiaye/ }))
    expect(detail().getByText('Réalisée')).toBeInTheDocument()
    expect(detail().getByText('Jeudi 22 octobre')).toBeInTheDocument()
    expect(detail().getByRole('region', { name: 'Ce que tu as vécu' })).toHaveTextContent('Ta classe a rencontré Fatou Ndiaye.')
  })

  it('ouvre la rencontre de l’URL ; un identifiant inconnu donne la future la plus proche, sinon la plus récente', async () => {
    setupStudent()
    const { router } = renderApp(`/eleve?rencontre=${COMPLETED_RECENT.id}`, { token: true })
    expect(await screen.findByText('Jeudi 22 octobre')).toBeInTheDocument()

    await router.navigate('/eleve?rencontre=inconnue')
    expect(await screen.findByText('Demain · Mercredi 25 novembre')).toBeInTheDocument()
  })

  it('sans rencontre future, choisit la plus récente', async () => {
    setupStudent({ meetings: [OVERDUE, COMPLETED_RECENT] })
    renderApp('/eleve?rencontre=inconnue', { token: true })

    expect(await screen.findByText('Il y a 4 jours · Vendredi 20 novembre')).toBeInTheDocument()
    expect(screen.getAllByText('Pas de nouvelle rencontre prévue pour l’instant. Retrouve ici celles que ta classe a déjà vécues.').length).toBeGreaterThan(0)
  })

  it('affiche « Aujourd’hui » pour une rencontre du jour', async () => {
    setupStudent({ meetings: [studentMeetingJson({ id: 'auj', startAt: '2026-11-24T14:00:00+01:00', endAt: '2026-11-24T15:00:00+01:00' })] })
    renderApp('/eleve', { token: true })

    expect(await screen.findByText('Aujourd’hui · Mardi 24 novembre')).toBeInTheDocument()
    expect(screen.getAllByText('Aujourd’hui, ta classe rencontre Awa Sarr, ingénieure data. Une belle occasion de découvrir son métier.').length).toBeGreaterThan(0)
  })

  it('sans rencontre : message d’attente ; sans classe : message dédié', async () => {
    setupStudent({ meetings: [] })
    renderApp('/eleve', { token: true })
    expect(await screen.findByText('Les prochaines rencontres apparaîtront ici dès qu’elles seront confirmées.')).toBeInTheDocument()
    expect(screen.getAllByText('Les rencontres de ta classe apparaîtront ici dès qu’elles seront confirmées.').length).toBeGreaterThan(0)
    expect(screen.queryByRole('region', { name: 'Rencontre choisie' })).not.toBeInTheDocument()
  })

  it('élève sans classe : message dédié si la liste est vide, rencontres affichées sinon', async () => {
    setupStudent({ me: studentWithoutClassMe, meetings: [] })
    renderApp('/eleve', { token: true })
    expect((await screen.findAllByText('Ton compte n’est rattaché à aucune classe pour l’instant. Parles-en à ton référent orientation.')).length).toBeGreaterThan(0)
  })

  it('élève sans classe dont la liste n’est pas vide : les rencontres s’affichent', async () => {
    setupStudent({ me: studentWithoutClassMe, meetings: [COMPLETED_RECENT] })
    renderApp('/eleve', { token: true })
    expect(await screen.findByText('Jeudi 22 octobre')).toBeInTheDocument()
    expect(screen.queryByText(/aucune classe/)).not.toBeInTheDocument()
    const [sidebar] = screen.getAllByRole('complementary')
    expect(within(sidebar ?? document.body).getByText('Élève')).toBeInTheDocument()
  })

  it('affiche l’erreur avec « Réessayer », puis la liste', async () => {
    let failures = 1
    const { calls } = setupStudent({
      extra: {
        'GET /api/student/meetings': (request) => (failures-- > 0 ? errorResponse(500, 'SERVER_ERROR') : pagedHandler(() => [COMPLETED_RECENT])(request)),
      },
    })
    const { user } = renderApp('/eleve', { token: true })

    await user.click(await screen.findByRole('button', { name: 'Réessayer' }))
    expect(await screen.findByText('Jeudi 22 octobre')).toBeInTheDocument()
    expect(calls('/api/student/meetings')).toHaveLength(2)
  })

  it('demande toutes les pages sans filtre de statut', async () => {
    const { calls } = setupStudent()
    renderApp('/eleve', { token: true })
    await screen.findByRole('heading', { level: 1, name: 'Salut Khadija !' })
    expect(calls('/api/student/meetings').map(([request]) => Object.fromEntries(new URL(request.url).searchParams))).toEqual([{ page: '0', size: '100' }])
  })
})

describe('Espace élève : gardes', () => {
  it('renvoie un élève qui ouvre une page d’école vers /eleve', async () => {
    setupStudent()
    const first = renderApp('/ecole/rencontres', { token: true })
    await vi.waitFor(() => expect(first.router.state.location.pathname).toBe('/eleve'))
  })

  it('ne laisse pas une école entrer dans l’espace élève', async () => {
    setupStudent({ me: makeMe() })
    const { router } = renderApp('/eleve', { token: true })
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/ecole/intervenants'))
  })

  it('envoie un élève au mot de passe obligatoire quand le serveur l’impose', async () => {
    setupStudent({ extra: { 'GET /api/me': () => jsonResponse(200, { ...makeMe({ role: 'STUDENT' }), mustChangePassword: true }) } })
    const { router } = renderApp('/eleve', { token: true })
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/mot-de-passe-obligatoire'))
  })
})
