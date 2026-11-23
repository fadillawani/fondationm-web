import { describe, expect, it } from 'vitest'
import { tokenStorage } from './tokenStorage'

describe('tokenStorage', () => {
  it('renvoie null sans jeton', () => {
    expect(tokenStorage.get()).toBeNull()
  })

  it('enregistre le jeton dans sessionStorage uniquement', () => {
    tokenStorage.set('jeton-factice')

    expect(tokenStorage.get()).toBe('jeton-factice')
    expect(sessionStorage.length).toBe(1)
    expect(localStorage.length).toBe(0)
  })

  it('efface le jeton', () => {
    tokenStorage.set('jeton-factice')
    tokenStorage.clear()

    expect(tokenStorage.get()).toBeNull()
  })
})
