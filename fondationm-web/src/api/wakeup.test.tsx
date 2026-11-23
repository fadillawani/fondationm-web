import { act, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fillLoginForm, hangingResponse, mockApi, renderApp } from '../test/helpers'

const WAKEUP_TEXT = /Le serveur se réveille, cela peut prendre une à deux minutes/

describe('Réveil du serveur', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('prévient après 5 s puis abandonne à 90 s avec un bouton Réessayer', async () => {
    mockApi({ 'POST /api/auth/login': hangingResponse })
    const { user } = renderApp('/connexion', { advanceTimers: vi.advanceTimersByTime })

    await fillLoginForm(user)
    expect(screen.queryByText(WAKEUP_TEXT)).not.toBeInTheDocument()

    await act(() => vi.advanceTimersByTimeAsync(5_000))
    expect(screen.getByText(WAKEUP_TEXT)).toBeInTheDocument()

    await act(() => vi.advanceTimersByTimeAsync(85_000))
    expect(await screen.findByRole('alert')).toHaveTextContent('Le serveur met trop de temps à répondre.')
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
    expect(screen.queryByText(WAKEUP_TEXT)).not.toBeInTheDocument()
  })
})
