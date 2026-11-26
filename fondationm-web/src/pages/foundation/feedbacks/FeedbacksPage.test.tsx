import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { foundationFeedbackJson } from '../../../test/feedbackFixtures'
import { jsonResponse, pagedHandler, renderApp } from '../../../test/helpers'
import { setupFoundationMeetings, type Handler } from '../../../test/foundationMeetingsFixtures'
import { freezeNow } from '../../../test/speakerFixtures'

beforeEach(freezeNow)
afterEach(() => {
  vi.useRealTimers()
})

const SOR = { meetingId: 'm-sor', startAt: '2026-11-04T14:00:00+01:00' }
const THIAROYE = {
  meetingId: 'm-thiaroye',
  startAt: '2026-11-02T14:00:00+01:00',
  school: { name: 'Lycée de Thiaroye', city: 'Thiaroye-sur-Mer', country: 'Sénégal' },
  schoolClass: { title: 'Terminale L1', studentCount: 34 },
  speaker: { fullName: 'Amadou Baila' },
}
const PIKINE = {
  meetingId: 'm-pikine',
  startAt: '2026-10-20T10:00:00+01:00',
  school: { name: 'Lycée de Pikine', city: 'Pikine', country: 'Sénégal' },
  speaker: { fullName: 'Amadou Baila' },
}

function initialFeedbacks() {
  return [
    foundationFeedbackJson({
      id: 'sor-ecole',
      ...SOR,
      comment: ['[Classe] 35 présents sur 38 · 19 filles · 16 garçons · âge moyen 17 ans', '[Émotions] Fierté, Espoir', '[Moment marquant] Toute la classe s’est tue.', '[Un échange] Une question sur l’atelier.'].join('\n\n'),
    }),
    foundationFeedbackJson({
      id: 'sor-intervenant',
      ...SOR,
      authorRole: 'SPEAKER',
      rating: 4,
      comment: ['[Les élèves étaient] Curieux, Timides', '[Moment marquant] Elle veut faire comme moi.'].join('\n\n'),
    }),
    foundationFeedbackJson({ id: 'thiaroye-ecole', ...THIAROYE, comment: 'Des élèves de série L ont découvert le numérique.' }),
    foundationFeedbackJson({ id: 'pikine-ecole', ...PIKINE, status: 'PUBLISHED', publishedAt: '2026-10-25T10:00:00+01:00', comment: '[Moment marquant] La fibre optique.' }),
    foundationFeedbackJson({ id: 'pikine-intervenant', ...PIKINE, authorRole: 'SPEAKER', rating: 5, status: 'PUBLISHED', comment: 'Je me suis revu à leur âge.' }),
  ]
}

function setup() {
  const store: (Record<string, unknown> & { id: string })[] = initialFeedbacks()
  const published: string[] = []
  const extra: Record<string, Handler> = {
    'GET /api/foundation/feedbacks': pagedHandler(() => store),
  }
  for (const feedback of store) {
    extra[`POST /api/foundation/feedbacks/${feedback.id}/publish`] = () => {
      const index = store.findIndex((entry) => entry.id === feedback.id)
      const updated = { ...feedback, ...store[index], id: feedback.id, status: 'PUBLISHED', publishedAt: '2026-11-24T08:00:00+01:00' }
      store[index] = updated
      published.push(feedback.id)
      return jsonResponse(200, updated)
    }
  }
  return { ...setupFoundationMeetings({ extra }), store, published }
}

function detail() {
  return within(screen.getByRole('region', { name: 'Retours de la rencontre' }))
}

function card(name: 'Retour de l’école' | 'Retour de l’intervenant') {
  return within(screen.getByRole('region', { name }))
}

describe('Retours d’expérience (Fondation, W3-retours)', () => {
  it('compte les retours à valider dans l’onglet et la navigation, et range les rencontres', async () => {
    setup()
    const { user, router } = renderApp('/fondation/retours', { token: true })

    const tabs = within(await screen.findByRole('tablist', { name: 'Retours par état' }))
    expect(await tabs.findByRole('tab', { name: 'À valider · 3' })).toHaveAttribute('aria-selected', 'true')
    const [sidebar] = screen.getAllByRole('navigation', { name: 'Navigation principale' })
    if (sidebar === undefined) throw new Error('Navigation absente')
    expect(await within(sidebar).findByRole('link', { name: "Retours d'expérience 3 en attente" })).toHaveAttribute('href', '/fondation/retours')

    const list = within(screen.getByRole('list', { name: 'Rencontres' }))
    expect(list.getAllByRole('button').map((button) => button.textContent)).toEqual([
      expect.stringContaining('Lycée de Sor × Aïssatou Diop'),
      expect.stringContaining('Lycée de Thiaroye × Amadou Baila'),
    ])
    expect(list.getByRole('button', { name: /Thiaroye/ })).toHaveTextContent('École · SoumisIntervenant · À rédiger')

    tabs.getByRole('tab', { name: 'À valider · 3' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(router.state.location.search).toBe('?onglet=valides')
    expect(within(screen.getByRole('list', { name: 'Rencontres' })).getAllByRole('button')).toHaveLength(1)
    expect(detail().getByRole('heading', { name: 'Lycée de Pikine × Amadou Baila' })).toBeInTheDocument()
  })

  it('montre les deux retours relus par le parseur : chiffres, note par son libellé, pastilles, récits, texte brut', async () => {
    setup()
    const { user } = renderApp('/fondation/retours', { token: true })

    expect(await screen.findByRole('heading', { name: 'Lycée de Sor × Aïssatou Diop' })).toBeInTheDocument()
    const school = card('Retour de l’école')
    expect(school.getByText('35').closest('div')).toHaveTextContent('présents')
    expect(school.getByText('17 ans').closest('div')).toHaveTextContent('âge moyen')
    expect(school.getByRole('list', { name: 'Émotions' })).toHaveTextContent('FiertéEspoir')
    expect(school.getByRole('region', { name: 'Le moment marquant' })).toHaveTextContent('« Toute la classe s’est tue. »')
    expect(school.getByRole('region', { name: 'Un échange qui a touché' })).toHaveTextContent('Une question sur l’atelier.')
    const speaker = card('Retour de l’intervenant')
    expect(speaker.getByText('Très bien')).toBeInTheDocument()
    expect(speaker.getByText('Timides')).toBeInTheDocument()
    expect(screen.queryByText('Envoyer un rappel bienveillant')).not.toBeInTheDocument()

    await user.click(within(screen.getByRole('list', { name: 'Rencontres' })).getByRole('button', { name: /Thiaroye/ }))
    expect(card('Retour de l’école').getByText('Des élèves de série L ont découvert le numérique.')).toBeInTheDocument()
    expect(card('Retour de l’intervenant').getByText("Ce retour n'a pas encore été écrit.")).toBeInTheDocument()
  })

  it('demande confirmation avant de publier (focus sur « Annuler »), puis publie et garde la rencontre dans l’URL', async () => {
    const { published } = setup()
    const { user, router } = renderApp('/fondation/retours', { token: true })

    await screen.findByRole('heading', { name: 'Lycée de Sor × Aïssatou Diop' })
    expect(router.state.location.search).toBe('')
    await user.click(card('Retour de l’école').getByRole('button', { name: 'Valider et partager aux donateursValider et partager' }))
    const dialog = await screen.findByRole('dialog', { name: 'Publier ce retour ?' })
    expect(dialog).toHaveTextContent('Il sera visible des donateurs et ne pourra plus être retiré.')
    expect(within(dialog).getByRole('button', { name: 'Annuler' })).toHaveFocus()

    await user.click(within(dialog).getByRole('button', { name: 'Annuler' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(published).toEqual([])

    await user.click(card('Retour de l’école').getByRole('button', { name: /Valider et partager/ }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Publier ce retour ?' })).getByRole('button', { name: 'Publier' }))

    expect(await card('Retour de l’école').findByText('Validé ! Ce retour apparaît maintenant dans le rapport d’impact des donateurs.')).toBeInTheDocument()
    expect(published).toEqual(['sor-ecole'])
    expect(router.state.location.search).toBe('?rencontre=m-sor')
    expect(await screen.findByRole('tab', { name: 'À valider · 2' })).toBeInTheDocument()

    // Dernier retour de la rencontre publié : elle quitte « À valider » mais reste affichée (sélection dans l'URL).
    await user.click(card('Retour de l’intervenant').getByRole('button', { name: /Valider et partager/ }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Publier ce retour ?' })).getByRole('button', { name: 'Publier' }))
    expect(await card('Retour de l’intervenant').findByText(/Validé ! Ce retour apparaît maintenant/)).toBeInTheDocument()
    expect(await screen.findByRole('tab', { name: 'À valider · 1' })).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Rencontres' })).queryByRole('button', { name: /Sor/ })).not.toBeInTheDocument()
    expect(detail().getByRole('heading', { name: 'Lycée de Sor × Aïssatou Diop' })).toBeInTheDocument()
    expect(card('Retour de l’école').queryByRole('button', { name: /Valider et partager/ })).not.toBeInTheDocument()
  })

  it('ouvre une rencontre depuis l’URL et choisit la partie affichée sur mobile', async () => {
    setup()
    const { user, router } = renderApp('/fondation/retours?onglet=tous&rencontre=m-pikine', { token: true })

    expect(await screen.findByRole('heading', { name: 'Lycée de Pikine × Amadou Baila' })).toBeInTheDocument()
    expect(card('Retour de l’école').getByText('Visible dans le rapport d’impact des donateurs.')).toBeInTheDocument()
    const parts = within(screen.getByRole('tablist', { name: 'Retour affiché' }))
    parts.getByRole('tab', { name: 'Retour de l’école' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(new URLSearchParams(router.state.location.search).get('partie')).toBe('intervenant')
    expect(parts.getByRole('tab', { name: 'Retour de l’intervenant' })).toHaveAttribute('aria-selected', 'true')
  })
})
