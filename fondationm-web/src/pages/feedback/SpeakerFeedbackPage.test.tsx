import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { feedbackBackend, feedbackJson } from '../../test/feedbackFixtures'
import { meetingJson, renderApp } from '../../test/helpers'
import { COMPLETED_MEETING, defaultData, freezeNow, setupSpeaker } from '../../test/speakerFixtures'

beforeEach(freezeNow)
afterEach(() => {
  vi.useRealTimers()
})

const FORM = `/intervenant/retours/${COMPLETED_MEETING.id}`

const PIKINE = meetingJson({
  id: 'd0000000-0000-4000-8000-000000000020',
  status: 'COMPLETED',
  myDecision: 'VALIDATED',
  school: { name: 'Lycée de Pikine', city: 'Pikine', country: 'Sénégal' },
  schoolClass: { title: 'Terminale S2', studentCount: 34 },
  slot: { id: 'c0000000-0000-4000-8000-000000000020', startAt: '2026-10-20T10:00:00+01:00', endAt: '2026-10-20T11:30:00+01:00' },
})

const PIKINE_STORY = [
  '[Les élèves étaient] Curieux',
  '[Émotions] Fierté, Nostalgie',
  '[Moment marquant] Une élève veut devenir ingénieure.',
  '[Un échange] On a parlé des bourses.',
].join('\n\n')

function setup() {
  const backend = feedbackBackend(
    'speaker',
    {
      awaiting: [
        {
          meetingId: COMPLETED_MEETING.id,
          slot: { startAt: '2026-11-10T09:00:00+01:00', endAt: '2026-11-10T10:00:00+01:00' },
          school: { name: 'Centre de formation Saint-Louis', city: 'Saint-Louis', country: 'Sénégal' },
          schoolClass: { title: 'Terminale S2', studentCount: 32 },
          completedAt: '2026-11-10T10:00:00+01:00',
        },
      ],
      written: [
        feedbackJson(PIKINE.id, {
          meeting: { id: PIKINE.id, slotStartAt: '2026-10-20T10:00:00+01:00', slotEndAt: '2026-10-20T11:30:00+01:00' },
          rating: 5,
          comment: PIKINE_STORY,
          status: 'PUBLISHED',
        }),
      ],
    },
    [COMPLETED_MEETING.id, PIKINE.id],
  )
  const data = defaultData()
  const speaker = setupSpeaker({ ...data, meetings: [...data.meetings, PIKINE] }, backend.handlers)
  return { ...speaker, ...backend }
}

describe('Retour d’expérience de l’intervenant (W2-E10)', () => {
  it('demande une note puis envoie {"rating":"4"} en chaîne, avec le commentaire', async () => {
    const { bodies } = setup()
    const { user } = renderApp(FORM, { token: true })

    expect(await screen.findByRole('heading', { level: 1, name: 'Qu\'avez-vous vécu avec les Terminale S2 de Saint-Louis ?' })).toBeInTheDocument()
    const rating = within(screen.getByRole('group', { name: 'Dans l\'ensemble, cette rencontre…' }))
    expect(rating.getAllByRole('radio')).toHaveLength(5)
    expect(rating.getAllByRole('radio').every((radio) => !(radio as HTMLInputElement).checked)).toBe(true)
    expect(screen.queryByLabelText(/^Élèves présents/)).not.toBeInTheDocument()
    expect(screen.getByText('Ce texte sera lu par les donateurs après validation de la Fondation. Évitez les noms et prénoms des élèves.')).toBeInTheDocument()
    expect(screen.queryByText(/Un mot pour la classe/)).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Le moment qui vous a le plus marqué'), 'Un élève s’est levé.')
    await user.click(screen.getByRole('button', { name: 'Partager mon retour' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Choisissez comment s’est passée la rencontre.')
    expect(bodies).toEqual([])

    await user.click(rating.getByRole('radio', { name: 'Très bien' }))
    await user.click(screen.getByRole('button', { name: 'Curieux' }))
    expect(screen.getByRole('button', { name: 'Curieux' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Partager mon retour' }))

    expect(await screen.findByText(/Merci ! Votre retour est partagé/)).toBeInTheDocument()
    expect(bodies).toHaveLength(1)
    expect(bodies[0]?.raw).toBe(
      JSON.stringify({ rating: '4', comment: '[Les élèves étaient] Curieux\n\n[Moment marquant] Un élève s’est levé.' }),
    )
    expect(JSON.parse(bodies[0]?.raw ?? '{}')).toMatchObject({ rating: '4' })
  })

  it('lit un retour validé en lecture seule, note affichée par son libellé', async () => {
    setup()
    renderApp(`/intervenant/retours/${PIKINE.id}`, { token: true })

    const content = within(await screen.findByRole('region', { name: 'Votre retour' }))
    expect(content.getByText('Inoubliable')).toBeInTheDocument()
    expect(content.getByText('Curieux')).toBeInTheDocument()
    expect(content.getByText('« Une élève veut devenir ingénieure. »')).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })
})

describe('Mon impact (W2-impact, section « Mes retours d’expérience »)', () => {
  it('liste les rencontres à raconter puis les récits, repliés par défaut', async () => {
    setup()
    const { user } = renderApp('/intervenant/impact', { token: true })

    expect(await screen.findByRole('heading', { level: 1, name: 'Mon impact' })).toBeInTheDocument()
    const section = within(await screen.findByRole('region', { name: 'Mes retours d\'expérience' }))
    expect(section.getByRole('link', { name: 'Raconter cette rencontre : Centre de formation Saint-Louis' })).toHaveAttribute('href', FORM)
    expect(section.getByText('Lycée de Pikine')).toBeInTheDocument()
    expect(section.getByText('« Une élève veut devenir ingénieure. »')).toBeInTheDocument()
    expect(section.queryByText('On a parlé des bourses.')).not.toBeInTheDocument()

    const toggle = section.getByRole('button', { name: 'Lire tout mon récit' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(section.getByRole('button', { name: 'Replier mon récit' })).toHaveAttribute('aria-expanded', 'true')
    expect(section.getByText('On a parlé des bourses.')).toBeInTheDocument()
  })
})
