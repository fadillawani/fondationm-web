import { describe, expect, it } from 'vitest'
import {
  ApiError,
  NetworkFailureError,
  RequestTimeoutError,
  errorFromException,
  errorFromResponse,
  errorMessage,
  isRetryable,
} from './errors'

function response(status: number, headers: Record<string, string> = {}): Response {
  return new Response(null, { status, headers })
}

describe('errorFromResponse', () => {
  it('reprend code, message et fieldErrors du corps', () => {
    const error = errorFromResponse(response(400), {
      code: 'VALIDATION_ERROR',
      message: 'Requête invalide',
      fieldErrors: [{ field: 'email', message: 'E-mail invalide' }, { field: 42 }],
    })

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(400)
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.message).toBe('Requête invalide')
    expect(error.fieldErrors).toEqual([{ field: 'email', message: 'E-mail invalide' }])
  })

  it.each([
    [400, 'VALIDATION_ERROR'],
    [401, 'UNAUTHENTICATED'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [429, 'RATE_LIMITED'],
    [503, 'SERVER_ERROR'],
    [418, 'UNKNOWN_ERROR'],
  ])('déduit le code du statut %i quand le corps est absent', (status, code) => {
    expect(errorFromResponse(response(status), undefined).code).toBe(code)
  })

  it('traite tout 429 comme RATE_LIMITED et lit Retry-After', () => {
    const error = errorFromResponse(response(429, { 'Retry-After': '30' }), { code: 'AUTRE' })

    expect(error.code).toBe('RATE_LIMITED')
    expect(error.retryAfterSeconds).toBe(30)
  })

  it('ignore un Retry-After qui n’est pas un nombre de secondes', () => {
    const error = errorFromResponse(response(429, { 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' }), null)

    expect(error.retryAfterSeconds).toBeNull()
  })
})

describe('errorFromException', () => {
  it('convertit un dépassement de délai en TIMEOUT', () => {
    expect(errorFromException(new RequestTimeoutError()).code).toBe('TIMEOUT')
  })

  it('convertit un échec de fetch (aucune réponse) en NETWORK_ERROR', () => {
    expect(errorFromException(new NetworkFailureError()).code).toBe('NETWORK_ERROR')
  })

  it('ne confond pas une exception interne avec une panne réseau', () => {
    const error = errorFromException(new TypeError("Cannot use 'in' operator to search for 'schoolName' in null"))
    expect(error.code).toBe('UNEXPECTED_ERROR')
    expect(errorMessage(error)).toBe("Une erreur inattendue s'est produite. Réessayez.")
  })

  it('laisse passer une ApiError telle quelle', () => {
    const error = new ApiError({ status: 404, code: 'NOT_FOUND', message: '' })
    expect(errorFromException(error)).toBe(error)
  })
})

describe('errorMessage', () => {
  it('donne un message en français pour les codes connus', () => {
    const error = errorFromResponse(response(401), { code: 'INVALID_CREDENTIALS', message: 'Bad credentials' })
    expect(errorMessage(error)).toBe('E-mail ou mot de passe incorrect.')
  })

  it('indique le délai d’attente quand Retry-After est présent', () => {
    const error = errorFromResponse(response(429, { 'Retry-After': '1' }), null)
    expect(errorMessage(error)).toBe('Trop de tentatives, réessayez dans 1 seconde.')
  })

  it('invite à patienter sans Retry-After', () => {
    expect(errorMessage(errorFromResponse(response(429), null))).toBe(
      'Trop de tentatives. Patientez un peu avant de réessayer.',
    )
  })

  it('reprend le message du serveur pour un code inconnu', () => {
    const error = errorFromResponse(response(409), { code: 'SLOT_TAKEN', message: 'Ce créneau est déjà pris.' })
    expect(error.code).toBe('SLOT_TAKEN')
    expect(errorMessage(error)).toBe('Ce créneau est déjà pris.')
  })

  it('reste lisible pour un code inconnu sans message', () => {
    expect(errorMessage(errorFromResponse(response(409), { code: 'SLOT_TAKEN' }))).toBe(
      'Une erreur inattendue est survenue (SLOT_TAKEN).',
    )
  })
})

describe('isRetryable', () => {
  it('propose de réessayer pour les pannes réseau, délais et erreurs serveur seulement', () => {
    expect(isRetryable(new NetworkFailureError())).toBe(true)
    expect(isRetryable(new RequestTimeoutError())).toBe(true)
    expect(isRetryable(errorFromResponse(response(502), null))).toBe(true)
    expect(isRetryable(errorFromResponse(response(401), { code: 'INVALID_CREDENTIALS' }))).toBe(false)
  })
})
