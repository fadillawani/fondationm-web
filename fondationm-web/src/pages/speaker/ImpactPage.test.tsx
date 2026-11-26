import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { feedbackJson } from '../../test/feedbackFixtures'
import { errorResponse, meetingJson, pagedHandler, renderApp } from '../../test/helpers'
import { freezeNow, setupSpeaker } from '../../test/speakerFixtures'

beforeEach(freezeNow)
afterEach(() => {
  vi.useRealTimers()
})

let next = 0
function completed(overrides: Record<string, unknown>) {
  next += 1
  return meetingJson({ id: `d1210000-0000-4000-8000-${String(next).padStart(12, '0')}`, status: 'COMPLETED', myDecision: 'VALIDATED', ...overrides })
}

function slot(startAt: string, endAt: string) {
  return { id: `slot-${startAt}`, startAt, endAt }
}

const PIKINE = completed({
  school: { name: 'Lycée de Pikine', city: 'Pikine', country: 'Sénégal' },
  schoolClass: { title: 'Terminale S2', studentCount: 34 },
  slot: slot('2026-10-20T10:00:00+01:00', '2026-10-20T11:30:00+01:00'),
})
const YOFF = completed({
  school: { name: 'CEM de Yoff', city: 'Dakar', country: 'Sénégal' },
  schoolClass: { title: '3e A', studentCount: 38 },
  slot: slot('2026-09-18T10:00:00+01:00', '2026-09-18T11:00:00+01:00'),
})
const OVERDUE = meetingJson({
  id: 'd1210000-0000-4000-8000-0000000000ff',
  status: 'CONFIRMED',
  myDecision: 'VALIDATED',
  slot: slot('2026-11-20T10:00:00+01:00', '2026-11-20T11:00:00+01:00'),
})

const WRITTEN = [
  feedbackJson(PIKINE.id, { comment: '[Émotions] Fierté, Joie\n\n[Moment marquant] Une élève veut devenir ingénieure.', status: 'PUBLISHED', rating: 5 }),
  feedbackJson(YOFF.id, { comment: '[Émotions] Trac, Fierté\n\n[Moment marquant] Ma toute première rencontre.', status: 'SUBMITTED', rating: 3 }),
]

function setup({ meetings = [PIKINE, YOFF, OVERDUE], written = WRITTEN, extra = {} }: { meetings?: Record<string, unknown>[]; written?: unknown[]; extra?: Parameters<typeof setupSpeaker>[1] } = {}) {
  return setupSpeaker(
    { slots: [], meetings: meetings as never[] },
    {
      'GET /api/speaker/feedbacks': pagedHandler(() => written),
      'GET /api/speaker/feedbacks/awaiting': pagedHandler(() => []),
      ...extra,
    },
  )
}

async function figures() {
  return within(await screen.findByRole('region', { name: 'Mes chiffres' }))
}

describe('Mon impact de l’intervenant (W2-impact)', () => {
  it('calcule les chiffres depuis la première rencontre réalisée, sans compter la rencontre à confirmer', async () => {
    setup()
    renderApp('/intervenant/impact', { token: true })

    expect(await screen.findByRole('heading', { level: 1, name: 'Mon impact' })).toBeInTheDocument()
    const box = await figures()
    expect(await box.findByText('72')).toBeInTheDocument()
    expect(box.getByText('élèves rencontrés')).toBeInTheDocument()
    expect(box.getByText('Effectif déclaré des classes, pas un comptage des présents.')).toBeInTheDocument()
    expect(box.getByText('2')).toBeInTheDocument()
    expect(box.getByText('rencontres réalisées')).toBeInTheDocument()
    expect(box.getByText('dans 2 établissements')).toBeInTheDocument()
    expect(box.getByText('2 h 30')).toBeInTheDocument()
    expect(box.getByText('1 h 15 en moyenne')).toBeInTheDocument()
    expect(box.getByText('1 rencontre passée en attente de confirmation par la Fondation M, pas encore comptée.')).toBeInTheDocument()
    expect(screen.getAllByText('Depuis septembre 2026').length).toBeGreaterThan(0)
    expect(screen.queryByText(/thèmes|filles|Le mot du/)).not.toBeInTheDocument()

    const emotions = within(await screen.findByRole('list', { name: 'Émotions de vos retours' }))
    expect(emotions.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Fierté · 2', 'Joie · 1', 'Trac · 1'])
    expect(screen.getByText("D'après 2 retours sur 2 rencontres réalisées.")).toBeInTheDocument()

    // « Mes retours d'expérience » (F9) reste en bas de la page.
    expect(within(screen.getByRole('region', { name: 'Mes retours d\'expérience' })).getByText('Lycée de Pikine')).toBeInTheDocument()
  })

  it('affiche les valeurs vides sans rencontre réalisée ni émotion', async () => {
    setup({ meetings: [], written: [] })
    renderApp('/intervenant/impact', { token: true })

    const box = await figures()
    expect(await box.findByText('Vos chiffres apparaîtront après votre première rencontre réalisée.')).toBeInTheDocument()
    expect(box.getAllByText('0')).toHaveLength(2)
    expect(box.getByText('0 h')).toBeInTheDocument()
    expect(box.getByText('—')).toBeInTheDocument()
    expect(await screen.findByText('Aucune émotion notée dans vos retours pour l\'instant.')).toBeInTheDocument()
    expect(screen.queryByText(/^Depuis /)).not.toBeInTheDocument()
  })

  it('isole l’erreur des rencontres et celle des retours, chacune avec « Réessayer »', async () => {
    let failures = 1
    const { calls } = setup({
      extra: {
        'GET /api/speaker/meetings': (request) => (failures-- > 0 ? errorResponse(500, 'SERVER_ERROR') : pagedHandler(() => [PIKINE, YOFF, OVERDUE])(request)),
      },
    })
    const { user } = renderApp('/intervenant/impact', { token: true })

    const box = await figures()
    const retry = await box.findByRole('button', { name: 'Réessayer' })
    expect(await screen.findByRole('list', { name: 'Émotions de vos retours' })).toBeInTheDocument()
    await user.click(retry)
    expect(await box.findByText('72')).toBeInTheDocument()
    expect(calls('GET', '/api/speaker/meetings').length).toBeGreaterThanOrEqual(2)
  })

  it('montre l’erreur des retours sans casser les chiffres', async () => {
    setup({ extra: { 'GET /api/speaker/feedbacks': () => errorResponse(500, 'SERVER_ERROR') } })
    renderApp('/intervenant/impact', { token: true })

    expect(await (await figures()).findByText('72')).toBeInTheDocument()
    const feeling = within(screen.getByRole('region', { name: 'Ce que vous avez ressenti' }))
    expect(await feeling.findByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })

  it('signale des chiffres partiels au-delà de 25 pages', async () => {
    const many = Array.from({ length: 26 }, (_, index) =>
      completed({ school: { name: `École ${index}`, city: 'Dakar', country: 'Sénégal' }, slot: slot('2026-10-01T10:00:00+01:00', '2026-10-01T11:00:00+01:00') }),
    )
    setupSpeaker(
      { slots: [], meetings: many as never[] },
      { 'GET /api/speaker/feedbacks': pagedHandler(() => []), 'GET /api/speaker/feedbacks/awaiting': pagedHandler(() => []) },
      { maxSize: 1 },
    )
    renderApp('/intervenant/impact', { token: true })

    expect(await (await figures()).findByText('Chiffres partiels : toutes vos rencontres n\'ont pas pu être chargées.')).toBeInTheDocument()
  })
})
