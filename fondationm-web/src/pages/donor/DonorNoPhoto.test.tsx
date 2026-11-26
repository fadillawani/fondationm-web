import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { donorFeedbackJson, donorMe, donorRequestJson, setupDonor } from '../../test/donorFixtures'
import { SECURE_URL } from '../../test/fakeXhr'
import { makeMe, renderApp } from '../../test/helpers'
import { freezeNow } from '../../test/speakerFixtures'

beforeEach(freezeNow)
afterEach(() => {
  vi.useRealTimers()
})

/** Toutes les clés de photo qu'un serveur pourrait ajouter un jour aux réponses du donateur. */
const PHOTOS = { photoUrl: SECURE_URL, speakerPhotoUrl: SECURE_URL, schoolPhotoUrl: SECURE_URL, school: { photoUrl: SECURE_URL }, speaker: { photoUrl: SECURE_URL } }

const ME_WITH_PHOTO = makeMe({ ...donorMe, profile: { type: 'DONOR', name: 'Ousmane Diaw', photoUrl: SECURE_URL } })

describe('Jamais de photo côté donateur (F13, décision 130)', () => {
  it.each(['/donateur/impact', '/donateur/requetes', '/donateur/profil'])('%s n’affiche aucune image, même si photoUrl arrive', async (path) => {
    setupDonor({
      me: ME_WITH_PHOTO,
      feedbacks: [
        donorFeedbackJson({ id: 'a', rating: 5, comment: 'Une classe très attentive.', meetingStartAt: '2026-11-06T14:00:00+01:00', ...PHOTOS }),
        donorFeedbackJson({ id: 'b', authorRole: 'SCHOOL', rating: null, comment: 'Merci.', meetingStartAt: '2026-10-20T10:00:00+01:00', ...PHOTOS }),
      ],
      requests: [donorRequestJson({ id: 'r', subject: 'Bilan', createdAt: '2026-11-12T09:00:00+01:00', ...PHOTOS })],
    })
    renderApp(path, { token: true })
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    await screen.findAllByText('Ousmane Diaw')
    if (path === '/donateur/impact') await screen.findByText('Une classe très attentive.')
    if (path === '/donateur/requetes') await screen.findAllByText('Bilan')
    expect(document.querySelector('img')).toBeNull()
  })
})
