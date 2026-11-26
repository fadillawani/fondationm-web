import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { donorFeedbackJson, impactJson, setupDonor } from '../../test/donorFixtures'
import { errorResponse, jsonResponse, renderApp } from '../../test/helpers'
import { freezeNow } from '../../test/speakerFixtures'

beforeEach(freezeNow)
afterEach(() => {
  vi.useRealTimers()
})

const F9_COMMENT = [
  '[Classe] 34 présents sur 36 · 17 filles · 17 garçons · âge moyen 17 ans',
  '[Émotions] Fierté, Gratitude',
  '[Moment marquant] Toute la classe debout autour de la table.',
  '[Un échange] Une question sur les bourses.',
].join('\n\n')

const FEEDBACKS = [
  donorFeedbackJson({ id: 'b', authorRole: 'SCHOOL', rating: null, comment: F9_COMMENT, meetingStartAt: '2026-10-20T10:00:00+01:00', schoolCity: 'Pikine' }),
  donorFeedbackJson({ id: 'a', rating: 4, comment: 'Je me suis revu à leur âge.', meetingStartAt: '2026-11-06T14:00:00+01:00', schoolCity: 'Thiaroye' }),
  donorFeedbackJson({ id: 'c', rating: 5, comment: '[Moment marquant] Une élève veut devenir ingénieure.', meetingStartAt: '2026-10-20T10:00:00+01:00', publishedAt: '2026-11-22T10:00:00+01:00', schoolCity: 'Pikine' }),
]

async function kpis() {
  return within(await screen.findByRole('region', { name: /^Indicateurs/ }))
}

function detail() {
  return within(screen.getByRole('region', { name: 'Retour choisi' }))
}

async function list() {
  return within(await screen.findByRole('list', { name: 'Retours validés' }))
}

describe('Rapport d’impact du donateur (W4-impact)', () => {
  it('mène /donateur vers /donateur/impact, salue le donateur et montre les indicateurs de la période', async () => {
    const { queries } = setupDonor({ feedbacks: FEEDBACKS })
    const { router } = renderApp('/donateur', { token: true })

    expect(await screen.findByRole('heading', { level: 1, name: 'Bonjour Ousmane Diaw' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/donateur/impact')
    expect(screen.getAllByText('Voici ce que votre soutien a fait naître dans les classes accompagnées par la Fondation M.').length).toBeGreaterThan(0)
    expect(await (await kpis()).findByText('1 240')).toBeInTheDocument()
    expect((await kpis()).getByText('ce trimestre')).toBeInTheDocument()
    expect((await kpis()).getByText('Effectif déclaré par les écoles, pas un comptage des présents.')).toBeInTheDocument()
    expect((await kpis()).getByText('dans 30 classes')).toBeInTheDocument()
    expect((await kpis()).getByText('4,6 / 5')).toBeInTheDocument()
    expect((await kpis()).getByText('moyenne des notes publiées')).toBeInTheDocument()
    // Note école absente (cas normal depuis F9) : seule la part intervenants est montrée.
    expect((await kpis()).getByText('intervenants 4,6')).toBeInTheDocument()
    expect((await kpis()).queryByText(/écoles \d/)).not.toBeInTheDocument()
    expect(screen.queryByText(/régions|secteurs/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Mécène depuis/)).not.toBeInTheDocument()
    expect(screen.queryByText(/par mois/)).not.toBeInTheDocument()
    expect(queries('/api/donor/impact')).toEqual([{ from: '2026-10-01T00:00:00+01:00', to: '2027-01-01T00:00:00+01:00' }])
    expect(queries('/api/donor/feedbacks')).toEqual([{ from: '2026-10-01T00:00:00+01:00', to: '2027-01-01T00:00:00+01:00', page: '0', size: '100' }])
  })

  it('compte une consultation par période vue : retour à une période déjà vue et filtres = 0 appel', async () => {
    const { consultations, calls } = setupDonor({ feedbacks: FEEDBACKS })
    const { user, router } = renderApp('/donateur/impact', { token: true })

    await (await kpis()).findByText('1 240')
    await (await list()).findAllByRole('button')
    expect(consultations()).toBe(2)

    const periods = within(screen.getByRole('tablist', { name: 'Période' }))
    await user.click(periods.getByRole('tab', { name: 'Cette année' }))
    expect(router.state.location.search).toBe('?periode=annee')
    await vi.waitFor(() => expect(consultations()).toBe(4))
    await (await kpis()).findByText('1 240')

    await user.click(periods.getByRole('tab', { name: 'Ce trimestre' }))
    await user.click(periods.getByRole('tab', { name: 'Cette année' }))
    await user.click(periods.getByRole('tab', { name: 'Ce trimestre' }))
    await user.click(await screen.findByRole('tab', { name: 'Écoles' }))
    await user.click(screen.getByRole('tab', { name: 'Intervenants' }))
    await user.click(screen.getByRole('tab', { name: /^Tous/ }))
    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))
    await (await kpis()).findByText('1 240')
    expect(consultations()).toBe(4)
    expect(calls('GET', '/api/donor/impact')).toHaveLength(2)
  })

  it('affiche « 0 », « — » et la phrase dédiée sur une période sans rencontre', async () => {
    setupDonor({
      impact: () =>
        jsonResponse(200, impactJson({ completedMeetings: 0, distinctClasses: 0, distinctSchools: 0, distinctSpeakers: 0, studentsReached: 0, publishedFeedbacksCount: 0, averageRating: { overall: null, school: null, speaker: null } })),
    })
    renderApp('/donateur/impact', { token: true })

    expect(await (await kpis()).findByText('Aucune rencontre réalisée sur cette période.')).toBeInTheDocument()
    expect((await kpis()).getAllByText('0')).toHaveLength(4)
    expect((await kpis()).getByText('—')).toBeInTheDocument()
    expect((await kpis()).queryByText(/intervenants \d/)).not.toBeInTheDocument()
    expect(await screen.findByText('Pas encore de retour validé sur cette période. Ils arrivent après chaque rencontre.')).toBeInTheDocument()
  })

  it('trie les retours par date de rencontre, filtre par auteur et relit un commentaire F9 ou du texte brut', async () => {
    setupDonor({ feedbacks: FEEDBACKS })
    const { user, router } = renderApp('/donateur/impact', { token: true })

    const items = await (await list()).findAllByRole('button')
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Thiaroye'),
      expect.stringContaining('« Une élève veut devenir ingénieure. »'),
      expect.stringContaining('« Toute la classe debout autour de la table. »'),
    ])
    expect(items[0]).toHaveTextContent('Avis de l’intervenant')
    expect(items[0]).toHaveTextContent('Ressenti : Très bien')

    // Texte brut en repli.
    expect(detail().getByText('Je me suis revu à leur âge.')).toBeInTheDocument()
    expect(detail().getByText(/^Validé par la Fondation M · le 20 novembre/)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Écoles' }))
    expect(router.state.location.search).toBe('?filtre=ecoles')
    expect((await list()).getAllByRole('button')).toHaveLength(1)
    await user.click((await list()).getByRole('button'))
    expect(new URLSearchParams(router.state.location.search).get('retour')).toBe('b')
    expect(detail().getByText('34').closest('div')).toHaveTextContent('présents')
    expect(detail().getByRole('region', { name: 'Le moment fort' })).toHaveTextContent('« Toute la classe debout autour de la table. »')
    expect(detail().getByRole('region', { name: 'Un échange marquant' })).toHaveTextContent('Une question sur les bourses.')
    expect(detail().getByRole('list', { name: 'Émotions' })).toHaveTextContent('FiertéGratitude')
    expect(detail().getByRole('link', { name: 'Écrire à la Fondation' })).toHaveAttribute(
      'href',
      `/donateur/requetes?vue=nouvelle&objet=${encodeURIComponent('Retour du 20 octobre à Pikine')}`,
    )
  })

  it('dit honnêtement ce que le donateur voit', async () => {
    setupDonor({ feedbacks: FEEDBACKS })
    renderApp('/donateur/impact', { token: true })

    const aside = await screen.findByRole('complementary', { name: 'Ce que vous voyez' })
    expect(aside).toHaveTextContent(
      'Uniquement des retours validés par la Fondation M. Les fiches n’indiquent que la ville et le pays de l’école ; les récits sont publiés tels que leurs auteurs les ont écrits.',
    )
    expect(screen.queryByText(/noms des élèves ne sont jamais/)).not.toBeInTheDocument()
  })

  it('garde le reste du rapport si les indicateurs échouent, et « Réessayer » relance ce seul bloc', async () => {
    let failures = 1
    const { calls } = setupDonor({
      feedbacks: FEEDBACKS,
      impact: () => (failures-- > 0 ? errorResponse(500, 'SERVER_ERROR') : jsonResponse(200, impactJson())),
    })
    const { user } = renderApp('/donateur/impact', { token: true })

    const retry = await (await kpis()).findByRole('button', { name: 'Réessayer' })
    expect(await (await list()).findAllByRole('button')).toHaveLength(3)
    await user.click(retry)
    expect(await (await kpis()).findByText('1 240')).toBeInTheDocument()
    expect(calls('GET', '/api/donor/impact')).toHaveLength(2)
    expect(calls('GET', '/api/donor/feedbacks')).toHaveLength(1)
  })
})
