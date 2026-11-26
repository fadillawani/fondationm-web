import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { feedbackBackend, feedbackJson, type FeedbackStore } from '../../test/feedbackFixtures'
import { FAKE_TOKEN, renderApp } from '../../test/helpers'
import { ALL_MEETINGS, COMPLETED_PUBLISHED, COMPLETED_TO_WRITE, CONFIRMED } from '../../test/meetingsFixtures'
import { schoolFullMe, setupSchool } from '../../test/schoolFixtures'
import { freezeNow } from '../../test/speakerFixtures'

beforeEach(freezeNow)
afterEach(() => {
  vi.useRealTimers()
})

const FORM = `/ecole/retours/${COMPLETED_TO_WRITE.id}`

const PUBLISHED_COMMENT = ['[Classe] 28 présents sur 32 · 14 filles · 14 garçons', '[Émotions] Fierté, Joie', '[Moment marquant] Toute la classe debout autour de la table.'].join('\n\n')

function awaitingEntry() {
  return {
    meetingId: COMPLETED_TO_WRITE.id,
    slot: { startAt: COMPLETED_TO_WRITE.slot.startAt, endAt: COMPLETED_TO_WRITE.slot.endAt },
    schoolClass: { title: 'Terminale L2', studentCount: 30 },
    speaker: { id: 'e0000000-0000-4000-8000-000000000004', fullName: 'Aminata Ba', city: 'Saint-Louis', country: 'Sénégal', skills: [] },
    completedAt: COMPLETED_TO_WRITE.completedAt,
  }
}

function setup(initial: Partial<FeedbackStore> = {}) {
  const backend = feedbackBackend(
    'school',
    {
      awaiting: initial.awaiting ?? [awaitingEntry()],
      written: initial.written ?? [
        feedbackJson(COMPLETED_PUBLISHED.id, {
          meeting: { id: COMPLETED_PUBLISHED.id, slotStartAt: COMPLETED_PUBLISHED.slot.startAt, slotEndAt: COMPLETED_PUBLISHED.slot.endAt },
          status: 'PUBLISHED',
          comment: PUBLISHED_COMMENT,
          publishedAt: '2026-10-25T10:00:00+01:00',
        }),
      ],
    },
    [COMPLETED_TO_WRITE.id, COMPLETED_PUBLISHED.id],
  )
  const school = setupSchool({ refused: [...ALL_MEETINGS] }, backend.handlers)
  return { ...school, ...backend }
}

async function fillMinimum(user: ReturnType<typeof renderApp>['user']) {
  await user.type(await screen.findByLabelText(/^Élèves présents/), '25')
  await user.type(screen.getByLabelText('Filles'), '12')
  await user.type(screen.getByLabelText('Garçons'), '13')
  await user.click(screen.getByRole('button', { name: 'Fierté' }))
  await user.type(screen.getByLabelText('Le moment qui vous a le plus marqué'), 'La classe s’est tue.')
}

const EXPECTED_COMMENT = '[Classe] 25 présents sur 30 · 12 filles · 13 garçons · durée 1 h\n\n[Émotions] Fierté\n\n[Moment marquant] La classe s’est tue.'

describe('Retour d’expérience de l’école (W1-E6)', () => {
  it('présente la rencontre, les étapes, l’aide « vie privée » et les compteurs', async () => {
    setup()
    renderApp(FORM, { token: true })

    expect(await screen.findByRole('heading', { level: 1, name: 'Comment s\'est passée la rencontre avec Aminata ?' })).toBeInTheDocument()
    const steps = within(screen.getByRole('list', { name: 'Étapes du retour' }))
    expect(steps.getByText('À rédiger').closest('li')).toHaveAttribute('aria-current', 'step')
    const aside = within(screen.getByRole('complementary', { name: 'La rencontre' }))
    expect(aside.getByText('Terminale L2 · 30 élèves')).toBeInTheDocument()
    expect(aside.getByText('En classe · Salle 12')).toBeInTheDocument()
    expect(aside.getByText('Mer 4 nov · 14h00')).toBeInTheDocument()
    expect(aside.getByRole('link', { name: /Awa Diallo · 22 oct/ })).toHaveAttribute('href', `/ecole/retours/${COMPLETED_PUBLISHED.id}`)
    expect(screen.getByText('Ce texte sera lu par les donateurs après validation de la Fondation. Évitez les noms et prénoms des élèves.')).toBeInTheDocument()
    expect(screen.getAllByText('0 / 500')).toHaveLength(3)
    expect(screen.getByText('0 / 2000 caractères au total')).toBeInTheDocument()
    expect(screen.getByLabelText('Durée')).toHaveValue('60')
    // Champs retirés (décision 92) : aucun mot pour l'intervenant ni remarque privée.
    expect(screen.queryByText(/Un mot pour/)).not.toBeInTheDocument()
    expect(screen.queryByText(/remarque pour la Fondation/i)).not.toBeInTheDocument()
  })

  it('refuse l’envoi incomplet ou incohérent sans rien envoyer', async () => {
    const { bodies } = setup()
    const { user } = renderApp(FORM, { token: true })

    await user.click(await screen.findByRole('button', { name: 'Partager mon retour' }))
    const summary = await screen.findByRole('alert')
    expect(summary).toHaveTextContent('Indiquez le nombre d’élèves présents.')
    expect(summary).toHaveTextContent('Racontez au moins un moment : un seul récit suffit.')

    await user.type(screen.getByLabelText(/^Élèves présents/), '31')
    await user.type(screen.getByLabelText('Filles'), '10')
    expect(screen.getByRole('alert')).toHaveTextContent('La classe compte 30 élèves : les présents ne peuvent pas être plus nombreux.')
    expect(screen.getByRole('alert')).toHaveTextContent('Indiquez aussi le nombre de garçons.')
    expect(bodies).toEqual([])
  })

  it('partage le retour (POST sans note), puis passe à « Soumis » et permet la mise à jour', async () => {
    const { bodies } = setup()
    const { user } = renderApp(FORM, { token: true })

    await fillMinimum(user)
    expect(screen.getByText('12 filles et 13 garçons, soit 25 élèves sur les 30 de la classe.')).toBeInTheDocument()
    expect(screen.getByText(`${EXPECTED_COMMENT.length} / 2000 caractères au total`)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Partager mon retour' }))

    expect(await screen.findByText('Merci ! Votre retour est partagé avec la Fondation M. Vous pouvez encore le modifier tant qu’il n’est pas validé.')).toBeInTheDocument()
    expect(bodies).toEqual([{ method: 'POST', meetingId: COMPLETED_TO_WRITE.id, raw: JSON.stringify({ comment: EXPECTED_COMMENT }) }])
    expect(within(screen.getByRole('list', { name: 'Étapes du retour' })).getByText('Soumis').closest('li')).toHaveAttribute('aria-current', 'step')

    await user.type(screen.getByLabelText('Un échange qui vous a touché'), 'Une question.')
    await user.click(screen.getByRole('button', { name: 'Mettre à jour mon retour' }))
    expect(await screen.findByText('Votre retour est mis à jour.')).toBeInTheDocument()
    expect(bodies[1]).toMatchObject({ method: 'PATCH' })
    expect(JSON.parse(bodies[1]?.raw ?? '{}')).toEqual({ comment: `${EXPECTED_COMMENT}\n\n[Un échange] Une question.` })
  })

  it('bascule en PATCH, une seule fois, si le POST trouve un retour déjà créé', async () => {
    const { bodies, store } = setup()
    const { user } = renderApp(FORM, { token: true })

    await fillMinimum(user)
    // Retour créé entre-temps (autre onglet) : le POST répond 409.
    store.written.push(feedbackJson(COMPLETED_TO_WRITE.id, { comment: 'Version de l’autre onglet.' }))
    await user.click(screen.getByRole('button', { name: 'Partager mon retour' }))

    expect(await screen.findByText(/Merci ! Votre retour est partagé/)).toBeInTheDocument()
    expect(bodies.map((body) => body.method)).toEqual(['POST', 'PATCH'])
    expect(bodies[1]?.raw).toBe(bodies[0]?.raw)
    expect(store.written.find((feedback) => feedback.meeting.id === COMPLETED_TO_WRITE.id)?.comment).toBe(EXPECTED_COMMENT)
  })

  it('montre l’erreur du serveur si le retour en double est déjà publié', async () => {
    const { bodies, store } = setup()
    const { user } = renderApp(FORM, { token: true })

    await fillMinimum(user)
    store.written.push(feedbackJson(COMPLETED_TO_WRITE.id, { status: 'PUBLISHED' }))
    await user.click(screen.getByRole('button', { name: 'Partager mon retour' }))

    expect(await screen.findByText('Ce retour a déjà été validé par la Fondation M : il ne peut plus être modifié.')).toBeInTheDocument()
    expect(await screen.findByText('Retour validé')).toBeInTheDocument()
    expect(bodies.map((body) => body.method)).toEqual(['POST'])
  })

  it('affiche un retour validé en lecture seule, sans formulaire ni envoi', async () => {
    const { bodies } = setup()
    renderApp(`/ecole/retours/${COMPLETED_PUBLISHED.id}`, { token: true })

    expect(await screen.findByText('Retour validé')).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Étapes du retour' })).getByText('Validé').closest('li')).toHaveAttribute('aria-current', 'step')
    const content = within(screen.getByRole('region', { name: 'Votre retour' }))
    expect(content.getByText('« Toute la classe debout autour de la table. »')).toBeInTheDocument()
    expect(content.getByText('28').closest('div')).toHaveTextContent('présents')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Partager|Mettre à jour/ })).not.toBeInTheDocument()
    expect(bodies).toEqual([])
  })

  it('« Finir plus tard » garde un brouillon dans l’onglet (sans jeton) et le reprend', async () => {
    setup()
    const { user, router } = renderApp(FORM, { token: true })

    await user.type(await screen.findByLabelText(/^Élèves présents/), '25')
    await user.type(screen.getByLabelText('Le moment qui vous a le plus marqué'), 'Brouillon.')
    await user.click(screen.getByRole('button', { name: 'Finir plus tard' }))

    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/ecole/retours'))
    const key = `fondationm.retour.${schoolFullMe.id}.${COMPLETED_TO_WRITE.id}`
    const stored = sessionStorage.getItem(key) ?? ''
    expect(JSON.parse(stored)).toMatchObject({ present: '25', stories: { moment: 'Brouillon.' } })
    expect(stored).not.toContain(FAKE_TOKEN)
    expect(localStorage.length).toBe(0)

    await router.navigate(FORM)
    expect(await screen.findByText('Brouillon repris : il est gardé sur cet appareil, dans cet onglet.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Élèves présents/)).toHaveValue('25')
  })

  it('avertit avant de quitter un récit non enregistré', async () => {
    setup()
    const { user } = renderApp(FORM, { token: true })

    await user.type(await screen.findByLabelText('Le moment qui vous a le plus marqué'), 'Pas encore enregistré.')
    const [sidebar] = screen.getAllByRole('navigation', { name: 'Navigation principale' })
    if (sidebar === undefined) throw new Error('Navigation absente')
    await user.click(within(sidebar).getByRole('link', { name: /^Mes rencontres/ }))

    expect(await screen.findByRole('dialog', { name: 'Quitter sans partager ?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Rester sur la page' }))
    expect(screen.getByLabelText('Le moment qui vous a le plus marqué')).toHaveValue('Pas encore enregistré.')
  })

  it('n’ouvre pas de formulaire pour une rencontre pas encore réalisée ou inconnue', async () => {
    setup()
    const { router } = renderApp(`/ecole/retours/${CONFIRMED.id}`, { token: true })

    expect(await screen.findByRole('heading', { name: 'Pas encore de retour possible' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()

    await router.navigate('/ecole/retours/inconnue')
    expect(await screen.findByRole('heading', { name: 'Rencontre introuvable' })).toBeInTheDocument()
  })
})

describe('Liste des retours de l’école (sans maquette)', () => {
  it('range « À rédiger » d’abord, puis « Soumis » et « Validé »', async () => {
    setup({
      written: [
        feedbackJson(COMPLETED_PUBLISHED.id, { status: 'PUBLISHED' }),
        feedbackJson('c5000000-0000-4000-8000-000000000099', { status: 'SUBMITTED' }),
      ],
    })
    renderApp('/ecole/retours', { token: true })

    const sections = await screen.findAllByRole('region')
    expect(sections.map((section) => section.getAttribute('aria-label'))).toEqual(['À rédiger', 'Soumis', 'Validé'])
    expect(within(screen.getByRole('region', { name: 'À rédiger' })).getByRole('link', { name: 'Partager mon retour : Aminata Ba' })).toHaveAttribute('href', FORM)
    expect(within(screen.getByRole('region', { name: 'Validé' })).getByRole('link', { name: 'Lire mon retour : Awa Diallo' })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Soumis' })).getByText('Intervenant')).toBeInTheDocument()
  })
})
